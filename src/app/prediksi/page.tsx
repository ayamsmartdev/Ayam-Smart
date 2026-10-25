import { DatabaseDown } from "@/components/dataset/database-down";
import { DatasetBar } from "@/components/dataset/dataset-bar";
import { ForecastNotice } from "@/components/dataset/forecast-notice";
import { RecalculateButton } from "@/components/dataset/recalculate-button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { factorLabel, modelLabel, notableFactors } from "@/lib/dashboard";
import { loadDashboardPage } from "@/lib/data/dashboard";
import { todayWIB } from "@/lib/date";
import { LIVE_MIN_DAYS } from "@/lib/dataset";
import { ForecastView, type ForecastOption } from "./forecast-view";

// Membaca cookie mode data + database → selalu dirender saat dibuka (D-19, D-32).
export const dynamic = "force-dynamic";

export default async function PrediksiPage() {
  const today = todayWIB();
  const page = await loadDashboardPage(today);
  const header = <PageHeader title="Prediksi" subtitle="Perkiraan porsi terjual 7 hari ke depan" />;
  if (!page) {
    return (
      <>
        {header}
        <DatabaseDown what="Prediksi" />
      </>
    );
  }
  const { choice, snapshot: s } = page;
  const visible = (d: string) => d >= today;
  const options: ForecastOption[] = [
    {
      id: "semua",
      name: "Semua kategori",
      points: s.totalPoints.filter((p) => visible(p.date)).map((p) => ({ ...p, lower: null, upper: null })),
      modelText: "Jumlah prediksi semua kategori",
      errorPct: null,
      baselineErrorPct: null,
      factors: [],
      dataDays: Math.max(0, ...s.categories.map((c) => c.dataDays)),
      warnings: [],
    },
    ...s.categories.map((c) => {
      const avg = c.points.length ? c.points.reduce((a, p) => a + p.predicted, 0) / c.points.length : 0;
      return {
        id: c.id,
        name: c.name,
        points: c.points.filter((p) => visible(p.date)),
        modelText: modelLabel(c.model),
        isRidge: c.model === "ridge",
        errorPct: c.errorPct,
        baselineErrorPct: c.baselineErrorPct,
        factors: notableFactors(c.factors, avg).map((f) => ({
          label: factorLabel(f.key),
          effect: f.effect,
          perMonth: f.key === "tren",
        })),
        dataDays: c.dataDays,
        warnings: c.warnings,
        hasFactors: c.factors.length > 0,
      };
    }),
  ];

  return (
    <>
      {header}
      <DatasetBar dataset={choice.dataset} auto={choice.auto} liveDays={choice.liveDays} liveMinDays={LIVE_MIN_DAYS} />
      <div className="space-y-5">
        <Panel aria-label="Status prediksi">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              {s.forecast ? (
                <ForecastNotice s={s} />
              ) : (
                <>
                  <p className="text-[16px] font-semibold">Prediksi belum dihitung</p>
                  <p className="text-[14px] text-ink-soft">
                    {s.lastDataDate === null
                      ? "Belum ada data penjualan di mode ini."
                      : "Tekan Hitung prediksi untuk menjalankan model dari data yang ada."}
                  </p>
                  <ForecastNotice s={s} />
                </>
              )}
            </div>
            {s.lastDataDate !== null ? (
              <RecalculateButton
                dataset={choice.dataset}
                returnTo="/prediksi"
                label={s.forecast ? "Hitung ulang" : "Hitung prediksi"}
              />
            ) : null}
          </div>
        </Panel>
        {s.forecast ? <ForecastView options={options} today={today} /> : null}
      </div>
    </>
  );
}
