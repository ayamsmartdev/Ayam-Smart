import { SalesChart } from "@/components/charts/sales-chart";
import { LinkButton } from "@/components/ui/button";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { formatDayLong } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/format";
import { getPreviewSnapshot } from "@/lib/preview";

export default function BerandaPage() {
  const s = getPreviewSnapshot();
  const chicken = s.tomorrowNeeds.find((n) => n.ingredient.isChicken);
  const tomorrowTotal = s.total.points.find((p) => p.date === s.tomorrow);
  const change = s.stats.soldPrev7 > 0 ? ((s.stats.sold7 - s.stats.soldPrev7) / s.stats.soldPrev7) * 100 : 0;
  const ranked = [...s.menus].sort((a, b) => b.last7 - a.last7);
  const top = ranked[0]?.last7 ?? 1;

  return (
    <>
      <PageHeader title="Beranda" subtitle={formatDayLong(s.today)} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Panel variant="hero" aria-labelledby="hero-title">
            <p id="hero-title" className="text-[15px] font-medium text-ink-soft">
              Besok, {formatDayLong(s.tomorrow)}
            </p>
            <p className="mt-3 text-[19px] font-semibold leading-snug sm:text-[22px]">
              Siapkan{" "}
              <span className="text-brand-gradient align-[-0.08em] text-[64px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[80px]">
                {formatNumber(chicken?.recommended ?? 0)}
              </span>{" "}
              <span className="whitespace-nowrap">potong ayam</span>
            </p>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Sekitar {formatNumber(chicken?.chickens ?? 0)} ekor, sudah termasuk cadangan{" "}
              {s.settings.bufferPct}%. Perkiraan terjual{" "}
              {formatNumber(Math.round(tomorrowTotal?.predicted ?? 0))} porsi
              {tomorrowTotal?.lower != null && tomorrowTotal.upper != null
                ? ` (kisaran ${formatNumber(Math.round(tomorrowTotal.lower))}–${formatNumber(Math.round(tomorrowTotal.upper))})`
                : ""}
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <LinkButton href="/bahan">Lihat semua bahan</LinkButton>
              <LinkButton href="/rekap" variant="secondary">
                Isi rekap hari ini
              </LinkButton>
            </div>
          </Panel>

          <Panel aria-labelledby="chart-title">
            <PanelTitle id="chart-title" className="mb-3">
              Penjualan dan prediksi
            </PanelTitle>
            <SalesChart data={s.chart} />
          </Panel>
        </div>

        <div className="space-y-5">
          <section aria-labelledby="stats-title">
            <h2 id="stats-title" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
              7 hari terakhir
            </h2>
            {/* HP: 3 kolom berdampingan. Tablet landscape (kolom sempit): baris label–nilai. */}
            <dl className="glass grid grid-cols-3 divide-x divide-line/70 rounded-panel lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
              {[
                {
                  label: "Terjual",
                  value: formatNumber(s.stats.sold7),
                  note: `${change >= 0 ? "Naik" : "Turun"} ${formatPercent(Math.abs(change), 0)}`,
                  noteClass: change >= 0 ? "font-semibold text-daun-600" : "font-semibold text-sambal-700",
                  valueClass: "",
                },
                {
                  label: "Per hari",
                  value: formatNumber(s.stats.avgPerDay7),
                  note: "porsi",
                  noteClass: "text-ink-soft",
                  valueClass: "",
                },
                {
                  label: "Food waste",
                  value: formatPercent(s.stats.wasteRate7),
                  note: `${formatNumber(s.stats.wasteChicken7)} potong`,
                  noteClass: "text-ink-soft",
                  valueClass: "text-sambal-700",
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
          </section>

          <GroupedList
            title="Menu terlaris, 7 hari"
            footer="Pratinjau memakai data simulasi. Angka berganti otomatis saat rekap harian mulai diisi."
          >
            {ranked.map(({ menu, last7 }) => (
              <ListRow
                key={menu.id}
                title={menu.name}
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
    </>
  );
}
