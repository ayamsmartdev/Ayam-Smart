import "server-only";
import { cookies } from "next/headers";
import { addDays, todayWIB } from "@/lib/date";
import { getSupabase } from "@/lib/supabase-server";

/**
 * Mode data yang ditampilkan Beranda/Prediksi/Bahan (F9, D-32).
 * - Cookie `as_dataset` = pilihan pengguna ("demo" atau "live").
 * - Tanpa cookie: otomatis `live` jika data warung sudah ≥ 14 hari dalam 60 hari terakhir, selain itu `demo`.
 * Rekap & stok selalu menulis `live`; mode ini hanya mengatur apa yang DITAMPILKAN.
 */
export type Dataset = "demo" | "live";
export const DATASET_COOKIE = "as_dataset";
/** Minimal hari data warung agar mode otomatis memilih `live` (sama dengan ambang uji akurasi, §6.3). */
export const LIVE_MIN_DAYS = 14;
const LOOKBACK_DAYS = 60;

export type DatasetChoice = {
  dataset: Dataset;
  /** True jika dipilih otomatis (pengguna belum memilih). */
  auto: boolean;
  /** Jumlah hari berisi rekap warung dalam 60 hari terakhir. */
  liveDays: number;
};

export function parseDataset(value: unknown): Dataset | null {
  return value === "demo" || value === "live" ? value : null;
}

async function countLiveDays(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("daily_sales")
    .select("sale_date")
    .eq("dataset", "live")
    .gte("sale_date", addDays(todayWIB(), -LOOKBACK_DAYS))
    .gt("qty", 0)
    .limit(1000);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.sale_date as string)).size;
}

export async function getDatasetChoice(): Promise<DatasetChoice> {
  const chosen = parseDataset((await cookies()).get(DATASET_COOKIE)?.value);
  const liveDays = await countLiveDays();
  if (chosen) return { dataset: chosen, auto: false, liveDays };
  return { dataset: liveDays >= LIVE_MIN_DAYS ? "live" : "demo", auto: true, liveDays };
}
