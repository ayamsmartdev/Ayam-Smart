import { PageHeader } from "@/components/ui/page-header";
import { formatDayLong } from "@/lib/date";
import { getPreviewSnapshot } from "@/lib/preview";
import { NeedsView } from "./needs-view";

export default function BahanPage() {
  const s = getPreviewSnapshot();
  return (
    <>
      <PageHeader title="Bahan" subtitle="Yang perlu disiapkan berdasarkan prediksi" />
      <NeedsView
        tomorrow={s.tomorrowNeeds}
        fiveDays={s.fiveDayNeeds}
        bufferPct={s.settings.bufferPct}
        tomorrowLabel={`Besok, ${formatDayLong(s.tomorrow)}`}
      />
    </>
  );
}
