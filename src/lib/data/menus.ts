import "server-only";
import { getSupabase } from "@/lib/supabase-server";

export type MenuRow = {
  id: string;
  name: string;
  price: number | null;
  isActive: boolean;
  sortOrder: number;
};

/** Semua menu (aktif & nonaktif), urut sesuai tampilan di Rekap. */
export async function getAllMenus(): Promise<MenuRow[]> {
  const { data, error } = await getSupabase()
    .from("menus")
    .select("id, name, price, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }));
}

export type MenuInput = { name: string; price: number | null };

export const MENU_NAME_MAX = 80;
export const MENU_PRICE_MAX = 10_000_000;

/** Validasi & rapikan input menu. Mengembalikan pesan error atau data bersih. */
export function cleanMenuInput(raw: unknown): { ok: true; value: MenuInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as { name?: unknown; price?: unknown };
  const name = typeof r.name === "string" ? r.name.replace(/\s+/g, " ").trim() : "";
  if (name.length === 0) return { ok: false, error: "Nama menu wajib diisi." };
  if (name.length > MENU_NAME_MAX) return { ok: false, error: `Nama menu maksimal ${MENU_NAME_MAX} karakter.` };

  let price: number | null = null;
  if (r.price !== null && r.price !== undefined && r.price !== "") {
    const n = typeof r.price === "number" ? r.price : Number(String(r.price).replace(/\D/g, ""));
    if (!Number.isInteger(n) || n < 0 || n > MENU_PRICE_MAX) {
      return { ok: false, error: "Harga harus angka bulat dalam rupiah, atau dikosongkan." };
    }
    price = n;
  }
  return { ok: true, value: { name, price } };
}
