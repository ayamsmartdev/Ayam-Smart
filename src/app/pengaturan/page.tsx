import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { getAllIngredients } from "@/lib/data/ingredients";
import { getAllMenus } from "@/lib/data/menus";
import { getRecipes } from "@/lib/data/recipes";
import { getSettings } from "@/lib/data/settings";
import { IngredientManager } from "./ingredient-manager";
import { MenuManager } from "./menu-manager";
import { SettingsForm } from "./settings-form";

// Membaca database & dilindungi PIN → selalu dirender saat dibuka (D-19).
export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  let menus;
  let ingredients;
  let recipes;
  let settings;
  try {
    [menus, ingredients, recipes, settings] = await Promise.all([
      getAllMenus(),
      getAllIngredients(),
      getRecipes(),
      getSettings(),
    ]);
  } catch {
    return (
      <>
        <PageHeader title="Menu & resep" />
        <Panel>
          <p className="text-[16px] font-semibold">Database belum bisa dihubungi</p>
          <p className="mt-1 text-[15px] text-ink-soft">Coba muat ulang sebentar lagi, atau cek halaman Status.</p>
          <LinkButton href="/status" variant="secondary" className="mt-4">
            Buka status sistem
          </LinkButton>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Menu & resep" subtitle="Menu yang direkap setiap hari dan bahan bakunya" />
      <div className="space-y-8">
        <MenuManager
          menus={menus.map(({ id, name, price, isActive }) => ({ id, name, price, isActive }))}
          ingredients={ingredients.map(({ id, name, unit, isActive }) => ({ id, name, unit, isActive }))}
          recipes={recipes}
        />
        <IngredientManager ingredients={ingredients} />
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
