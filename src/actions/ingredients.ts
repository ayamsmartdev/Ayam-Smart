"use server";

import { revalidatePath } from "next/cache";
import { cleanIngredientInput } from "@/lib/data/ingredients";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";
import type { MenuActionResult as ActionResult } from "./menus";

const NEED_PIN: ActionResult = { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu ulangi." };
const DB_DOWN: ActionResult = { ok: false, error: "Database tidak terjangkau. Coba lagi sebentar." };

function pgCode(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

function done(message: string): ActionResult {
  revalidatePath("/pengaturan");
  revalidatePath("/waste");
  return { ok: true, message };
}

export async function createIngredient(input: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  const parsed = cleanIngredientInput(input);
  if (!parsed.ok) return parsed;
  const { name, unit, isChicken, piecesPerKg } = parsed.value;

  const { error } = await getSupabase()
    .from("ingredients")
    .insert({ name, unit, is_chicken: isChicken, pieces_per_kg: piecesPerKg });
  if (pgCode(error) === "23505") return { ok: false, error: `Bahan "${name}" sudah ada.` };
  if (error) return DB_DOWN;
  return done(`Bahan "${name}" ditambahkan.`);
}

export async function updateIngredient(id: unknown, input: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string" || id.length === 0) return { ok: false, error: "Bahan tidak dikenal." };
  const parsed = cleanIngredientInput(input);
  if (!parsed.ok) return parsed;
  const { name, unit, isChicken, piecesPerKg } = parsed.value;
  const supabase = getSupabase();

  // Satuan dikunci jika sudah dipakai: takaran lama (mis. 25 gram) akan salah arti setelah jadi kg.
  const current = await supabase.from("ingredients").select("unit").eq("id", id).maybeSingle();
  if (current.error) return DB_DOWN;
  if (!current.data) return { ok: false, error: "Bahan tidak ditemukan. Muat ulang halaman." };
  if (current.data.unit !== unit) {
    const [rec, waste] = await Promise.all([
      supabase.from("menu_ingredients").select("menu_id", { count: "exact", head: true }).eq("ingredient_id", id),
      supabase.from("food_waste").select("id", { count: "exact", head: true }).eq("ingredient_id", id),
    ]);
    if (rec.error || waste.error) return DB_DOWN;
    if ((rec.count ?? 0) > 0 || (waste.count ?? 0) > 0) {
      return {
        ok: false,
        error: `Satuan tidak bisa diubah karena bahan ini sudah dipakai di resep atau catatan waste. Tetap "${current.data.unit}".`,
      };
    }
  }

  const { error } = await supabase
    .from("ingredients")
    .update({ name, unit, is_chicken: isChicken, pieces_per_kg: piecesPerKg })
    .eq("id", id);
  if (pgCode(error) === "23505") return { ok: false, error: `Bahan "${name}" sudah ada.` };
  if (error) return DB_DOWN;
  return done("Perubahan bahan disimpan.");
}

export async function setIngredientActive(id: unknown, active: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string" || typeof active !== "boolean") return { ok: false, error: "Data tidak valid." };
  const { data, error } = await getSupabase().from("ingredients").update({ is_active: active }).eq("id", id).select("name");
  if (error) return DB_DOWN;
  if (!data || data.length === 0) return { ok: false, error: "Bahan tidak ditemukan. Muat ulang halaman." };
  return done(active ? `"${data[0].name}" aktif lagi.` : `"${data[0].name}" dinonaktifkan.`);
}

export async function deleteIngredient(id: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string") return { ok: false, error: "Data tidak valid." };
  const { data, error } = await getSupabase().from("ingredients").delete().eq("id", id).select("name");
  if (pgCode(error) === "23503") {
    return {
      ok: false,
      error: "Bahan ini dipakai di resep, catatan waste, atau catatan stok, jadi tidak bisa dihapus. Nonaktifkan saja.",
    };
  }
  if (error) return DB_DOWN;
  if (!data || data.length === 0) return { ok: false, error: "Bahan tidak ditemukan. Muat ulang halaman." };
  return done(`Bahan "${data[0].name}" dihapus.`);
}
