"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DATASET_COOKIE, parseDataset } from "@/lib/dataset";

/**
 * Ganti mode tampilan simulasi / data warung (D-32).
 * Tanpa cek PIN: hanya menyimpan pilihan tampilan di cookie browser ini, tidak menulis database.
 * "auto" menghapus pilihan sehingga mode kembali ditentukan otomatis.
 */
export async function setDataset(mode: unknown): Promise<{ ok: boolean }> {
  const store = await cookies();
  if (mode === "auto") {
    store.delete(DATASET_COOKIE);
  } else {
    const dataset = parseDataset(mode);
    if (!dataset) return { ok: false };
    store.set(DATASET_COOKIE, dataset, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  for (const path of ["/", "/prediksi", "/bahan"]) revalidatePath(path);
  return { ok: true };
}
