import { DatabaseDown } from "@/components/dataset/database-down";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { LIVE } from "@/lib/data/rekap";
import { getRecipes } from "@/lib/data/recipes";
import { getWasteOptions, getWasteRows, wasteWindow } from "@/lib/data/waste";
import { addDays, formatDayMonth, todayWIB } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/format";
import { getSupabase } from "@/lib/supabase-server";
import { chickenWasteSummary } from "@/lib/waste";
import { WasteManager } from "./waste-manager";

// Membaca database & dilindungi PIN → selalu dirender saat dibuka (D-19).
export const dynamic = "force-dynamic";

const CHART_DAYS = 14;

async function load(today: string) {
  const { from, to } = wasteWindow(today);
  const options = await getWasteOptions();
  const [rows, recipes, sales] = await Promise.all([
    getWasteRows(LIVE, from, to, options),
    getRecipes(),
    getSupabase()
      .from("daily_sales")
      .select("sale_date, menu_id, qty")
      .eq("dataset", LIVE)
      .gte("sale_date", addDays(today, -6))
      .lte("sale_date", today)
      .limit(1000),
  ]);
  if (sales.error) throw sales.error;
  const summary = chickenWasteSummary({
    end: today,
    days: CHART_DAYS,
    waste: rows,
    sales: (sales.data ?? []).map((s) => ({ date: s.sale_date as string, menuId: s.menu_id as string, qty: Number(s.qty) })),
    chickenIds: options.bahan.filter((b) => b.isChicken).map((b) => b.id),
    recipes,
  });
  return { options, rows, summary, from };
}

export default async function WastePage() {
  const today = todayWIB();
  const header = (
    <PageHeader
      title="Food waste"
      subtitle="Catat yang terbuang supaya persiapan makin pas"
      action={
        <Badge tone="daun">
          <span className="size-1.5 rounded-full bg-daun-600" aria-hidden="true" />
          Data warung
        </Badge>
      }
    />
  );
  let data;
  try {
    data = await load(today);
  } catch {
    return (
      <>
        {header}
        <DatabaseDown what="Food waste" />
      </>
    );
  }
  const { options, rows, summary, from } = data;
  const peak = Math.max(1, ...summary.perDay.map((p) => p.pieces));
  const notes7 = rows.filter((r) => r.date >= addDays(today, -6)).length;

  return (
    <>
      {header}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <Panel aria-label="Ringkasan waste 7 hari">
            <p className="text-[15px] text-ink-soft">7 hari terakhir</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug">
              <span className="text-[40px] font-extrabold tabular-nums text-sambal-700">
                {formatNumber(summary.pieces7, 0, 1)}
              </span>{" "}
              potong ayam terbuang
            </p>
            <p className="mt-1 text-[14px] text-ink-soft">
              {summary.ratePct7 === null
                ? "Tingkat waste muncul setelah ada rekap porsi."
                : `${formatPercent(summary.ratePct7)} dari ayam yang terpakai (${formatNumber(summary.used7)} potong terjual).`}{" "}
              {formatNumber(notes7)} catatan dalam 7 hari.
            </p>

            <div className="mt-5" aria-label={`Ayam terbuang per hari, ${CHART_DAYS} hari terakhir`} role="img">
              <div className="flex h-28 items-end gap-1">
                {summary.perDay.map((p) => (
                  <div key={p.date} className="flex h-full flex-1 flex-col justify-end" title={`${formatDayMonth(p.date)}: ${p.pieces} potong`}>
                    <div
                      className={p.pieces > 0 ? "rounded-t-md bg-sambal-500/80" : "rounded-t-md bg-ink/[.06]"}
                      style={{ height: p.pieces > 0 ? `${Math.max(8, (p.pieces / peak) * 100)}%` : "4px" }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[12px] text-ink-soft">
                <span>{formatDayMonth(summary.perDay[0].date)}</span>
                <span>Hari ini</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
              Ayam terbuang = catatan bahan ayam (potong) + porsi menu × takaran ayam di resep.
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <WasteManager
            menus={options.menus}
            bahan={options.bahan}
            rows={rows.map(({ id, date, kind, itemId, itemName, unit, qty, reason, note }) => ({
              id,
              date,
              kind,
              itemId,
              itemName,
              unit,
              qty,
              reason,
              note,
            }))}
            today={today}
            minDate={from}
          />
        </div>
      </div>
    </>
  );
}
