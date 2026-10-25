import { formatDayMonth } from "@/lib/date";
import type { DashboardSnapshot } from "@/lib/dashboard";

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Catatan kesegaran prediksi: kapan dihitung, ada data baru, atau perhitungan terakhir gagal. */
export function ForecastNotice({ s }: { s: DashboardSnapshot }) {
  return (
    <div className="space-y-1 text-[13px]">
      {s.forecast ? (
        <p className="text-ink-soft">
          Prediksi dihitung {formatStamp(s.forecast.createdAt)} dari data s.d.{" "}
          {s.lastDataDate ? formatDayMonth(s.lastDataDate) : "—"}.
        </p>
      ) : null}
      {s.forecast?.stale ? (
        <p className="font-semibold text-kriuk-700">Ada rekap baru setelah prediksi dihitung. Tekan Hitung ulang.</p>
      ) : null}
      {s.lastFailed ? (
        <p role="alert" className="font-semibold text-sambal-700">
          Perhitungan terakhir gagal ({formatStamp(s.lastFailed.at)}): {s.lastFailed.error}
        </p>
      ) : null}
    </div>
  );
}
