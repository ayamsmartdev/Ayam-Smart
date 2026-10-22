"use server";

import { revalidatePath } from "next/cache";
import { cleanMenuInput, getAllMenus } from "@/lib/data/menus";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";

export type MenuActionResult = { ok: true; message: string } | { ok: false; error: string; needPin?: boolean };

const NEED_PIN: MenuActionResult = {
  ok: false,
  needPin: true,
  error: "Sesi PIN habis. Masukkan PIN lagi lalu ulangi.",
};
const DB_DOWN: MenuActionResult = { ok: false, error: "Database tidak terjangkau. Coba lagi sebentar." };

/** Kode error PostgreSQL yang dikembalikan Supabase. */
function pgCode(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

function done(message: string): MenuActionResult {
  revalidatePath("/pengaturan");
  revalidatePath("/rekap");
  return { ok: true, message };
}

export async function createMenu(input: unknown): Promise<MenuActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  const parsed = cleanMenuInput(input);
  if (!parsed.ok) return parsed;

  try {
    const menus = await getAllMenus();
    const nextOrder = menus.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1;
    const { error } = await getSupabase()
      .from("menus")
      .insert({ name: parsed.value.name, price: parsed.value.price, sort_order: nextOrder });
    if (pgCode(error) === "23505") return { ok: false, error: `Menu "${parsed.value.name}" sudah ada.` };
    if (error) return DB_DOWN;
    return done(`Menu "${parsed.value.name}" ditambahkan.`);
  } catch {
    return DB_DOWN;
  }
}

export async function updateMenu(id: unknown, input: unknown): Promise<MenuActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string" || id.length === 0) return { ok: false, error: "Menu tidak dikenal." };
  const parsed = cleanMenuInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await getSupabase()
    .from("menus")
    .update({ name: parsed.value.name, price: parsed.value.price })
    .eq("id", id)
    .select("id");
  if (pgCode(error) === "23505") return { ok: false, error: `Menu "${parsed.value.name}" sudah ada.` };
  if (error) return DB_DOWN;
  if (!data || data.length === 0) return { ok: false, error: "Menu tidak ditemukan. Muat ulang halaman." };
  return done("Perubahan menu disimpan.");
}

export async function setMenuActive(id: unknown, active: unknown): Promise<MenuActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string" || typeof active !== "boolean") return { ok: false, error: "Data tidak valid." };

  const { data, error } = await getSupabase().from("menus").update({ is_active: active }).eq("id", id).select("name");
  if (error) return DB_DOWN;
  if (!data || data.length === 0) return { ok: false, error: "Menu tidak ditemukan. Muat ulang halaman." };
  return done(active ? `"${data[0].name}" aktif lagi di Rekap.` : `"${data[0].name}" disembunyikan dari Rekap.`);
}

/** Tukar urutan dengan menu di atas/bawahnya. */
export async function moveMenu(id: unknown, direction: unknown): Promise<MenuActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string" || (direction !== "up" && direction !== "down")) {
    return { ok: false, error: "Data tidak valid." };
  }
  try {
    const menus = await getAllMenus();
    const i = menus.findIndex((m) => m.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= menus.length) return { ok: true, message: "Urutan tidak berubah." };

    // Normalisasi urutan 0..n-1 lalu tukar dua posisi; aman walau sort_order lama ada yang sama.
    const order = menus.map((m) => m.id);
    [order[i], order[j]] = [order[j], order[i]];
    const supabase = getSupabase();
    const results = await Promise.all(
      order.map((menuId, idx) =>
        menus.find((m) => m.id === menuId)?.sortOrder === idx
          ? Promise.resolve({ error: null })
          : supabase.from("menus").update({ sort_order: idx }).eq("id", menuId),
      ),
    );
    if (results.some((r) => r.error)) return DB_DOWN;
    return done("Urutan menu disimpan.");
  } catch {
    return DB_DOWN;
  }
}

/** Hanya untuk menu yang belum pernah dipakai; menu dengan riwayat cukup dinonaktifkan. */
export async function deleteMenu(id: unknown): Promise<MenuActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (typeof id !== "string") return { ok: false, error: "Data tidak valid." };

  const { data, error } = await getSupabase().from("menus").delete().eq("id", id).select("name");
  if (pgCode(error) === "23503") {
    return {
      ok: false,
      error: "Menu ini sudah punya riwayat rekap atau waste, jadi tidak bisa dihapus. Nonaktifkan saja.",
    };
  }
  if (error) return DB_DOWN;
  if (!data || data.length === 0) return { ok: false, error: "Menu tidak ditemukan. Muat ulang halaman." };
  return done(`Menu "${data[0].name}" dihapus.`);
}
