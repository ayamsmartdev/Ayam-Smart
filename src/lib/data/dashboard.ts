import "server-only";
import { buildDashboard, type DashboardSnapshot } from "@/lib/dashboard";
import { getRecipes } from "@/lib/data/recipes";
import { selectAll } from "@/lib/data/select-all";
import { getSettings } from "@/lib/data/settings";
import { getWasteFacts } from "@/lib/data/waste";
import { addDays } from "@/lib/date";
import { type Dataset, getDatasetChoice } from "@/lib/dataset";
import { getLatestForecast } from "@/lib/forecast-client";
import { getSupabase } from "@/lib/supabase-server";

/** Hari penjualan yang dibaca untuk grafik (30) + statistik 7/14 hari, dihitung dari tanggal data terakhir. */
const SALES_DAYS = 45;
/** Hari stok yang dibaca: rata-rata potong/kg 14 hari + rantai sisa 7 hari. */
const STOCK_DAYS = 21;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Data Beranda/Prediksi/Bahan untuk satu dataset (D-32). */
export async function getDashboard(dataset: Dataset, today: string): Promise<DashboardSnapshot> {
  const supabase = getSupabase();

  // Tanggal data terakhir menentukan jendela baca (dataset demo bisa berakhir beberapa hari lalu).
  const last = await supabase
    .from("daily_sales")
    .select("sale_date")
    .eq("dataset", dataset)
    .lte("sale_date", today)
    .order("sale_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) throw last.error;
  const anchor = (last.data?.sale_date as string | undefined) ?? today;
  const salesFrom = addDays(anchor, -(SALES_DAYS - 1));
  const stockFrom = addDays(anchor < today ? anchor : today, -(STOCK_DAYS - 1));

  const [menus, ingredients, recipes, settings, forecast, sales, closed, stock, waste] = await Promise.all([
    supabase.from("menus").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase
      .from("ingredients")
      .select("id, name, unit, is_chicken, pieces_per_kg")
      .eq("is_active", true)
      .order("name"),
    getRecipes(),
    getSettings(),
    getLatestForecast(dataset),
    selectAll<{ sale_date: string; menu_id: string; qty: number }>((from, to) =>
      supabase
        .from("daily_sales")
        .select("sale_date, menu_id, qty")
        .eq("dataset", dataset)
        .gte("sale_date", salesFrom)
        .lte("sale_date", today)
        .order("sale_date")
        .order("menu_id")
        .range(from, to),
    ),
    supabase
      .from("daily_context")
      .select("ctx_date")
      .eq("dataset", dataset)
      .eq("tag", "tutup")
      .gte("ctx_date", addDays(stockFrom, -7))
      .lte("ctx_date", today),
    selectAll<{
      stock_date: string;
      ingredient_id: string;
      bought_kg: number | null;
      bought_pieces: number | null;
      leftover_pieces: number | null;
    }>((from, to) =>
      supabase
        .from("daily_stock")
        .select("stock_date, ingredient_id, bought_kg, bought_pieces, leftover_pieces")
        .eq("dataset", dataset)
        .gte("stock_date", addDays(stockFrom, -7))
        .lte("stock_date", today)
        .order("stock_date")
        .order("ingredient_id")
        .range(from, to),
    ),
    getWasteFacts(dataset, addDays(stockFrom, -7), today),
  ]);
  if (menus.error) throw menus.error;
  if (ingredients.error) throw ingredients.error;
  if (closed.error) throw closed.error;

  return buildDashboard({
    today,
    menus: (menus.data ?? []).map((m) => ({ id: m.id as string, name: m.name as string })),
    sales: sales.map((s) => ({ date: s.sale_date, menuId: s.menu_id, qty: Number(s.qty) })),
    closedDates: (closed.data ?? []).map((c) => c.ctx_date as string),
    forecast,
    ingredients: (ingredients.data ?? []).map((i) => ({
      id: i.id as string,
      name: i.name as string,
      unit: i.unit as string,
      isChicken: Boolean(i.is_chicken),
      piecesPerKg: num(i.pieces_per_kg),
    })),
    recipes,
    bufferPct: settings.bufferPct,
    stock: stock.map((s) => ({
      date: s.stock_date,
      ingredientId: s.ingredient_id,
      boughtKg: num(s.bought_kg),
      boughtPieces: num(s.bought_pieces),
      leftover: num(s.leftover_pieces),
    })),
    waste,
  });
}

/** Pilihan dataset + angka halaman; null jika database tidak terjangkau. */
export async function loadDashboardPage(today: string) {
  try {
    const choice = await getDatasetChoice();
    const snapshot = await getDashboard(choice.dataset, today);
    return { choice, snapshot };
  } catch {
    return null;
  }
}
