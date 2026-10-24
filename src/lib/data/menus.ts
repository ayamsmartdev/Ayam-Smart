import "server-only";
import { getSupabase } from "@/lib/supabase-server";

/** Satu baris tabel `menus` = satu kategori menu (D-26). */
export type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  isActive: boolean;
  sortOrder: number;
};

/** Semua kategori (aktif & nonaktif), urut sesuai tampilan di Rekap. */
export async function getAllMenus(): Promise<MenuRow[]> {
  const { data, error } = await getSupabase()
    .from("menus")
    .select("id, name, description, price, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }));
}

export type MenuInput = { name: string; description: string | null; price: number | null };

export const MENU_NAME_MAX = 80;
export const MENU_DESCRIPTION_MAX = 200;
export const MENU_PRICE_MAX = 10_000_000;

const collapse = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Validasi & rapikan input kategori. Mengembalikan pesan error atau data bersih. */
export function cleanMenuInput(raw: unknown): { ok: true; value: MenuInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as { name?: unknown; description?: unknown; price?: unknown };
  const name = collapse(r.name);
  if (name.length === 0) return { ok: false, error: "Nama kategori wajib diisi." };
  if (name.length > MENU_NAME_MAX) return { ok: false, error: `Nama kategori maksimal ${MENU_NAME_MAX} karakter.` };

  const descriptionText = collapse(r.description);
  if (descriptionText.length > MENU_DESCRIPTION_MAX) {
    return { ok: false, error: `Isi varian maksimal ${MENU_DESCRIPTION_MAX} karakter.` };
  }
  const description = descriptionText.length > 0 ? descriptionText : null;

  let price: number | null = null;
  if (r.price !== null && r.price !== undefined && r.price !== "") {
    const n = typeof r.price === "number" ? r.price : Number(String(r.price).replace(/\D/g, ""));
    if (!Number.isInteger(n) || n < 0 || n > MENU_PRICE_MAX) {
      return { ok: false, error: "Harga harus angka bulat dalam rupiah, atau dikosongkan." };
    }
    price = n;
  }
  return { ok: true, value: { name, description, price } };
}
