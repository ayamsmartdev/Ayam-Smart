import { BasketIcon, SlidersIcon, UploadIcon } from "@/components/icons";
import { SimulasiBadge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelTitle } from "@/components/ui/panel";

const iconBox = "grid size-10 place-items-center rounded-row bg-brand-50 text-brand-700";

export default function LainnyaPage() {
  return (
    <>
      <PageHeader title="Lainnya" />
      <div className="space-y-6">
        <GroupedList>
          <ListRow
            href="/bahan"
            leading={<span className={iconBox}><BasketIcon className="size-5" /></span>}
            title="Bahan yang perlu disiapkan"
            subtitle="Besok dan 5 hari ke depan"
          />
          <ListRow
            href="/pengaturan"
            leading={<span className={iconBox}><SlidersIcon className="size-5" /></span>}
            title="Menu & resep"
            subtitle="Kategori menu, resep per porsi, cadangan stok"
          />
          <ListRow
            href="/import"
            leading={<span className={iconBox}><UploadIcon className="size-5" /></span>}
            title="Import data CSV"
            subtitle="Masukkan riwayat penjualan sekaligus"
          />
        </GroupedList>

        <Panel aria-labelledby="about-sim">
          <div className="flex items-center gap-2">
            <PanelTitle id="about-sim">Tentang data di pratinjau ini</PanelTitle>
            <SimulasiBadge />
          </div>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Menu, resep, dan angka penjualan masih contoh. Setelah rekap harian mulai diisi,
            dashboard, prediksi, dan rekomendasi bahan memakai data warung yang sebenarnya, dan
            label Simulasi hilang.
          </p>
        </Panel>
      </div>
    </>
  );
}
