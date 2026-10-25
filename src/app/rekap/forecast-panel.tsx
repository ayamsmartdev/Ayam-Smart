"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatWeekday } from "@/lib/date";
import { formatNumber } from "@/lib/format";

/** Ringkasan forecast terakhir untuk halaman rekap (disusun di server, `page.tsx`). */
export type ForecastPanelData = {
  lastFailed: { at: string; error: string } | null;
  ok: {
    at: string;
    startDate: string;
    endDate: string;
    tomorrow: { date: string; total: number } | null;
  } | null;
};

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Status prediksi + tombol "Hitung ulang" (T-18). Prediksi dihitung otomatis setiap rekap disimpan;
 * tombol dipakai bila perhitungan gagal atau setelah data diubah di tempat lain.
 */
export function ForecastPanel({
  data,
  dirty,
  pending,
  onRecalculate,
}: {
  /** null = status tidak bisa dibaca (database bermasalah). */
  data: ForecastPanelData | null;
  dirty: boolean;
  pending: boolean;
  onRecalculate: () => void;
}) {
  return (
    <section aria-labelledby="forecast-heading">
      <h2 id="forecast-heading" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
        Prediksi
      </h2>
      <div className="glass space-y-2 rounded-panel px-4 py-3 text-[14px]">
        {data === null ? (
          <p className="text-ink-soft">Status prediksi tidak bisa dibaca sekarang.</p>
        ) : data.ok ? (
          <>
            <p>
              Dihitung {formatStamp(data.ok.at)} untuk {formatDayMonth(data.ok.startDate)}–
              {formatDayMonth(data.ok.endDate)}.
            </p>
            {data.ok.tomorrow ? (
              <p className="font-semibold">
                Besok ({formatWeekday(data.ok.tomorrow.date)}) diperkirakan ±{formatNumber(data.ok.tomorrow.total)}{" "}
                porsi semua kategori.
              </p>
            ) : (
              <p className="text-ink-soft">Prediksi untuk besok belum ada. Simpan rekap terbaru atau tekan Hitung ulang.</p>
            )}
          </>
        ) : (
          <p className="text-ink-soft">
            Prediksi belum pernah dihitung. Prediksi dihitung otomatis setiap rekap disimpan.
          </p>
        )}

        {data?.lastFailed ? (
          <p role="alert" className="font-semibold text-sambal-700">
            Perhitungan terakhir gagal ({formatStamp(data.lastFailed.at)}): {data.lastFailed.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className={cn("text-[13px]", dirty ? "font-semibold text-sambal-700" : "text-ink-soft")}>
            {dirty ? "Simpan rekap dulu agar prediksi memakai data terbaru." : "Memakai data yang sudah tersimpan."}
          </p>
          <Button variant="secondary" onClick={onRecalculate} disabled={pending || dirty} className="shrink-0">
            {pending ? "Menghitung…" : "Hitung ulang"}
          </Button>
        </div>
      </div>
    </section>
  );
}
