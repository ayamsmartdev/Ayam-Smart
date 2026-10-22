import { PageHeader } from "@/components/ui/page-header";
import { getPreviewSnapshot } from "@/lib/preview";
import { ForecastView } from "./forecast-view";

export default function PrediksiPage() {
  const s = getPreviewSnapshot();
  const options = [
    { id: "semua", name: "Semua menu", forecast: s.total },
    ...s.menus.map((m) => ({ id: m.menu.id, name: m.menu.name, forecast: m.forecast })),
  ];

  return (
    <>
      <PageHeader title="Prediksi" subtitle="Perkiraan porsi terjual 5 hari ke depan" />
      <ForecastView options={options} today={s.today} />
    </>
  );
}
