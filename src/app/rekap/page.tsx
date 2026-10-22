import { PageHeader } from "@/components/ui/page-header";
import { todayWIB } from "@/lib/date";
import { DEMO_MENUS } from "@/lib/demo-data";
import { RekapForm } from "./rekap-form";

export default function RekapPage() {
  return (
    <>
      <PageHeader title="Rekap harian" subtitle="Isi jumlah porsi terjual di akhir hari" />
      <RekapForm menus={DEMO_MENUS} today={todayWIB()} />
    </>
  );
}
