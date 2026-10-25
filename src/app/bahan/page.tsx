import { DatabaseDown } from "@/components/dataset/database-down";
import { DatasetBar } from "@/components/dataset/dataset-bar";
import { ForecastNotice } from "@/components/dataset/forecast-notice";
import { RecalculateButton } from "@/components/dataset/recalculate-button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { loadDashboardPage } from "@/lib/data/dashboard";
import { formatDayLong, formatDayMonth, relativeDayLabel, todayWIB } from "@/lib/date";
import { LIVE_MIN_DAYS } from "@/lib/dataset";
import { NeedsView } from "./needs-view";

// Membaca cookie mode data + database → selalu dirender saat dibuka (D-19, D-32).
export const dynamic = "force-dynamic";

export default async function BahanPage() {
  const today = todayWIB();
  const page = await loadDashboardPage(today);
  const header = <PageHeader title="Bahan" subtitle="Yang perlu dibeli berdasarkan prediksi" />;
  if (!page) {
    return (
      <>
        {header}
        <DatabaseDown what="Rekomendasi bahan" />
      </>
    );
  }
  const { choice, snapshot: s } = page;
  const hasNeeds = s.focusDate !== null && s.needs.focus.length > 0;

  return (
    <>
      {header}
      <DatasetBar dataset={choice.dataset} auto={choice.auto} liveDays={choice.liveDays} liveMinDays={LIVE_MIN_DAYS} />
      {hasNeeds ? (
        <div className="space-y-4">
          <NeedsView
            focus={s.needs.focus}
            week={s.needs.week}
            bufferPct={s.bufferPct}
            focusLabel={`${relativeDayLabel(s.focusDate!, today)}, ${formatDayLong(s.focusDate!)}`}
            focusShort={relativeDayLabel(s.focusDate!, today)}
            weekLabel={
              s.needs.weekRange
                ? `${formatDayMonth(s.needs.weekRange[0])}–${formatDayMonth(s.needs.weekRange[1])}`
                : "7 hari ke depan"
            }
            leftovers={s.leftovers.map((l) => ({ ...l, dateLabel: formatDayMonth(l.date) }))}
          />
          <ForecastNotice s={s} />
        </div>
      ) : (
        <Panel>
          <p className="text-[16px] font-semibold">
            {s.lastDataDate === null ? "Belum ada data penjualan" : "Rekomendasi belum bisa dihitung"}
          </p>
          <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
            {s.lastDataDate === null
              ? "Rekomendasi bahan muncul setelah ada rekap penjualan dan prediksi."
              : "Belum ada prediksi untuk hari ini dan seterusnya, atau resep kategori belum diisi. Hitung prediksi dari data terbaru."}
          </p>
          {s.lastDataDate !== null ? (
            <div className="mt-4 space-y-3">
              <RecalculateButton dataset={choice.dataset} returnTo="/bahan" label="Hitung prediksi" />
              <ForecastNotice s={s} />
            </div>
          ) : null}
        </Panel>
      )}
    </>
  );
}
