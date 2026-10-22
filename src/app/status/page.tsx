import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { MissingEnvError } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { getSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Status sistem · AYAMSMART", robots: { index: false } };

// Selalu cek ulang saat dibuka, tidak di-cache (D-19).
export const dynamic = "force-dynamic";

/** Tabel yang wajib ada dari migrasi 0001_init.sql. */
const TABLES = [
  "menus",
  "ingredients",
  "menu_ingredients",
  "daily_sales",
  "daily_context",
  "food_waste",
  "forecast_runs",
  "forecasts",
  "settings",
  "pin_attempts",
] as const;

type Check = { name: string; ok: boolean; detail: string };

async function runChecks(): Promise<{ checks: Check[]; latencyMs: number | null }> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    const detail =
      e instanceof MissingEnvError ? `Belum diisi: ${e.names.join(", ")}` : "Gagal membuat koneksi";
    return { checks: [{ name: "Konfigurasi", ok: false, detail }], latencyMs: null };
  }

  const started = performance.now();
  const results = await Promise.all(
    TABLES.map(async (table): Promise<Check> => {
      // head: true → hanya hitung jumlah baris, tidak mengambil isi tabel.
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return error
        ? { name: table, ok: false, detail: error.message || "Tabel tidak bisa dibaca" }
        : { name: table, ok: true, detail: `${formatNumber(count ?? 0)} baris` };
    }),
  );
  return { checks: results, latencyMs: Math.round(performance.now() - started) };
}

export default async function StatusPage() {
  const { checks, latencyMs } = await runChecks();
  const allOk = checks.every((c) => c.ok);

  return (
    <>
      <PageHeader
        title="Status sistem"
        subtitle={
          allOk
            ? `Database tersambung. Cek ${checks.length} tabel selesai dalam ${formatNumber(latencyMs ?? 0)} ms.`
            : "Ada yang perlu diperbaiki sebelum data bisa disimpan."
        }
        action={<Badge tone={allOk ? "daun" : "sambal"}>{allOk ? "Tersambung" : "Bermasalah"}</Badge>}
      />
      <GroupedList
        title="Tabel database"
        footer="Halaman ini hanya menampilkan jumlah baris, bukan isi data. Tidak tampil di menu navigasi."
      >
        {checks.map((c) => (
          <ListRow
            key={c.name}
            title={<span className="font-mono text-[15px]">{c.name}</span>}
            subtitle={c.ok ? undefined : c.detail}
            trailing={
              <span className={c.ok ? "text-[14px] text-ink-soft" : "text-[14px] font-semibold text-sambal-700"}>
                {c.ok ? c.detail : "Gagal"}
              </span>
            }
          />
        ))}
      </GroupedList>
    </>
  );
}
