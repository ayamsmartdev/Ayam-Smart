import "server-only";
import { addDays } from "@/lib/date";
import type { Dataset } from "@/lib/dataset";
import { getSupabase } from "@/lib/supabase-server";
import type { WasteFact, WasteKind, WasteReason } from "@/lib/waste";

/** Batas tanggal catatan waste sama dengan rekap: hari ini s.d. 30 hari lalu (WIB). */
export const WASTE_HISTORY_DAYS = 30;

export type WasteItemOption = { id: string; name: string; unit: string; isChicken: boolean; isActive: boolean };

export type WasteRow = WasteFact & {
  id: number;
  kind: WasteKind;
  itemId: string;
  itemName: string;
  unit: string;
  reason: WasteReason;
  note: string | null;
};

/** Kategori menu & bahan untuk pilihan form (aktif dulu; nonaktif tetap ada agar catatan lama bisa diubah). */
export async function getWasteOptions(): Promise<{ menus: WasteItemOption[]; bahan: WasteItemOption[] }> {
  const supabase = getSupabase();
  const [menus, ingredients] = await Promise.all([
    supabase.from("menus").select("id, name, is_active").order("sort_order").order("name"),
    supabase.from("ingredients").select("id, name, unit, is_chicken, is_active").order("name"),
  ]);
  if (menus.error) throw menus.error;
  if (ingredients.error) throw ingredients.error;
  return {
    menus: (menus.data ?? []).map((m) => ({
      id: m.id as string,
      name: m.name as string,
      unit: "porsi",
      isChicken: false,
      isActive: Boolean(m.is_active),
    })),
    bahan: (ingredients.data ?? []).map((i) => ({
      id: i.id as string,
      name: i.name as string,
      unit: i.unit as string,
      isChicken: Boolean(i.is_chicken),
      isActive: Boolean(i.is_active),
    })),
  };
}

/** Catatan waste satu dataset dalam rentang tanggal, terbaru dulu. */
export async function getWasteRows(
  dataset: Dataset,
  from: string,
  to: string,
  options: { menus: WasteItemOption[]; bahan: WasteItemOption[] },
): Promise<WasteRow[]> {
  const { data, error } = await getSupabase()
    .from("food_waste")
    .select("id, waste_date, menu_id, ingredient_id, qty, reason, note, created_at")
    .eq("dataset", dataset)
    .gte("waste_date", from)
    .lte("waste_date", to)
    .order("waste_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const menuBy = new Map(options.menus.map((m) => [m.id, m]));
  const bahanBy = new Map(options.bahan.map((b) => [b.id, b]));
  return (data ?? []).map((r) => {
    const isMenu = r.menu_id !== null;
    const item = isMenu ? menuBy.get(r.menu_id as string) : bahanBy.get(r.ingredient_id as string);
    return {
      id: Number(r.id),
      date: r.waste_date as string,
      menuId: (r.menu_id as string | null) ?? null,
      ingredientId: (r.ingredient_id as string | null) ?? null,
      qty: Number(r.qty),
      kind: isMenu ? "menu" : "bahan",
      itemId: (isMenu ? r.menu_id : r.ingredient_id) as string,
      itemName: item?.name ?? "(item terhapus)",
      unit: item?.unit ?? "",
      reason: r.reason as WasteReason,
      note: (r.note as string | null) ?? null,
    };
  });
}

/** Waste untuk hitungan (tanpa nama), mis. Beranda & kartu stok. */
export async function getWasteFacts(dataset: Dataset, from: string, to: string): Promise<WasteFact[]> {
  const { data, error } = await getSupabase()
    .from("food_waste")
    .select("waste_date, menu_id, ingredient_id, qty")
    .eq("dataset", dataset)
    .gte("waste_date", from)
    .lte("waste_date", to)
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.waste_date as string,
    menuId: (r.menu_id as string | null) ?? null,
    ingredientId: (r.ingredient_id as string | null) ?? null,
    qty: Number(r.qty),
  }));
}

export const wasteWindow = (today: string) => ({ from: addDays(today, -WASTE_HISTORY_DAYS), to: today });
