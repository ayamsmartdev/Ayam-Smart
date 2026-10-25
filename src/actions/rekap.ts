"use server";

import { revalidatePath } from "next/cache";
import { getActiveMenus, getStockIngredients, LIVE, parseRekapDate } from "@/lib/data/rekap";
import { runForecast } from "@/lib/forecast-client";
import { isPinVerified } from "@/lib/pin";
import { cleanStockInput, type StockInputItem } from "@/lib/stock";
import { getSupabase } from "@/lib/supabase-server";

export type SaveRekapInput = {
  date: string;
  closed: boolean;
  items: { menuId: string; qty: number }[];
  /** Stok (belanja/sisa) per bahan; opsional, ikut disimpan bila dikirim (D-29). */
  stock?: StockInputItem[];
};

export type SaveRekapResult =
  | { ok: true; savedAt: string; forecast?: { ok: boolean; message: string } }
  | { ok: false; error: string; needPin?: boolean };

const MAX_QTY = 9999;
const NEED_PIN = { ok: false, needPin: true, error: "Sesi PIN habis. Masukkan PIN lagi lalu simpan ulang." } as const;
const DB_DOWN = { ok: false, error: "Belum tersimpan karena database tidak terjangkau. Coba lagi." } as const;

type Supabase = ReturnType<typeof getSupabase>;
type CleanStock = Extract<ReturnType<typeof cleanStockInput>, { ok: true }>;

/** Tulis stok yang sudah divalidasi: baris terisi di-upsert, baris dikosongkan dihapus. */
async function writeStock(supabase: Supabase, date: string, stock: CleanStock) {
  if (stock.upserts.length > 0) {
    const rows = stock.upserts.map((s) => ({
      dataset: LIVE,
      stock_date: date,
      ingredient_id: s.ingredientId,
      bought_kg: s.boughtKg,
      bought_pieces: s.boughtPieces,
      leftover_pieces: s.leftover,
    }));
    const up = await supabase.from("daily_stock").upsert(rows, { onConflict: "dataset,stock_date,ingredient_id" });
    if (up.error) throw up.error;
  }
  if (stock.clearIds.length > 0) {
    const del = await supabase
      .from("daily_stock")
      .delete()
      .eq("dataset", LIVE)
      .eq("stock_date", date)
      .in("ingredient_id", stock.clearIds);
    if (del.error) throw del.error;
  }
}

/**
 * Hitung ulang prediksi setelah rekap tersimpan (T-18). Gagal di sini TIDAK membatalkan rekap:
 * rekap sudah aman di database, pengguna cukup menekan "Hitung ulang".
 */
async function refreshForecast(): Promise<{ ok: boolean; message: string }> {
  const outcome = await runForecast(LIVE);
  return outcome.ok ? { ok: true, message: outcome.message } : { ok: false, message: outcome.error };
}

async function validStock(date: string, raw: unknown) {
  const ingredients = await getStockIngredients(date);
  return cleanStockInput(raw, new Set(ingredients.map((i) => i.id)));
}

/**
 * Simpan stok saja (belanja pagi/siang atau sisa saat tutup), terpisah dari rekap porsi (D-29).
 */
export async function saveStock(input: { date: string; stock: StockInputItem[] }): Promise<SaveRekapResult> {
  if (!(await isPinVerified())) return NEED_PIN;
  const date = parseRekapDate(input?.date);
  if (!date) return { ok: false, error: "Tanggal tidak valid atau lebih dari 30 hari lalu." };
  try {
    const stock = await validStock(date, input.stock);
    if (!stock.ok) return stock;
    await writeStock(getSupabase(), date, stock);
    revalidatePath("/rekap");
    return { ok: true, savedAt: new Date().toISOString() };
  } catch {
    return DB_DOWN;
  }
}

/**
 * Simpan rekap satu tanggal sebagai data nyata.
 * - Buka: semua kategori aktif di-upsert, termasuk yang 0 (0 = terjual nol, bukan "belum direkap").
 * - Tutup: rekap porsi tanggal itu dihapus dan ditandai 'tutup' (dikeluarkan dari prediksi).
 *   Stok TIDAK dihapus: isi freezer tetap ada walau warung tutup (D-29).
 * - Stok (jika dikirim) divalidasi sebelum ada yang ditulis, lalu ikut disimpan.
 * - Setelah tersimpan, prediksi dihitung ulang; hasilnya dilaporkan di `forecast` (§5).
 */
export async function saveRekap(input: SaveRekapInput): Promise<SaveRekapResult> {
  // Wajib di setiap Server Action tulis — jangan hanya mengandalkan proxy.ts.
  if (!(await isPinVerified())) return NEED_PIN;

  const date = parseRekapDate(input?.date);
  if (!date) return { ok: false, error: "Tanggal tidak valid atau lebih dari 30 hari lalu." };
  if (typeof input.closed !== "boolean" || !Array.isArray(input.items)) {
    return { ok: false, error: "Data rekap tidak lengkap." };
  }

  const supabase = getSupabase();

  try {
    const stock = await validStock(date, input.stock);
    if (!stock.ok) return stock;

    if (input.closed) {
      const del = await supabase.from("daily_sales").delete().eq("dataset", LIVE).eq("sale_date", date);
      if (del.error) throw del.error;
      const ctx = await supabase
        .from("daily_context")
        .upsert({ dataset: LIVE, ctx_date: date, tag: "tutup", note: null }, { onConflict: "dataset,ctx_date" });
      if (ctx.error) throw ctx.error;
      await writeStock(supabase, date, stock);
      return { ok: true, savedAt: new Date().toISOString(), forecast: await refreshForecast() };
    }

    const menus = await getActiveMenus();
    const activeIds = new Set(menus.map((m) => m.id));
    const byMenu = new Map<string, number>();
    for (const item of input.items) {
      const qty = item?.qty;
      if (!activeIds.has(item?.menuId)) {
        return { ok: false, error: "Ada kategori yang tidak dikenal atau sudah nonaktif. Muat ulang halaman." };
      }
      if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
        return { ok: false, error: `Jumlah porsi harus angka bulat 0–${MAX_QTY}.` };
      }
      byMenu.set(item.menuId, qty);
    }
    if (menus.length === 0) return { ok: false, error: "Belum ada kategori aktif. Tambahkan kategori dulu." };
    if ([...byMenu.values()].reduce((a, b) => a + b, 0) === 0) {
      return { ok: false, error: "Semua jumlah masih 0. Jika warung tutup, aktifkan Warung tutup." };
    }

    // Kategori aktif yang tidak dikirim dianggap 0, supaya rekap satu hari selalu lengkap.
    const rows = menus.map((m) => ({ dataset: LIVE, sale_date: date, menu_id: m.id, qty: byMenu.get(m.id) ?? 0 }));
    const up = await supabase.from("daily_sales").upsert(rows, { onConflict: "dataset,sale_date,menu_id" });
    if (up.error) throw up.error;

    await writeStock(supabase, date, stock);

    // Hari ini buka → hapus tanda 'tutup' bila sebelumnya ada (tanda lain dibiarkan).
    const reopen = await supabase
      .from("daily_context")
      .delete()
      .eq("dataset", LIVE)
      .eq("ctx_date", date)
      .eq("tag", "tutup");
    if (reopen.error) throw reopen.error;

    return { ok: true, savedAt: new Date().toISOString(), forecast: await refreshForecast() };
  } catch {
    return DB_DOWN;
  }
}
