"use client";

import { useState } from "react";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { formatDayMonth, relativeDayLabel } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/format";

type Point = { date: string; predicted: number; lower: number | null; upper: number | null };

export type ForecastOption = {
  id: string;
  name: string;
  points: Point[];
  modelText: string;
  isRidge?: boolean;
  /** WAPE backtest (%); null jika belum bisa diuji. */
  errorPct: number | null;
  /** WAPE rata-rata 7 hari sebagai pembanding. */
  baselineErrorPct: number | null;
  /** Faktor menonjol yang dipelajari Ridge (sudah difilter & diurutkan). */
  factors: { label: string; effect: number; perMonth: boolean }[];
  /** Ridge melaporkan faktor (hasil sesudah D-33). */
  hasFactors?: boolean;
  dataDays: number;
  warnings: string[];
};

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), 0, 1)}`;

export function ForecastView({ options, today }: { options: ForecastOption[]; today: string }) {
  const [selected, setSelected] = useState(options[0].id);
  const current = options.find((o) => o.id === selected) ?? options[0];
  // Skala bar dari sekitar nilai terendah sampai tertinggi, supaya kisaran terlihat jelas.
  const highs = current.points.map((p) => p.upper ?? p.predicted);
  const lows = current.points.map((p) => p.lower ?? p.predicted);
  const max = Math.max(1, ...highs) * 1.05;
  const min = Math.max(0, Math.min(...(lows.length ? lows : [0])) * 0.85);
  const span = Math.max(max - min, 1);
  const pos = (v: number) => ((v - min) / span) * 100;
  const decimals = current.points.some((p) => p.predicted < 10) ? 1 : 0;

  return (
    <div className="space-y-5">
      <div
        role="radiogroup"
        aria-label="Pilih kategori"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {options.map((o) => {
          const active = o.id === selected;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(o.id)}
              className={cn(
                "min-h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold ring-1 transition-colors",
                active
                  ? "bg-linear-to-br from-brand-500 to-brand-700 text-white ring-transparent"
                  : "bg-white/60 text-ink-soft ring-line hover:bg-white/80",
              )}
            >
              {o.name}
            </button>
          );
        })}
      </div>

      <Panel aria-label={`Prediksi ${current.name}`} className="px-0 py-1 sm:px-0 sm:py-1">
        {current.points.length === 0 ? (
          <p className="px-4 py-4 text-[15px] text-ink-soft sm:px-5">
            Belum ada prediksi untuk hari ini dan seterusnya. Tekan Hitung ulang dari data terbaru.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {current.points.map((p) => (
              <li key={p.date} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <div className="w-24 shrink-0">
                  <p className="text-[16px] font-semibold">{relativeDayLabel(p.date, today)}</p>
                  <p className="text-[13px] text-ink-soft">{formatDayMonth(p.date)}</p>
                </div>
                <div className="relative h-2 flex-1 rounded-full bg-ink/[.06]" aria-hidden="true">
                  {p.lower !== null && p.upper !== null ? (
                    <span
                      className="absolute inset-y-0 rounded-full bg-brand-200"
                      style={{ left: `${pos(p.lower)}%`, right: `${100 - pos(p.upper)}%` }}
                    />
                  ) : null}
                  <span
                    className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow"
                    style={{ left: `${pos(p.predicted)}%` }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right">
                  <p className="text-[20px] font-bold tabular-nums">
                    {formatNumber(p.predicted, 0, decimals)}
                    <span className="ml-1 text-[13px] font-normal text-ink-soft">porsi</span>
                  </p>
                  {p.lower !== null && p.upper !== null ? (
                    <p className="text-[12px] text-ink-soft tabular-nums">
                      {formatNumber(p.lower, 0, decimals)}–{formatNumber(p.upper, 0, decimals)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel aria-labelledby="method-title">
        <PanelTitle id="method-title">Cara angka ini dihitung</PanelTitle>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
          Model utama: <strong>Ridge regression</strong> (machine learning). Untuk tiap kategori, model belajar dari
          riwayat penjualan seberapa besar pengaruh hari dalam minggu, awal bulan, penanda hari (gajian, libur, ramai),
          penjualan minggu lalu, dan tren. Tingkat kehati-hatiannya dipilih otomatis lewat uji ke 14 hari terakhir,
          lalu hasilnya dibandingkan dengan cara biasa (rata-rata 7 hari). Kalau data belum 28 hari, sementara memakai
          rata-rata 7 hari. Kisaran: saat diuji, kira-kira 8 dari 10 hari angka aslinya jatuh di rentang ini.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 rounded-row bg-white/55 p-3 sm:col-span-1">
            <dt className="text-[13px] text-ink-soft">Model yang dipakai</dt>
            <dd className="mt-1 text-[16px] font-bold leading-snug">{current.modelText}</dd>
          </div>
          <div className="rounded-row bg-white/55 p-3">
            <dt className="text-[13px] text-ink-soft">Error rata-rata (uji 14 hari)</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">
              {current.errorPct === null ? "Belum ada" : formatPercent(current.errorPct)}
            </dd>
            {current.isRidge && current.baselineErrorPct !== null ? (
              <dd className="mt-0.5 text-[12px] text-ink-soft tabular-nums">
                Cara biasa (rata-rata 7 hari): {formatPercent(current.baselineErrorPct)}
              </dd>
            ) : null}
          </div>
          <div className="rounded-row bg-white/55 p-3">
            <dt className="text-[13px] text-ink-soft">Data yang dipakai</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">
              {formatNumber(current.dataDays)}
              <span className="ml-1 text-[14px] font-medium text-ink-soft">hari</span>
            </dd>
          </div>
        </dl>
        {current.isRidge && current.hasFactors ? (
          <div className="mt-4">
            <h3 className="text-[15px] font-semibold">Faktor yang dipelajari</h3>
            {current.factors.length > 0 ? (
              <ul className="mt-2 divide-y divide-line/70 rounded-row bg-white/55">
                {current.factors.map((f) => (
                  <li key={f.label} className="flex items-center justify-between gap-3 px-3 py-2 text-[14px]">
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        f.effect > 0 ? "text-daun-600" : "text-sambal-700",
                      )}
                    >
                      {signed(f.effect)} porsi{f.perMonth ? "/bulan" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[14px] text-ink-soft">
                Belum ada faktor yang menonjol; prediksi terutama mengikuti pola penjualan minggu lalu.
              </p>
            )}
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              Perkiraan pengaruh menurut model, di luar pola penjualan minggu lalu. Hanya faktor yang cukup besar yang
              ditampilkan; makin banyak data asli, makin bisa dipercaya.
            </p>
          </div>
        ) : null}
        {current.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 text-[13px] font-medium text-kriuk-700">
            {current.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        ) : null}
        {current.id === "semua" ? (
          <p className="mt-3 text-[13px] text-ink-soft">
            Error dan kisaran ditampilkan per kategori; pilih kategori di atas.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
