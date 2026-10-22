"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { WASTE_REASON_LABEL, type Ingredient, type WasteReason } from "@/lib/demo-data";

type Kind = "ayam" | "bahan";

export function WasteForm({ ingredients }: { ingredients: Ingredient[] }) {
  const others = ingredients.filter((i) => !i.isChicken);
  const [kind, setKind] = useState<Kind>("ayam");
  const [ingredientId, setIngredientId] = useState(others[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<WasteReason>("tidak_laku");
  const [toast, setToast] = useState<string | null>(null);

  const unit = kind === "ayam" ? "potong" : (others.find((i) => i.id === ingredientId)?.unit ?? "");

  return (
    <Panel aria-labelledby="waste-form-title">
      <PanelTitle id="waste-form-title">Catat waste hari ini</PanelTitle>

      <div className="mt-4 space-y-5">
        <Segmented
          label="Jenis"
          value={kind}
          onChange={setKind}
          options={[
            { value: "ayam", label: "Ayam goreng" },
            { value: "bahan", label: "Bahan baku" },
          ]}
        />

        {kind === "bahan" ? (
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Bahan</span>
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="min-h-11 w-full rounded-row bg-white/70 px-3 text-[16px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {others.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[14px] font-medium text-ink-soft">Jumlah ({unit})</span>
          <Stepper label={`Jumlah ${unit}`} value={qty} onChange={setQty} min={1} max={5000} />
        </div>

        <fieldset>
          <legend className="mb-2 text-[14px] font-medium text-ink-soft">Alasan</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WASTE_REASON_LABEL) as WasteReason[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "min-h-10 rounded-full px-4 text-[14px] font-semibold ring-1 transition-colors",
                  reason === r
                    ? "bg-sambal-50 text-sambal-700 ring-sambal-500/40"
                    : "bg-white/60 text-ink-soft ring-line",
                )}
              >
                {WASTE_REASON_LABEL[r]}
              </button>
            ))}
          </div>
        </fieldset>

        <Button
          variant="danger"
          className="w-full sm:w-auto"
          onClick={() => setToast("Ini pratinjau: catatan belum disimpan karena database belum tersambung.")}
        >
          Catat waste
        </Button>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </Panel>
  );
}
