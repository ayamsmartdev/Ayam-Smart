import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { getActiveMenus, getRekap, getStockIngredients, LIVE, parseRekapDate } from "@/lib/data/rekap";
import { addDays, todayWIB } from "@/lib/date";
import { getLatestForecast, type LatestForecast } from "@/lib/forecast-client";
import type { ForecastPanelData } from "./forecast-panel";
import { RekapForm } from "./rekap-form";

/** Ringkas hasil forecast terakhir untuk kartu Prediksi; null jika tidak terbaca. */
async function loadForecastPanel(today: string): Promise<ForecastPanelData | null> {
  let latest: LatestForecast;
  try {
    latest = await getLatestForecast(LIVE);
  } catch {
    return null;
  }
  const ok = latest.ok;
  const tomorrow = addDays(today, 1);
  const tomorrowPoints = ok?.points.filter((p) => p.date === tomorrow) ?? [];
  const failedIsNewest = latest.last?.status === "failed" && (!ok || latest.last.createdAt > ok.createdAt);
  return {
    lastFailed:
      failedIsNewest && latest.last
        ? { at: latest.last.createdAt, error: latest.last.error ?? "Penyebab tidak diketahui." }
        : null,
    ok: ok
      ? {
          at: ok.createdAt,
          startDate: ok.startDate,
          endDate: addDays(ok.startDate, Math.max(ok.horizon, 1) - 1),
          tomorrow:
            tomorrowPoints.length > 0
              ? { date: tomorrow, total: Math.round(tomorrowPoints.reduce((a, p) => a + p.predicted, 0)) }
              : null,
        }
      : null,
  };
}

// Membaca database & dilindungi PIN → selalu dirender saat dibuka (D-19).
export const dynamic = "force-dynamic";

export default async function RekapPage({ searchParams }: PageProps<"/rekap">) {
  const today = todayWIB();
  const { tanggal } = await searchParams;
  const date = parseRekapDate(tanggal, today) ?? today;

  let menus;
  let stockIngredients;
  let rekap;
  let forecast;
  try {
    [menus, stockIngredients, rekap, forecast] = await Promise.all([
      getActiveMenus(),
      getStockIngredients(date),
      getRekap(date),
      loadForecastPanel(today),
    ]);
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
          forecast={forecast}
        />
      )}
    </>
  );
}
