/**
 * Rekomendasi bahan baku (ARCHITECTURE §7):
 *   kebutuhan(i)   = Σ_menu prediksi(menu) × resep(menu, i)
 *   rekomendasi(i) = ceil(kebutuhan(i) × (1 + buffer%/100))
 *   ekor ayam      = ceil(rekomendasi(ayam) / potong per ekor)
 * Prediksi tidak dibulatkan sebelum dikalikan resep.
 */
import type { Ingredient, RecipeItem } from "./demo-data";

export type IngredientNeed = {
  ingredient: Ingredient;
  need: number;
  recommended: number;
  chickens: number | null;
};

export function ingredientNeeds(
  predictedByMenu: Record<string, number>,
  recipes: RecipeItem[],
  ingredients: Ingredient[],
  bufferPct: number,
  piecesPerChicken: number,
): IngredientNeed[] {
  return ingredients
    .map((ingredient) => {
      const need = recipes
        .filter((r) => r.ingredientId === ingredient.id)
        .reduce((sum, r) => sum + (predictedByMenu[r.menuId] ?? 0) * r.qtyPerPortion, 0);
      const recommended = Math.ceil(need * (1 + bufferPct / 100));
      const chickens =
        ingredient.isChicken && piecesPerChicken > 0
          ? Math.ceil(recommended / piecesPerChicken)
          : null;
      return { ingredient, need, recommended, chickens };
    })
    .filter((n) => n.need > 0);
}
