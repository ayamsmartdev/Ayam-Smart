import "server-only";
import { addDays, todayWIB } from "@/lib/date";
import {
  averagePiecesPerKg,
  findPreviousLeftover,
  PIECES_PER_KG_WINDOW_DAYS,
  type StockValues,
} from "@/lib/stock";
import { getSupabase } from "@/lib/supabase-server";

/** Rekap hanya untuk data nyata (D-08). Data simulasi tidak pernah ditulis dari form. */
export const LIVE = "live" as const;

/** Rentang tanggal yang boleh direkap: hari ini sampai 30 hari ke belakang (WIB). */
export const REKAP_MAX_DAYS_BACK = 30;

/** Berapa hari ke belakang dicari sisa freezer terakhir (melewati hari tutup). */
const LEFTOVER_LOOKBACK_DAYS = 7;

/** Kategori menu aktif (tabel `menus`, D-26). */
export type ActiveMenu = { id: string; name: string; description: string | null };

/** Bahan yang dibeli per kg (ayam) → punya kartu stok di rekap (D-26, D-28, D-29). */
export type StockIngredient = {
  id: string;
  name: string;
  /** Perkiraan potong/kg dari pengaturan bahan (cadangan). */
  piecesPerKg: number;
  /** Rata-rata potong/kg dari belanja 14 hari terakhir; null jika belum ada. */
  averagePiecesPerKg: number | null;
  /** Takaran bahan ini per porsi tiap kategori (dari resep). */
  qtyPerPortionByMenu: Record<string, number>;
};

export type RekapForDate = {
  qtyByMenu: Record<string, number>;
  /** Stok tercatat pada tanggal itu (belanja dan/atau sisa); bahan tanpa baris = belum dicatat. */
  stockByIngredient: Record<string, StockValues>;
  /** Sisa freezer terakhir sebelum tanggal ini (hari tutup dilewati); null = tidak diketahui. */
  previousLeftoverByIngredient: Record<string, number | null>;
  closed: boolean;
  /** Waktu terakhir rekap porsi disimpan (ISO) atau null jika belum pernah direkap. */
  savedAt: string | null;
  /** Waktu terakhir stok disimpan (ISO) atau null. */
  stockSavedAt: string | null;
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

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Bahan stok aktif + resepnya + rata-rata potong/kg 14 hari sampai `date`. */
export async function getStockIngredients(date: string): Promise<StockIngredient[]> {
  const supabase = getSupabase();
  const ingredients = await supabase
    .from("ingredients")
    .select("id, name, pieces_per_kg")
    .eq("is_chicken", true)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (ingredients.error) throw ingredients.error;
  const list = ingredients.data ?? [];
  if (list.length === 0) return [];

  const ids = list.map((i) => i.id as string);
  const [recipes, purchases] = await Promise.all([
    supabase.from("menu_ingredients").select("menu_id, ingredient_id, qty_per_portion").in("ingredient_id", ids),
    supabase
      .from("daily_stock")
      .select("ingredient_id, bought_kg, bought_pieces")
      .eq("dataset", LIVE)
      .in("ingredient_id", ids)
      .gte("stock_date", addDays(date, -(PIECES_PER_KG_WINDOW_DAYS - 1)))
      .lte("stock_date", date),
  ]);
  if (recipes.error) throw recipes.error;
  if (purchases.error) throw purchases.error;

  return list.map((i) => ({
    id: i.id as string,
    name: i.name as string,
    piecesPerKg: (i.pieces_per_kg as number | null) ?? 9,
    averagePiecesPerKg: averagePiecesPerKg(
      (purchases.data ?? [])
        .filter((p) => p.ingredient_id === i.id)
        .map((p) => ({ boughtKg: num(p.bought_kg), boughtPieces: num(p.bought_pieces) })),
    ),
    qtyPerPortionByMenu: Object.fromEntries(
      (recipes.data ?? [])
        .filter((r) => r.ingredient_id === i.id)
        .map((r) => [r.menu_id as string, Number(r.qty_per_portion)]),
    ),
  }));
}

export async function getRekap(date: string): Promise<RekapForDate> {
  const supabase = getSupabase();
  const from = addDays(date, -LEFTOVER_LOOKBACK_DAYS);
  const [sales, context, stock, history, closedDays] = await Promise.all([
    supabase.from("daily_sales").select("menu_id, qty, updated_at").eq("dataset", LIVE).eq("sale_date", date),
    supabase.from("daily_context").select("tag, updated_at").eq("dataset", LIVE).eq("ctx_date", date).maybeSingle(),
    supabase
      .from("daily_stock")
      .select("ingredient_id, bought_kg, bought_pieces, leftover_pieces, updated_at")
      .eq("dataset", LIVE)
      .eq("stock_date", date),
    supabase
      .from("daily_stock")
      .select("ingredient_id, stock_date, leftover_pieces")
      .eq("dataset", LIVE)
      .gte("stock_date", from)
      .lte("stock_date", addDays(date, -1)),
    supabase
      .from("daily_context")
      .select("ctx_date")
      .eq("dataset", LIVE)
      .eq("tag", "tutup")
      .gte("ctx_date", from)
      .lte("ctx_date", addDays(date, -1)),
  ]);
  for (const r of [sales, context, stock, history, closedDays]) if (r.error) throw r.error;

  const closed = context.data?.tag === "tutup";
  const salesStamps = [
    ...(sales.data ?? []).map((r) => r.updated_at as string),
    ...(closed && context.data ? [context.data.updated_at as string] : []),
  ].sort();
  const stockStamps = (stock.data ?? []).map((r) => r.updated_at as string).sort();

  // Sisa terakhir per bahan: kemarin, atau lebih jauh jika hari-hari di antaranya tutup.
  const previousDates = Array.from({ length: LEFTOVER_LOOKBACK_DAYS }, (_, i) => addDays(date, -(i + 1)));
  const closedSet = new Set((closedDays.data ?? []).map((r) => r.ctx_date as string));
  const leftoverByIngredient: Record<string, Record<string, number | null>> = {};
  for (const r of history.data ?? []) {
    (leftoverByIngredient[r.ingredient_id as string] ??= {})[r.stock_date as string] = num(r.leftover_pieces);
  }
  const ingredientIds = new Set([
    ...Object.keys(leftoverByIngredient),
    ...(stock.data ?? []).map((r) => r.ingredient_id as string),
  ]);

  return {
    qtyByMenu: Object.fromEntries((sales.data ?? []).map((r) => [r.menu_id as string, r.qty as number])),
    stockByIngredient: Object.fromEntries(
      (stock.data ?? []).map((r) => [
        r.ingredient_id as string,
        { boughtKg: num(r.bought_kg), boughtPieces: num(r.bought_pieces), leftover: num(r.leftover_pieces) },
      ]),
    ),
    previousLeftoverByIngredient: Object.fromEntries(
      [...ingredientIds].map((id) => [
        id,
        findPreviousLeftover(previousDates, leftoverByIngredient[id] ?? {}, closedSet),
      ]),
    ),
    closed,
    savedAt: salesStamps.at(-1) ?? null,
    stockSavedAt: stockStamps.at(-1) ?? null,
  };
}
