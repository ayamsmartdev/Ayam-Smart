import "server-only";
import { getSupabase } from "@/lib/supabase-server";

/** Satuan yang diizinkan skema (CHECK di 0001_init.sql). Urutan = urutan di pilihan. */
export const UNITS = ["potong", "gram", "kg", "porsi", "ml", "pcs", "gelas"] as const;
export type Unit = (typeof UNITS)[number];

export type IngredientRow = {
  id: string;
  name: string;
  unit: Unit;
  /** Ayam yang dibeli per kg (D-27, D-28). */
  isChicken: boolean;
  /** Potong per kg; hanya untuk bahan yang dibeli per kg, selain itu null. */
  piecesPerKg: number | null;
  isActive: boolean;
  /** Dipakai di resep atau catatan waste → tidak bisa dihapus & satuan dikunci. */
  inUse: boolean;
};

export async function getAllIngredients(): Promise<IngredientRow[]> {
  const supabase = getSupabase();
  const [ingredients, recipes, waste] = await Promise.all([
    supabase.from("ingredients").select("id, name, unit, is_chicken, pieces_per_kg, is_active").order("name", { ascending: true }),
    supabase.from("menu_ingredients").select("ingredient_id"),
    supabase.from("food_waste").select("ingredient_id").not("ingredient_id", "is", null),
  ]);
  if (ingredients.error) throw ingredients.error;
  if (recipes.error) throw recipes.error;
  if (waste.error) throw waste.error;

  const used = new Set<string>([
    ...(recipes.data ?? []).map((r) => r.ingredient_id as string),
    ...(waste.data ?? []).map((r) => r.ingredient_id as string),
  ]);
  return (ingredients.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    isChicken: r.is_chicken,
    piecesPerKg: r.pieces_per_kg,
    isActive: r.is_active,
    inUse: used.has(r.id),
  }));
}

export type IngredientInput = { name: string; unit: Unit; isChicken: boolean; piecesPerKg: number | null };

/** Batas potong per kg (CHECK di 0003_konversi_per_bahan.sql). Bawaan 9 = dada (D-27). */
export const PIECES_PER_KG = { min: 1, max: 20, default: 9 } as const;

/** Validasi & rapikan input bahan. */
export function cleanIngredientInput(
  raw: unknown,
): { ok: true; value: IngredientInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as { name?: unknown; unit?: unknown; isChicken?: unknown; piecesPerKg?: unknown };
  const name = typeof r.name === "string" ? r.name.replace(/\s+/g, " ").trim() : "";
  if (name.length === 0) return { ok: false, error: "Nama bahan wajib diisi." };
  if (name.length > 80) return { ok: false, error: "Nama bahan maksimal 80 karakter." };
  if (typeof r.unit !== "string" || !(UNITS as readonly string[]).includes(r.unit)) {
    return { ok: false, error: "Pilih satuan dari daftar." };
  }
  const unit = r.unit as Unit;
  // "Dibeli per kg" (konversi potong → kg, D-28) hanya masuk akal untuk bahan bersatuan potong.
  const isChicken = unit === "potong" && r.isChicken === true;
  if (!isChicken) return { ok: true, value: { name, unit, isChicken, piecesPerKg: null } };

  const pieces = Number(r.piecesPerKg);
  const { min, max } = PIECES_PER_KG;
  if (!Number.isInteger(pieces) || pieces < min || pieces > max) {
    return { ok: false, error: `Potong per kg harus angka bulat ${min}–${max}.` };
  }
  return { ok: true, value: { name, unit, isChicken, piecesPerKg: pieces } };
}
