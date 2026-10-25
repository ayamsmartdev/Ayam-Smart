import { SimulasiBadge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { formatDayShort } from "@/lib/date";
import { DEMO_INGREDIENTS, WASTE_REASON_LABEL } from "@/lib/demo-data";
import { formatNumber, formatPercent, formatQuantity } from "@/lib/format";
import { getPreviewSnapshot } from "@/lib/preview";
import { WasteForm } from "./waste-form";

export default function WastePage() {
  const s = getPreviewSnapshot();
  const recent = s.waste.slice(0, 10);

  return (
    <>
      <PageHeader
        title="Food waste"
        subtitle="Catat yang terbuang supaya persiapan makin pas"
        action={<SimulasiBadge />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <Panel aria-label="Ringkasan waste 7 hari">
            <p className="text-[15px] text-ink-soft">7 hari terakhir</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug">
              <span className="text-[40px] font-extrabold tabular-nums text-sambal-700">
                {formatNumber(s.stats.wasteChicken7)}
              </span>{" "}
              potong ayam terbuang
            </p>
            <p className="mt-1 text-[14px] text-ink-soft">
              {formatPercent(s.stats.wasteRate7)} dari ayam yang disiapkan.
            </p>
          </Panel>
          <WasteForm ingredients={DEMO_INGREDIENTS} />
        </div>

        <GroupedList title="Riwayat terakhir">
          {recent.map((w) => (
            <ListRow
              key={w.id}
              title={w.itemName}
              subtitle={`${formatDayShort(w.date)}, ${WASTE_REASON_LABEL[w.reason].toLowerCase()}`}
              trailing={
                <span className="text-[16px] font-semibold tabular-nums text-sambal-700">
                  {formatQuantity(w.qty, w.unit)}
                </span>
              }
            />
          ))}
        </GroupedList>
      </div>
    </>
  );
}
