"use server";

import { revalidatePath } from "next/cache";
import { type Dataset, runForecast } from "@/lib/forecast-client";
import { isPinVerified } from "@/lib/pin";

export type RecalculateResult = { ok: true; message: string } | { ok: false; error: string; needPin?: boolean };

/** Tombol "Hitung ulang": hitung forecast lagi dari data yang sudah tersimpan (T-18). */
export async function recalculateForecast(dataset: unknown = "live"): Promise<RecalculateResult> {
  // Menulis forecast_runs/forecasts → wajib cek PIN seperti action tulis lain.
  if (!(await isPinVerified())) {
    return { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu coba lagi." };
  }
  if (dataset !== "live" && dataset !== "demo") return { ok: false, error: "Dataset tidak dikenal." };
  const outcome = await runForecast(dataset as Dataset);
  for (const path of ["/rekap", "/", "/prediksi", "/bahan"]) revalidatePath(path);
  return outcome.ok ? { ok: true, message: outcome.message } : { ok: false, error: outcome.error };
}
