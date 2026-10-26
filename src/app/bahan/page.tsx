import { DatabaseDown } from "@/components/dataset/database-down";
import { DatasetBar } from "@/components/dataset/dataset-bar";
import { ForecastNotice } from "@/components/dataset/forecast-notice";
import { RecalculateButton } from "@/components/dataset/recalculate-button";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { loadDashboardPage } from "@/lib/data/dashboard";
import { getRekap, getStockIngredients, LIVE, parseRekapDate } from "@/lib/data/rekap";
import { getWasteFacts } from "@/lib/data/waste";
import { formatDayLong, formatDayMonth, relativeDayLabel, todayWIB } from "@/lib/date";
import { LIVE_MIN_DAYS } from "@/lib/dataset";
import { isPinVerified } from "@/lib/pin";
import { chickenWasteByDate } from "@/lib/waste";
import { NeedsView } from "./needs-view";
import { StockSection } from "./stock-section";

// Membaca cookie mode data + database → selalu dirender saat dibuka (D-19, D-32).
export const dynamic = "force-dynamic";

/** Data kartu stok (selalu `live`); null jika database tidak terjangkau. */
async function loadStock(date: string) {
  try {
    const [ingredients, rekap, waste] = await Promise.all([
      getStockIngredients(date),
      getRekap(date),
      getWasteFacts(LIVE, date, date),
    ]);
    const wasteByIngredient = Object.fromEntries(
      ingredients.map((i) => [i.id, chickenWasteByDate(waste, i.id, i.qtyPerPortionByMenu).get(date) ?? 0]),
    );
    return { ingredients, rekap, wasteByIngredient };
  } catch {
    return null;
  }
}

export default async function BahanPage({ searchParams }: PageProps<"/bahan">) {
  const today = todayWIB();
  const { tanggal } = await searchParams;
  const stockDate = parseRekapDate(tanggal, today) ?? today;
  const [page, pinOk] = await Promise.all([loadDashboardPage(today), isPinVerified()]);
  const stock = pinOk ? await loadStock(stockDate) : null;
  const header = <PageHeader title="Bahan" subtitle="Rekomendasi beli dan catatan stok ayam" />;
  if (!page) {
    return (
      <>
        {header}
        <DatabaseDown what="Halaman bahan" />
      </>
    );
  }
  const { choice, snapshot: s } = page;
  const hasNeeds = s.focusDate !== null && s.needs.focus.length > 0;

  return (
    <>
      {header}
      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="text-[17px] font-semibold tracking-tight">Rekomendasi beli</h2>
            <a href="#stok-title" className="shrink-0 text-[14px] font-semibold text-brand-700">
              Catat stok ↓
            </a>
          </div>
          <DatasetBar
            dataset={choice.dataset}
            auto={choice.auto}
            liveDays={choice.liveDays}
            liveMinDays={LIVE_MIN_DAYS}
          />
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
        </div>

        {!pinOk ? (
          <Panel aria-labelledby="stok-title">
            <h2 id="stok-title" className="text-[17px] font-semibold tracking-tight">
              Catat stok ayam
            </h2>
            <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
              Belanja dan sisa ayam di freezer dicatat di sini. Masukkan PIN untuk mengisi.
            </p>
            <LinkButton href="/pin?next=/bahan" className="mt-4">
              Masukkan PIN
            </LinkButton>
          </Panel>
        ) : !stock ? (
          <DatabaseDown what="Catatan stok" />
        ) : stock.ingredients.length === 0 ? (
          <Panel aria-labelledby="stok-title">
            <h2 id="stok-title" className="text-[17px] font-semibold tracking-tight">
              Catat stok ayam
            </h2>
            <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
              Belum ada bahan yang dibeli per kg. Tandai bahan ayam di Menu &amp; resep → Bahan.
            </p>
            <LinkButton href="/pengaturan" variant="secondary" className="mt-4">
              Buka Menu &amp; resep
            </LinkButton>
          </Panel>
        ) : (
          <StockSection
            key={stockDate}
            ingredients={stock.ingredients}
            date={stockDate}
            today={today}
            stockByIngredient={stock.rekap.stockByIngredient}
            previousLeftover={stock.rekap.previousLeftoverByIngredient}
            qtyByMenu={stock.rekap.qtyByMenu}
            closed={stock.rekap.closed}
            stockSavedAt={stock.rekap.stockSavedAt}
            wasteByIngredient={stock.wasteByIngredient}
          />
        )}
      </div>
    </>
  );
}
