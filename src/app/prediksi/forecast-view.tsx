"use client";

import { useState } from "react";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { formatDayMonth, relativeDayLabel } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SeriesForecast } from "@/lib/preview-forecast";

type Option = { id: string; name: string; forecast: SeriesForecast };

export function ForecastView({ options, today }: { options: Option[]; today: string }) {
  const [selected, setSelected] = useState(options[0].id);
  const current = options.find((o) => o.id === selected) ?? options[0];
  // Skala bar dari sekitar nilai terendah sampai tertinggi, supaya kisaran terlihat jelas.
  const highs = current.forecast.points.map((p) => p.upper ?? p.predicted);
  const lows = current.forecast.points.map((p) => p.lower ?? p.predicted);
  const max = Math.max(...highs) * 1.05;
  const min = Math.max(0, Math.min(...lows) * 0.85);
  const span = Math.max(max - min, 1);
  const pos = (v: number) => ((v - min) / span) * 100;

  return (
    <div className="space-y-5">
      <div
        role="radiogroup"
        aria-label="Pilih menu"
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
        <ul className="divide-y divide-line/70">
          {current.forecast.points.map((p) => {
            const predicted = Math.round(p.predicted);
            return (
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
                    {formatNumber(predicted)}
                    <span className="ml-1 text-[13px] font-normal text-ink-soft">porsi</span>
                  </p>
                  {p.lower !== null && p.upper !== null ? (
                    <p className="text-[12px] text-ink-soft tabular-nums">
                      {formatNumber(Math.round(p.lower))}–{formatNumber(Math.round(p.upper))}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel aria-labelledby="method-title">
        <PanelTitle id="method-title">Cara angka ini dihitung</PanelTitle>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
          Rata-rata penjualan di hari yang sama selama 4 minggu terakhir. Model machine learning
          menggantikan metode ini setelah data nyata terkumpul cukup.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-row bg-white/55 p-3">
            <dt className="text-[13px] text-ink-soft">Selisih rata-rata, 14 hari terakhir</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">
              {current.forecast.errorPct === null ? "Belum ada" : formatPercent(current.forecast.errorPct)}
            </dd>
          </div>
          <div className="rounded-row bg-white/55 p-3">
            <dt className="text-[13px] text-ink-soft">Data yang dipakai</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">
              {formatNumber(current.forecast.dataDays)}
              <span className="ml-1 text-[14px] font-medium text-ink-soft">hari</span>
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
