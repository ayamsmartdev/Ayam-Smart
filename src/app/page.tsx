import { SalesChart } from "@/components/charts/sales-chart";
import { DatabaseDown } from "@/components/dataset/database-down";
import { DatasetBar } from "@/components/dataset/dataset-bar";
import { ForecastNotice } from "@/components/dataset/forecast-notice";
import { RecalculateButton } from "@/components/dataset/recalculate-button";
import { LinkButton } from "@/components/ui/button";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { loadDashboardPage } from "@/lib/data/dashboard";
import { formatDayLong, formatDayMonth, relativeDayLabel, todayWIB } from "@/lib/date";
import { LIVE_MIN_DAYS } from "@/lib/dataset";
import { formatNumber, formatPercent } from "@/lib/format";

// Membaca cookie mode data + database → selalu dirender saat dibuka (D-19, D-32).
export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const today = todayWIB();
  const page = await loadDashboardPage(today);
  if (!page) {
    return (
      <>
        <PageHeader title="Beranda" subtitle={formatDayLong(today)} />
        <DatabaseDown what="Beranda" />
      </>
    );
  }
  const { choice, snapshot: s } = page;
  const chicken = s.needs.focus.find((n) => n.ingredient.isChicken && n.buyKg !== null);
  const focusTotal = s.focusDate ? s.totalPoints.find((p) => p.date === s.focusDate)?.predicted : undefined;
  const leftover = chicken ? s.leftovers.find((l) => l.ingredientId === chicken.ingredient.id) : undefined;
  const change = s.stats.soldPrev7 > 0 ? ((s.stats.sold7 - s.stats.soldPrev7) / s.stats.soldPrev7) * 100 : null;
  const ranked = [...s.categories].sort((a, b) => b.last7 - a.last7);
  const top = Math.max(ranked[0]?.last7 ?? 0, 1);
  const noData = s.lastDataDate === null;

  return (
    <>
      <PageHeader title="Beranda" subtitle={formatDayLong(today)} />
      <DatasetBar dataset={choice.dataset} auto={choice.auto} liveDays={choice.liveDays} liveMinDays={LIVE_MIN_DAYS} />

      {noData ? (
        <Panel>
          <p className="text-[16px] font-semibold">
            {choice.dataset === "live" ? "Belum ada rekap warung" : "Data simulasi belum diisi"}
          </p>
          <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
            {choice.dataset === "live"
              ? "Prediksi dan rekomendasi muncul setelah rekap harian mulai diisi. Pilih Simulasi di atas untuk melihat contoh tampilannya."
              : "Jalankan SQL dari scripts/generate_demo_data.py di Supabase, lalu hitung prediksinya di halaman Prediksi."}
          </p>
          {choice.dataset === "live" ? (
            <LinkButton href="/rekap" className="mt-4">
              Isi rekap hari ini
            </LinkButton>
          ) : null}
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <Panel variant="hero" aria-labelledby="hero-title">
              {s.focusDate && chicken ? (
                <>
                  <p id="hero-title" className="text-[15px] font-medium text-ink-soft">
                    {relativeDayLabel(s.focusDate, today)}, {formatDayLong(s.focusDate)}
                  </p>
                  <p className="mt-3 text-[19px] font-semibold leading-snug sm:text-[22px]">
                    Beli{" "}
                    <span className="text-brand-gradient align-[-0.08em] text-[64px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[80px]">
                      {formatNumber(chicken.buyKg ?? 0, 0, 1)}
                    </span>{" "}
                    <span className="whitespace-nowrap">kg {chicken.ingredient.name.toLowerCase()}</span>
                  </p>
                  <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                    Untuk {formatNumber(chicken.recommended)} potong (sudah termasuk cadangan {s.bufferPct}%)
                    {leftover ? `, dikurangi sisa freezer ${formatNumber(chicken.stockUsed)} potong (${formatDayMonth(leftover.date)})` : ""}
                    , ±{formatNumber(chicken.ingredient.piecesPerKg ?? 0, 0, 1)} potong/kg. Perkiraan terjual{" "}
                    {formatNumber(Math.round(focusTotal ?? 0))} porsi semua kategori.
                  </p>
                </>
              ) : (
                <>
                  <p id="hero-title" className="text-[17px] font-semibold">
                    {s.forecast ? "Prediksi untuk besok belum ada" : "Prediksi belum dihitung"}
                  </p>
                  <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
                    {s.forecast
                      ? `Prediksi terakhir untuk ${formatDayMonth(s.forecast.startDate)}–${formatDayMonth(s.forecast.endDate)}. Hitung ulang dari data terbaru.`
                      : "Hitung prediksi dari data yang ada untuk melihat rekomendasi beli ayam."}
                  </p>
                  <div className="mt-4">
                    <RecalculateButton dataset={choice.dataset} returnTo="/" label="Hitung prediksi" />
                  </div>
                </>
              )}
              <div className="mt-4">
                <ForecastNotice s={s} />
              </div>
              {s.focusDate && chicken ? (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <LinkButton href="/bahan">Lihat semua bahan</LinkButton>
                  <LinkButton href="/prediksi" variant="secondary">
                    Detail prediksi
                  </LinkButton>
                </div>
              ) : null}
            </Panel>

            <Panel aria-labelledby="chart-title">
              <PanelTitle id="chart-title" className="mb-3">
                Penjualan dan prediksi (semua kategori)
              </PanelTitle>
              <SalesChart data={s.chart} showBand={false} />
            </Panel>
          </div>

          <div className="space-y-5">
            <section aria-labelledby="stats-title">
              <h2 id="stats-title" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
                7 hari s.d. {formatDayMonth(s.lastDataDate!)}
              </h2>
              <dl className="glass grid grid-cols-2 rounded-panel [&>div:nth-child(odd)]:border-r [&>div:nth-child(-n+2)]:border-b [&>div]:border-line/70 lg:grid-cols-1 lg:[&>div]:border-r-0 lg:[&>div:not(:last-child)]:border-b">
                {[
                  {
                    label: "Terjual",
                    value: formatNumber(s.stats.sold7),
                    note:
                      change === null ? "porsi" : `${change >= 0 ? "Naik" : "Turun"} ${formatPercent(Math.abs(change), 0)}`,
                    noteClass:
                      change === null ? "text-ink-soft" : change >= 0 ? "font-semibold text-daun-600" : "font-semibold text-sambal-700",
                    valueClass: "",
                  },
                  {
                    label: "Per hari buka",
                    value: formatNumber(s.stats.avgPerDay7),
                    note: `${s.stats.openDays7} hari buka`,
                    noteClass: "text-ink-soft",
                    valueClass: "",
                  },
                  {
                    label: "Food waste ayam",
                    value: formatNumber(s.stats.waste.pieces, 0, 1),
                    note:
                      s.stats.waste.ratePct === null
                        ? "potong tercatat"
                        : `potong, ${formatPercent(s.stats.waste.ratePct)} ayam terpakai`,
                    noteClass: "text-ink-soft",
                    valueClass: s.stats.waste.pieces > 0 ? "text-sambal-700" : "",
                  },
                  {
                    label: "Tidak tercatat",
                    value: s.stats.stockDiff ? formatNumber(s.stats.stockDiff.untracked, 0, 1) : "—",
                    note: s.stats.stockDiff ? `potong, dari ${s.stats.stockDiff.days} hari stok` : "isi belanja & sisa",
                    noteClass: "text-ink-soft",
                    valueClass: s.stats.stockDiff && s.stats.stockDiff.untracked > 0 ? "text-kriuk-700" : "",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="px-3 py-4 sm:px-4 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:py-3.5"
                  >
                    <dt className="text-[13px] text-ink-soft lg:text-[15px]">{item.label}</dt>
                    <dd className="lg:text-right">
                      <span className={`mt-1 block text-[24px] font-bold tabular-nums lg:mt-0 lg:text-[22px] ${item.valueClass}`}>
                        {item.value}
                      </span>
                      <span className={`block text-[12px] ${item.noteClass}`}>{item.note}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 px-1 text-[13px] leading-relaxed text-ink-soft">
                Tidak tercatat = selisih stok ayam yang tidak ada di rekap maupun catatan food waste (dipakai sendiri,
                waste yang belum dicatat, atau salah hitung).
              </p>
            </section>

            <GroupedList
              title="Kategori terlaris, 7 hari"
              footer={
                choice.dataset === "demo"
                  ? "Data simulasi untuk peragaan. Pilih Data warung di atas untuk angka asli."
                  : "Dari rekap harian warung."
              }
            >
              {ranked.map(({ id, name, last7 }) => (
                <ListRow
                  key={id}
                  title={name}
                  subtitle={
                    <span className="mt-1.5 block h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-ink/[.06]">
                      <span
                        className="block h-full rounded-full bg-linear-to-r from-kriuk-500 to-kriuk-100"
                        style={{ width: `${(last7 / top) * 100}%` }}
                      />
                    </span>
                  }
                  trailing={
                    <span className="text-[16px] font-semibold tabular-nums">
                      {formatNumber(last7)}
                      <span className="ml-1 text-[13px] font-normal text-ink-soft">porsi</span>
                    </span>
                  }
                />
              ))}
            </GroupedList>
          </div>
        </div>
      )}
    </>
  );
}
