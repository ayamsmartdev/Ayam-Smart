import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { getAllMenus } from "@/lib/data/menus";
import { MenuManager } from "./menu-manager";

// Membaca database & dilindungi PIN → selalu dirender saat dibuka (D-19).
export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  let menus;
  try {
    menus = await getAllMenus();
  } catch {
    return (
      <>
        <PageHeader title="Menu & resep" />
        <Panel>
          <p className="text-[16px] font-semibold">Database belum bisa dihubungi</p>
          <p className="mt-1 text-[15px] text-ink-soft">Coba muat ulang sebentar lagi, atau cek halaman Status.</p>
          <LinkButton href="/status" variant="secondary" className="mt-4">
            Buka status sistem
          </LinkButton>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Menu & resep" subtitle="Daftar menu warung yang direkap setiap hari" />
      <MenuManager
        menus={menus.map(({ id, name, price, isActive }) => ({ id, name, price, isActive }))}
      />
    </>
  );
}
