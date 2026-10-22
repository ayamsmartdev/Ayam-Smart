"use client";

import { useState } from "react";
import { DrumstickIcon } from "@/components/icons";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { Segmented } from "@/components/ui/segmented";
import { formatNumber, formatQuantity } from "@/lib/format";
import type { IngredientNeed } from "@/lib/recommend";

type Range = "besok" | "lima";

function NeedRows({ needs, bufferPct }: { needs: IngredientNeed[]; bufferPct: number }) {
  return (
    <>
      {needs.map((n) => (
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
          subtitle={`Kebutuhan ${formatQuantity(Math.round(n.need), n.ingredient.unit)} + cadangan ${bufferPct}%`}
          trailing={
            <>
              <p className="text-[18px] font-bold tabular-nums">
                {formatQuantity(n.recommended, n.ingredient.unit)}
              </p>
              {n.chickens !== null ? (
                <p className="text-[13px] font-semibold text-kriuk-700">{formatNumber(n.chickens)} ekor</p>
              ) : null}
            </>
          }
        />
      ))}
    </>
  );
}

export function NeedsView({
  tomorrow,
  fiveDays,
  bufferPct,
  piecesPerChicken,
  tomorrowLabel,
}: {
  tomorrow: IngredientNeed[];
  fiveDays: IngredientNeed[];
  bufferPct: number;
  piecesPerChicken: number;
  tomorrowLabel: string;
}) {
  const [range, setRange] = useState<Range>("besok");
  const needs = range === "besok" ? tomorrow : fiveDays;

  return (
    <div className="space-y-4">
      <Segmented
        label="Rentang kebutuhan"
        value={range}
        onChange={setRange}
        options={[
          { value: "besok", label: "Besok" },
          { value: "lima", label: "5 hari ke depan" },
        ]}
      />
      <GroupedList
        title={range === "besok" ? tomorrowLabel : "Total 5 hari ke depan"}
        footer={`Dihitung dari prediksi porsi per menu × resep, ditambah cadangan ${bufferPct}%. Ayam dibulatkan ke atas menjadi ekor (1 ekor = ${piecesPerChicken} potong).`}
      >
        <NeedRows needs={needs} bufferPct={bufferPct} />
      </GroupedList>
    </div>
  );
}
