"use server";

import { getActiveMenus, LIVE, parseRekapDate } from "@/lib/data/rekap";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";

export type SaveRekapInput = {
  date: string;
  closed: boolean;
  items: { menuId: string; qty: number }[];
};

export type SaveRekapResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string; needPin?: boolean };

const MAX_QTY = 9999;

/**
 * Simpan rekap satu tanggal sebagai data nyata.
 * - Buka: semua menu aktif di-upsert, termasuk yang 0 (0 = terjual nol, bukan "belum direkap").
 * - Tutup: rekap tanggal itu dihapus dan ditandai 'tutup' (dikeluarkan dari prediksi).
 */
export async function saveRekap(input: SaveRekapInput): Promise<SaveRekapResult> {
  // Wajib di setiap Server Action tulis — jangan hanya mengandalkan proxy.ts.
  if (!(await isPinVerified())) {
    return { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu simpan ulang." };
  }

  const date = parseRekapDate(input?.date);
  if (!date) return { ok: false, error: "Tanggal tidak valid atau lebih dari 30 hari lalu." };
  if (typeof input.closed !== "boolean" || !Array.isArray(input.items)) {
    return { ok: false, error: "Data rekap tidak lengkap." };
  }

  const supabase = getSupabase();

  try {
    if (input.closed) {
      const del = await supabase.from("daily_sales").delete().eq("dataset", LIVE).eq("sale_date", date);
      if (del.error) throw del.error;
      const ctx = await supabase
        .from("daily_context")
        .upsert({ dataset: LIVE, ctx_date: date, tag: "tutup", note: null }, { onConflict: "dataset,ctx_date" });
      if (ctx.error) throw ctx.error;
      return { ok: true, savedAt: new Date().toISOString() };
    }

    const menus = await getActiveMenus();
    const activeIds = new Set(menus.map((m) => m.id));
    const byMenu = new Map<string, number>();
    for (const item of input.items) {
      const qty = item?.qty;
      if (!activeIds.has(item?.menuId)) return { ok: false, error: "Ada menu yang tidak dikenal atau sudah nonaktif. Muat ulang halaman." };
      if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
        return { ok: false, error: `Jumlah porsi harus angka bulat 0–${MAX_QTY}.` };
      }
      byMenu.set(item.menuId, qty);
    }
    if (menus.length === 0) return { ok: false, error: "Belum ada menu aktif. Tambahkan menu dulu." };
    if ([...byMenu.values()].reduce((a, b) => a + b, 0) === 0) {
      return { ok: false, error: "Semua jumlah masih 0. Jika warung tutup, aktifkan Warung tutup." };
    }

    // Menu aktif yang tidak dikirim dianggap 0, supaya rekap satu hari selalu lengkap.
    const rows = menus.map((m) => ({ dataset: LIVE, sale_date: date, menu_id: m.id, qty: byMenu.get(m.id) ?? 0 }));
    const up = await supabase.from("daily_sales").upsert(rows, { onConflict: "dataset,sale_date,menu_id" });
    if (up.error) throw up.error;

    // Hari ini buka → hapus tanda 'tutup' bila sebelumnya ada (tanda lain dibiarkan).
    const reopen = await supabase
      .from("daily_context")
      .delete()
      .eq("dataset", LIVE)
      .eq("ctx_date", date)
      .eq("tag", "tutup");
    if (reopen.error) throw reopen.error;

    return { ok: true, savedAt: new Date().toISOString() };
  } catch {
    return { ok: false, error: "Rekap belum tersimpan karena database tidak terjangkau. Coba lagi." };
  }
}
