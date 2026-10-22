import { Badge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { DEMO_INGREDIENTS, DEMO_MENUS, DEMO_RECIPES, DEMO_SETTINGS } from "@/lib/demo-data";
import { formatQuantity } from "@/lib/format";

export default function PengaturanPage() {
  const ingredient = (id: string) => DEMO_INGREDIENTS.find((i) => i.id === id);

  return (
    <>
      <PageHeader title="Menu & resep" subtitle="Contoh sementara, menunggu menu asli warung" />
      <div className="space-y-6">
        <GroupedList title="Menu dan bahan per porsi">
          {DEMO_MENUS.map((m) => (
            <ListRow
              key={m.id}
              title={m.name}
              subtitle={
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {DEMO_RECIPES.filter((r) => r.menuId === m.id).map((r) => {
                    const ing = ingredient(r.ingredientId);
                    if (!ing) return null;
                    return (
                      <Badge key={r.ingredientId} tone={ing.isChicken ? "kriuk" : "neutral"}>
                        {ing.name} {formatQuantity(r.qtyPerPortion, ing.unit)}
                      </Badge>
                    );
                  })}
                </span>
              }
            />
          ))}
        </GroupedList>

        <GroupedList
          title="Setelan perhitungan"
          footer="Setelan bisa diubah setelah database tersambung."
        >
          <ListRow
            title="Cadangan stok"
            subtitle="Ditambahkan ke kebutuhan bahan"
            trailing={<span className="text-[16px] font-semibold">{DEMO_SETTINGS.bufferPct}%</span>}
          />
          <ListRow
            title="Potong per ekor ayam"
            subtitle="Untuk mengubah potong menjadi ekor"
            trailing={<span className="text-[16px] font-semibold">{DEMO_SETTINGS.piecesPerChicken} potong</span>}
          />
        </GroupedList>
      </div>
    </>
  );
}
