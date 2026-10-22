"use server";

import { revalidatePath } from "next/cache";
import { cleanSettingsInput, settingsRows } from "@/lib/data/settings";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";
import type { MenuActionResult as ActionResult } from "./menus";

export async function saveSettings(input: unknown): Promise<ActionResult> {
  if (!(await isPinVerified())) {
    return { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu ulangi." };
  }
  const parsed = cleanSettingsInput(input);
  if (!parsed.ok) return parsed;

  const { error } = await getSupabase().from("settings").upsert(settingsRows(parsed.value), { onConflict: "key" });
  if (error) return { ok: false, error: "Setelan belum tersimpan karena database tidak terjangkau. Coba lagi." };

  revalidatePath("/pengaturan");
  revalidatePath("/bahan");
  return {
    ok: true,
    message: `Setelan disimpan: cadangan ${parsed.value.bufferPct}%, 1 ekor = ${parsed.value.piecesPerChicken} potong.`,
  };
}
