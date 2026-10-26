/**
 * Rekomendasi bahan baku (ARCHITECTURE §7, D-27, D-28):
 *   kebutuhan(i)   = Σ_kategori prediksi(kategori) × resep(kategori, i)
 *   rekomendasi(i) = ceil(kebutuhan(i) × (1 + buffer%/100))
 *   beli(i) kg     = ceil_0,5( max(0, rekomendasi(i) − sisa freezer(i)) / potong per kg(i) )
 *                    hanya untuk bahan yang dibeli per kg (ayam); tiap bahan punya angkanya sendiri.
 * Prediksi tidak dibulatkan sebelum dikalikan resep.
 */
/** Bahan untuk hitungan kebutuhan; `piecesPerKg` hanya untuk bahan yang dibeli per kg (D-28). */
export type Ingredient = { id: string; name: string; unit: string; isChicken: boolean; piecesPerKg?: number | null };
export type RecipeItem = { menuId: string; ingredientId: string; qtyPerPortion: number };

export type IngredientNeed = {
  ingredient: Ingredient;
  need: number;
  recommended: number;
  /** Sisa di freezer yang dikurangkan (potong); 0 untuk bahan yang tidak dibeli per kg. */
  stockUsed: number;
  /** Jumlah yang perlu dibeli (kg, kelipatan 0,5); null untuk bahan yang tidak dibeli per kg. */
  buyKg: number | null;
};

// Toleransi pembulatan: 1800 × 1,1 di JavaScript = 1980,0000000000002, jangan sampai jadi 1981.
const EPS = 1e-9;

/** Dibulatkan ke atas tanpa terpengaruh sisa desimal floating-point. */
function ceilSafe(value: number): number {
  return Math.ceil(value - EPS);
}

/** Dibulatkan ke atas ke kelipatan 0,5 (4,1 → 4,5; 4,5 → 4,5; 0 → 0). */
export function ceilToHalf(value: number): number {
  if (value <= 0) return 0;
  return ceilSafe(value * 2) / 2;
}

/**
 * @param stockByIngredient sisa freezer terakhir per bahan (potong), mis. { "id-ayam-dada": 9 }
 */
export function ingredientNeeds(
  predictedByMenu: Record<string, number>,
  recipes: RecipeItem[],
  ingredients: Ingredient[],
  bufferPct: number,
  stockByIngredient: Record<string, number> = {},
): IngredientNeed[] {
  return ingredients
    .map((ingredient) => {
      const need = recipes
        .filter((r) => r.ingredientId === ingredient.id)
        .reduce((sum, r) => sum + (predictedByMenu[r.menuId] ?? 0) * r.qtyPerPortion, 0);
      const recommended = ceilSafe(need * (1 + bufferPct / 100));
      const perKg = ingredient.piecesPerKg ?? 0;
      if (!ingredient.isChicken || perKg <= 0) {
        return { ingredient, need, recommended, stockUsed: 0, buyKg: null };
      }
      const stockUsed = Math.min(Math.max(0, stockByIngredient[ingredient.id] ?? 0), recommended);
      return { ingredient, need, recommended, stockUsed, buyKg: ceilToHalf((recommended - stockUsed) / perKg) };
    })
    .filter((n) => n.need > 0);
}
