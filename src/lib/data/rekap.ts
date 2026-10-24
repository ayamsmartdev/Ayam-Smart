import "server-only";
import { addDays, todayWIB } from "@/lib/date";
import { getSupabase } from "@/lib/supabase-server";

/** Rekap hanya untuk data nyata (D-08). Data simulasi tidak pernah ditulis dari form. */
export const LIVE = "live" as const;

/** Rentang tanggal yang boleh direkap: hari ini sampai 30 hari ke belakang (WIB). */
export const REKAP_MAX_DAYS_BACK = 30;

/** Kategori menu aktif (tabel `menus`, D-26). */
export type ActiveMenu = { id: string; name: string; description: string | null };

/** Bahan yang dibeli per kg (ayam) → punya baris stok di rekap (D-26, D-28). */
export type StockIngredient = { id: string; name: string };

/** Stok satu bahan pada satu hari, dalam potong. */
export type StockEntry = { prepared: number; leftover: number };

/** Batas wajar potong per bahan per hari (cegah salah ketik). */
export const STOCK_MAX = 2000;

export type RekapForDate = {
  qtyByMenu: Record<string, number>;
  /** Stok tercatat pada tanggal itu; bahan tanpa baris = belum dicatat. */
  stockByIngredient: Record<string, StockEntry>;
  /** Sisa freezer hari sebelumnya, sebagai pengingat saat mengisi "disiapkan". */
  prevLeftoverByIngredient: Record<string, number>;
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

export async function getStockIngredients(): Promise<StockIngredient[]> {
  const { data, error } = await getSupabase()
    .from("ingredients")
    .select("id, name")
    .eq("is_chicken", true)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRekap(date: string): Promise<RekapForDate> {
  const supabase = getSupabase();
  const stockCols = "ingredient_id, prepared_pieces, leftover_pieces, updated_at";
  const [sales, context, stock, prevStock] = await Promise.all([
    supabase.from("daily_sales").select("menu_id, qty, updated_at").eq("dataset", LIVE).eq("sale_date", date),
    supabase.from("daily_context").select("tag, updated_at").eq("dataset", LIVE).eq("ctx_date", date).maybeSingle(),
    supabase.from("daily_stock").select(stockCols).eq("dataset", LIVE).eq("stock_date", date),
    supabase.from("daily_stock").select("ingredient_id, leftover_pieces").eq("dataset", LIVE).eq("stock_date", addDays(date, -1)),
  ]);
  if (sales.error) throw sales.error;
  if (context.error) throw context.error;
  if (stock.error) throw stock.error;
  if (prevStock.error) throw prevStock.error;

  const closed = context.data?.tag === "tutup";
  const stamps = [
    ...(sales.data ?? []).map((r) => r.updated_at as string),
    ...(stock.data ?? []).map((r) => r.updated_at as string),
    ...(closed && context.data ? [context.data.updated_at as string] : []),
  ].sort();

  return {
    qtyByMenu: Object.fromEntries((sales.data ?? []).map((r) => [r.menu_id as string, r.qty as number])),
    stockByIngredient: Object.fromEntries(
      (stock.data ?? []).map((r) => [
        r.ingredient_id as string,
        { prepared: r.prepared_pieces as number, leftover: r.leftover_pieces as number },
      ]),
    ),
    prevLeftoverByIngredient: Object.fromEntries(
      (prevStock.data ?? []).map((r) => [r.ingredient_id as string, r.leftover_pieces as number]),
    ),
    closed,
    savedAt: stamps.at(-1) ?? null,
  };
}

export type StockInputItem = { ingredientId: string; prepared: number | null; leftover: number | null };

/**
 * Validasi stok dari form. Keduanya kosong = tidak dicatat (baris lama dihapus).
 * Jika diisi: keduanya wajib, angka bulat 0–STOCK_MAX, dan sisa ≤ disiapkan.
 */
export function cleanStockInput(
  raw: unknown,
  allowedIds: Set<string>,
): { ok: true; upserts: (StockEntry & { ingredientId: string })[]; clearIds: string[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, upserts: [], clearIds: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "Data stok tidak valid." };

  const upserts: (StockEntry & { ingredientId: string })[] = [];
  const clearIds: string[] = [];
  const seen = new Set<string>();
  const isQty = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= STOCK_MAX;

  for (const item of raw as Partial<StockInputItem>[]) {
    const id = item?.ingredientId;
    if (typeof id !== "string" || !allowedIds.has(id) || seen.has(id)) {
      return { ok: false, error: "Ada bahan stok yang tidak dikenal. Muat ulang halaman." };
    }
    seen.add(id);
    const { prepared, leftover } = item;
    if ((prepared === null || prepared === undefined) && (leftover === null || leftover === undefined)) {
      clearIds.push(id);
      continue;
    }
    if (prepared === null || prepared === undefined || leftover === null || leftover === undefined) {
      return { ok: false, error: "Isi stok dua-duanya (disiapkan dan sisa), atau kosongkan keduanya." };
    }
    if (!isQty(prepared) || !isQty(leftover)) {
      return { ok: false, error: `Stok harus angka bulat 0–${STOCK_MAX} potong.` };
    }
    if (leftover > prepared) return { ok: false, error: "Sisa ke freezer tidak boleh lebih dari yang disiapkan." };
    upserts.push({ ingredientId: id, prepared, leftover });
  }
  return { ok: true, upserts, clearIds };
}
