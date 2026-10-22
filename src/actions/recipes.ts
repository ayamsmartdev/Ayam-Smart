"use server";

import { revalidatePath } from "next/cache";
import { cleanRecipeItems } from "@/lib/data/recipes";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";
import type { MenuActionResult as ActionResult } from "./menus";

const DB_DOWN: ActionResult = { ok: false, error: "Resep belum tersimpan karena database tidak terjangkau. Coba lagi." };

/**
 * Ganti seluruh resep satu menu.
 * Urutan aman: upsert baris baru/berubah DULU, baru hapus baris yang dibuang.
 * Jika gagal di tengah, resep lama tidak hilang (paling buruk tersisa baris lama).
 */
export async function saveRecipe(menuId: unknown, items: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) {
    return { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu ulangi." };
  }
  if (typeof menuId !== "string" || menuId.length === 0) return { ok: false, error: "Menu tidak dikenal." };
  const parsed = cleanRecipeItems(items);
  if (!parsed.ok) return parsed;

  const supabase = getSupabase();
  try {
    const [menu, ingredients] = await Promise.all([
      supabase.from("menus").select("name").eq("id", menuId).maybeSingle(),
      parsed.value.length > 0
        ? supabase.from("ingredients").select("id").in("id", parsed.value.map((i) => i.ingredientId))
        : Promise.resolve({ data: [] as { id: string }[], error: null }),
    ]);
    if (menu.error || ingredients.error) return DB_DOWN;
    if (!menu.data) return { ok: false, error: "Menu tidak ditemukan. Muat ulang halaman." };
    if ((ingredients.data ?? []).length !== parsed.value.length) {
      return { ok: false, error: "Ada bahan yang sudah dihapus. Muat ulang halaman." };
    }

    if (parsed.value.length > 0) {
      const up = await supabase.from("menu_ingredients").upsert(
        parsed.value.map((i) => ({ menu_id: menuId, ingredient_id: i.ingredientId, qty_per_portion: i.qty })),
        { onConflict: "menu_id,ingredient_id" },
      );
      if (up.error) return DB_DOWN;
    }

    let del = supabase.from("menu_ingredients").delete().eq("menu_id", menuId);
    if (parsed.value.length > 0) {
      del = del.not("ingredient_id", "in", `(${parsed.value.map((i) => i.ingredientId).join(",")})`);
    }
    const removed = await del;
    if (removed.error) return DB_DOWN;

    revalidatePath("/pengaturan");
    revalidatePath("/bahan");
    return {
      ok: true,
      message:
        parsed.value.length === 0
          ? `Resep "${menu.data.name}" dikosongkan.`
          : `Resep "${menu.data.name}" disimpan (${parsed.value.length} bahan).`,
    };
  } catch {
    return DB_DOWN;
  }
}
