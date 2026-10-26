"use server";

import { revalidatePath } from "next/cache";
import { LIVE, parseRekapDate } from "@/lib/data/rekap";
import { getWasteOptions } from "@/lib/data/waste";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";
import { cleanWasteInput, WASTE_REASON_LABEL } from "@/lib/waste";
import { formatQuantity } from "@/lib/format";

export type WasteActionResult = { ok: true; message: string } | { ok: false; error: string; needPin?: boolean };

const NEED_PIN = { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu simpan ulang." } as const;
const DB_DOWN = { ok: false, error: "Belum tersimpan karena database tidak terjangkau. Coba lagi." } as const;

function refresh() {
  // Waste ikut dipakai Beranda (food waste & selisih stok) dan kartu stok di Bahan.
  for (const path of ["/waste", "/", "/bahan"]) revalidatePath(path);
}

/** Validasi tanggal + isi; kembalikan baris siap tulis atau pesan galat. */
async function prepare(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  const date = parseRekapDate(r.date);
  if (!date) return { ok: false as const, error: "Tanggal harus hari ini s.d. 30 hari lalu." };
  const options = await getWasteOptions();
  const clean = cleanWasteInput(raw, {
    menu: new Map(options.menus.map((m) => [m.id, m.unit])),
    bahan: new Map(options.bahan.map((b) => [b.id, b.unit])),
  });
  if (!clean.ok) return clean;
  const v = clean.value;
  const item = (v.kind === "menu" ? options.menus : options.bahan).find((x) => x.id === v.itemId)!;
  return {
    ok: true as const,
    row: {
      waste_date: date,
      menu_id: v.kind === "menu" ? v.itemId : null,
      ingredient_id: v.kind === "bahan" ? v.itemId : null,
      qty: v.qty,
      reason: v.reason,
      note: v.note,
    },
    label: `${item.name} ${formatQuantity(v.qty, item.unit)} (${WASTE_REASON_LABEL[v.reason].toLowerCase()})`,
  };
}

/** Catat food waste baru (data warung). */
export async function addWaste(raw: unknown): Promise<WasteActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  try {
    const p = await prepare(raw);
    if (!p.ok) return p;
    const { error } = await getSupabase().from("food_waste").insert({ dataset: LIVE, ...p.row });
    if (error) throw error;
    refresh();
    return { ok: true, message: `Tercatat: ${p.label}.` };
  } catch {
    return DB_DOWN;
  }
}

/** Ubah satu catatan waste (hanya data warung). */
export async function updateWaste(id: unknown, raw: unknown): Promise<WasteActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (!Number.isInteger(id) || (id as number) <= 0) return { ok: false, error: "Catatan tidak dikenal." };
  try {
    const p = await prepare(raw);
    if (!p.ok) return p;
    const { data, error } = await getSupabase()
      .from("food_waste")
      .update(p.row)
      .eq("id", id as number)
      .eq("dataset", LIVE)
      .select("id");
    if (error) throw error;
    if (!data?.length) return { ok: false, error: "Catatan sudah tidak ada. Muat ulang halaman." };
    refresh();
    return { ok: true, message: `Diubah: ${p.label}.` };
  } catch {
    return DB_DOWN;
  }
}

/** Hapus satu catatan waste (hanya data warung). */
export async function deleteWaste(id: unknown): Promise<WasteActionResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  if (!Number.isInteger(id) || (id as number) <= 0) return { ok: false, error: "Catatan tidak dikenal." };
  try {
    const { data, error } = await getSupabase()
      .from("food_waste")
      .delete()
      .eq("id", id as number)
      .eq("dataset", LIVE)
      .select("id");
    if (error) throw error;
    if (!data?.length) return { ok: false, error: "Catatan sudah tidak ada. Muat ulang halaman." };
    refresh();
    return { ok: true, message: "Catatan waste dihapus." };
  } catch {
    return DB_DOWN;
  }
}
