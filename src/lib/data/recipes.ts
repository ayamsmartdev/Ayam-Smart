import "server-only";
import { getSupabase } from "@/lib/supabase-server";

export type RecipeItem = { ingredientId: string; qty: number };

/** Semua resep: menuId → daftar bahan per porsi. */
export async function getRecipes(): Promise<Record<string, RecipeItem[]>> {
  const { data, error } = await getSupabase()
    .from("menu_ingredients")
    .select("menu_id, ingredient_id, qty_per_portion");
  if (error) throw error;
  const byMenu: Record<string, RecipeItem[]> = {};
  for (const r of data ?? []) {
    (byMenu[r.menu_id] ??= []).push({ ingredientId: r.ingredient_id, qty: Number(r.qty_per_portion) });
  }
  return byMenu;
}

export const RECIPE_QTY_MAX = 100_000;
export const RECIPE_MAX_ITEMS = 30;

/**
 * Validasi isi resep. Takaran > 0, maksimal 2 desimal (kolom numeric(10,2)),
 * satu bahan hanya sekali per resep.
 */
export function cleanRecipeItems(raw: unknown): { ok: true; value: RecipeItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "Data resep tidak valid." };
  if (raw.length > RECIPE_MAX_ITEMS) return { ok: false, error: `Maksimal ${RECIPE_MAX_ITEMS} bahan per menu.` };

  const seen = new Set<string>();
  const items: RecipeItem[] = [];
  for (const it of raw as { ingredientId?: unknown; qty?: unknown }[]) {
    if (typeof it?.ingredientId !== "string" || it.ingredientId.length === 0) {
      return { ok: false, error: "Ada baris yang bahannya belum dipilih." };
    }
    if (seen.has(it.ingredientId)) return { ok: false, error: "Satu bahan hanya boleh muncul sekali dalam resep." };
    seen.add(it.ingredientId);

    const qty = typeof it.qty === "number" ? it.qty : Number(String(it.qty ?? "").replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0 || qty > RECIPE_QTY_MAX) {
      return { ok: false, error: "Takaran harus angka lebih dari 0." };
    }
    items.push({ ingredientId: it.ingredientId, qty: Math.round(qty * 100) / 100 });
  }
  if (items.some((i) => i.qty === 0)) return { ok: false, error: "Takaran terlalu kecil (minimal 0,01)." };
  return { ok: true, value: items };
}
