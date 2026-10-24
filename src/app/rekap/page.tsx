import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { getActiveMenus, getRekap, getStockIngredients, parseRekapDate } from "@/lib/data/rekap";
import { todayWIB } from "@/lib/date";
import { RekapForm } from "./rekap-form";

// Membaca database & dilindungi PIN → selalu dirender saat dibuka (D-19).
export const dynamic = "force-dynamic";

export default async function RekapPage({ searchParams }: PageProps<"/rekap">) {
  const today = todayWIB();
  const { tanggal } = await searchParams;
  const date = parseRekapDate(tanggal, today) ?? today;

  let menus;
  let stockIngredients;
  let rekap;
  try {
    [menus, stockIngredients, rekap] = await Promise.all([getActiveMenus(), getStockIngredients(date), getRekap(date)]);
  } catch {
    return (
      <>
        <PageHeader title="Rekap harian" />
        <Panel>
          <p className="text-[16px] font-semibold">Database belum bisa dihubungi</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Rekap tidak bisa dibuka sekarang. Coba muat ulang sebentar lagi, atau cek halaman Status.
          </p>
          <LinkButton href="/status" variant="secondary" className="mt-4">
            Buka status sistem
          </LinkButton>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Rekap harian" subtitle="Isi jumlah porsi terjual di akhir hari" />
      {menus.length === 0 ? (
        <Panel>
          <p className="text-[16px] font-semibold">Belum ada kategori menu</p>
          <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
            Tambahkan kategori menu warung dulu di Menu &amp; resep, lalu kembali ke sini untuk mengisi rekap.
          </p>
          <LinkButton href="/pengaturan" className="mt-4">
            Buka Menu &amp; resep
          </LinkButton>
        </Panel>
      ) : (
        // key: ganti tanggal → form mulai dari data tanggal itu, bukan sisa ketikan sebelumnya.
        <RekapForm
          key={date}
          menus={menus}
          stockIngredients={stockIngredients}
          date={date}
          today={today}
          initial={rekap}
        />
      )}
    </>
  );
}
