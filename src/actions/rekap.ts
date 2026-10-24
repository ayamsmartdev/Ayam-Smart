"use server";

import {
  cleanStockInput,
  getActiveMenus,
  getStockIngredients,
  LIVE,
  parseRekapDate,
  type StockInputItem,
} from "@/lib/data/rekap";
import { isPinVerified } from "@/lib/pin";
import { getSupabase } from "@/lib/supabase-server";

export type SaveRekapInput = {
  date: string;
  closed: boolean;
  items: { menuId: string; qty: number }[];
  /** Stok per bahan yang dibeli per kg; opsional (D-26, D-28). */
  stock?: StockInputItem[];
};

export type SaveRekapResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string; needPin?: boolean };

const MAX_QTY = 9999;

/**
 * Simpan rekap satu tanggal sebagai data nyata.
 * - Buka: semua menu aktif di-upsert, termasuk yang 0 (0 = terjual nol, bukan "belum direkap").
 * - Tutup: rekap & stok tanggal itu dihapus dan ditandai 'tutup' (dikeluarkan dari prediksi).
 * - Stok: baris diisi di-upsert; baris dikosongkan dihapus. Divalidasi sebelum ada yang ditulis.
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
      const delStock = await supabase.from("daily_stock").delete().eq("dataset", LIVE).eq("stock_date", date);
      if (delStock.error) throw delStock.error;
      const ctx = await supabase
        .from("daily_context")
        .upsert({ dataset: LIVE, ctx_date: date, tag: "tutup", note: null }, { onConflict: "dataset,ctx_date" });
      if (ctx.error) throw ctx.error;
      return { ok: true, savedAt: new Date().toISOString() };
    }

    const [menus, stockIngredients] = await Promise.all([getActiveMenus(), getStockIngredients()]);
    const stock = cleanStockInput(input.stock, new Set(stockIngredients.map((i) => i.id)));
    if (!stock.ok) return stock;
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

    if (stock.upserts.length > 0) {
      const stockRows = stock.upserts.map((s) => ({
        dataset: LIVE,
        stock_date: date,
        ingredient_id: s.ingredientId,
        prepared_pieces: s.prepared,
        leftover_pieces: s.leftover,
      }));
      const upStock = await supabase
        .from("daily_stock")
        .upsert(stockRows, { onConflict: "dataset,stock_date,ingredient_id" });
      if (upStock.error) throw upStock.error;
    }
    if (stock.clearIds.length > 0) {
      const clear = await supabase
        .from("daily_stock")
        .delete()
        .eq("dataset", LIVE)
        .eq("stock_date", date)
        .in("ingredient_id", stock.clearIds);
      if (clear.error) throw clear.error;
    }

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
