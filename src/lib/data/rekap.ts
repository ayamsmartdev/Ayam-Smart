import "server-only";
import { addDays, todayWIB } from "@/lib/date";
import { getSupabase } from "@/lib/supabase-server";

/** Rekap hanya untuk data nyata (D-08). Data simulasi tidak pernah ditulis dari form. */
export const LIVE = "live" as const;

/** Rentang tanggal yang boleh direkap: hari ini sampai 30 hari ke belakang (WIB). */
export const REKAP_MAX_DAYS_BACK = 30;

/** Kategori menu aktif (tabel `menus`, D-26). */
export type ActiveMenu = { id: string; name: string; description: string | null };

export type RekapForDate = {
  qtyByMenu: Record<string, number>;
  closed: boolean;
  /** Waktu terakhir disimpan (ISO) atau null jika belum pernah direkap. */
  savedAt: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validasi tanggal rekap dari URL/form. Mengembalikan null jika di luar rentang. */
export function parseRekapDate(value: unknown, today = todayWIB()): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  // Tolak tanggal yang tidak ada di kalender (mis. 2026-02-31).
  if (addDays(value, 0) !== value) return null;
  if (value > today || value < addDays(today, -REKAP_MAX_DAYS_BACK)) return null;
  return value;
}

export async function getActiveMenus(): Promise<ActiveMenu[]> {
  const { data, error } = await getSupabase()
    .from("menus")
    .select("id, name, description")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRekap(date: string): Promise<RekapForDate> {
  const supabase = getSupabase();
  const [sales, context] = await Promise.all([
    supabase.from("daily_sales").select("menu_id, qty, updated_at").eq("dataset", LIVE).eq("sale_date", date),
    supabase.from("daily_context").select("tag, updated_at").eq("dataset", LIVE).eq("ctx_date", date).maybeSingle(),
  ]);
  if (sales.error) throw sales.error;
  if (context.error) throw context.error;

  const closed = context.data?.tag === "tutup";
  const stamps = [
    ...(sales.data ?? []).map((r) => r.updated_at as string),
    ...(closed && context.data ? [context.data.updated_at as string] : []),
  ].sort();

  return {
    qtyByMenu: Object.fromEntries((sales.data ?? []).map((r) => [r.menu_id as string, r.qty as number])),
    closed,
    savedAt: stamps.at(-1) ?? null,
  };
}
