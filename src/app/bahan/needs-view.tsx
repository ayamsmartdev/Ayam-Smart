"use client";

import { useState } from "react";
import { DrumstickIcon } from "@/components/icons";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { Segmented } from "@/components/ui/segmented";
import { formatNumber, formatQuantity } from "@/lib/format";
import type { IngredientNeed } from "@/lib/recommend";

type Range = "fokus" | "minggu";
type Leftover = { ingredientId: string; pieces: number; dateLabel: string };

function NeedRows({ needs, bufferPct, leftovers }: { needs: IngredientNeed[]; bufferPct: number; leftovers: Leftover[] }) {
  return (
    <>
      {needs.map((n) => {
        const left = leftovers.find((l) => l.ingredientId === n.ingredient.id);
        return (
          <ListRow
            key={n.ingredient.id}
            leading={
              <span
                className={
                  n.ingredient.isChicken
                    ? "grid size-10 place-items-center rounded-row bg-kriuk-50"
                    : "grid size-10 place-items-center rounded-row bg-brand-50 text-[15px] font-bold text-brand-700"
                }
                aria-hidden="true"
              >
                {n.ingredient.isChicken ? (
                  <DrumstickIcon className="size-5 text-kriuk-700" />
                ) : (
                  n.ingredient.name.charAt(0)
                )}
              </span>
            }
            title={n.ingredient.name}
            subtitle={
              `Kebutuhan ${formatQuantity(Math.round(n.need), n.ingredient.unit)} + cadangan ${bufferPct}%` +
              (n.stockUsed > 0 && left ? ` − sisa freezer ${formatNumber(n.stockUsed)} (${left.dateLabel})` : "")
            }
            trailing={
              <>
                <p className="text-[18px] font-bold tabular-nums">
                  {formatQuantity(n.recommended, n.ingredient.unit)}
                </p>
                {n.buyKg !== null ? (
                  <p className="text-[13px] font-semibold text-kriuk-700">
                    Beli {formatNumber(n.buyKg, 0, 1)} kg · ±{formatNumber(n.ingredient.piecesPerKg ?? 0, 0, 1)} potong/kg
                  </p>
                ) : null}
              </>
            }
          />
        );
      })}
    </>
  );
}

export function NeedsView({
  focus,
  week,
  bufferPct,
  focusLabel,
  focusShort,
  weekLabel,
  leftovers,
}: {
  focus: IngredientNeed[];
  week: IngredientNeed[];
  bufferPct: number;
  focusLabel: string;
  /** Label singkat tombol, mis. "Besok" atau nama hari. */
  focusShort: string;
  weekLabel: string;
  leftovers: Leftover[];
}) {
  const [range, setRange] = useState<Range>("fokus");
  const needs = range === "fokus" ? focus : week;

  return (
    <div className="space-y-4">
      <Segmented
        label="Rentang kebutuhan"
        value={range}
        onChange={setRange}
        options={[
          { value: "fokus", label: focusShort },
          { value: "minggu", label: "7 hari ke depan" },
        ]}
      />
      <GroupedList
        title={range === "fokus" ? focusLabel : `Total ${weekLabel}`}
        footer={`Dihitung dari prediksi porsi per kategori × resep, ditambah cadangan ${bufferPct}%. Bahan yang dibeli per kg dikurangi sisa freezer terakhir, lalu dibagi potong per kg (rata-rata belanja 14 hari, atau angka di pengaturan bahan) dan dibulatkan ke atas per 0,5 kg.`}
      >
        <NeedRows needs={needs} bufferPct={bufferPct} leftovers={leftovers} />
      </GroupedList>
    </div>
  );
}
