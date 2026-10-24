"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createIngredient,
  deleteIngredient,
  setIngredientActive,
  updateIngredient,
} from "@/actions/ingredients";
import { useActionRunner } from "@/components/hooks/use-action-runner";
import { DrumstickIcon, PlusIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DialogError } from "@/components/ui/confirm-dialog";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Unit = "potong" | "gram" | "kg" | "porsi" | "ml" | "pcs" | "gelas";
type Ingredient = {
  id: string;
  name: string;
  unit: Unit;
  isChicken: boolean;
  piecesPerKg: number | null;
  isActive: boolean;
  inUse: boolean;
};

/** Sama dengan PIECES_PER_KG di src/lib/data/ingredients.ts (server). */
const PER_KG = { min: 1, max: 20, default: 9 };

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "potong", label: "potong" },
  { value: "gram", label: "gram" },
  { value: "kg", label: "kg" },
  { value: "porsi", label: "porsi" },
  { value: "ml", label: "ml" },
  { value: "pcs", label: "pcs (buah)" },
  { value: "gelas", label: "gelas" },
];

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; item: Ingredient }
  | { mode: "delete"; item: Ingredient };

const fieldClass =
  "min-h-12 w-full rounded-row bg-white/70 px-3 text-[16px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-60";

function IngredientForm({
  initial,
  pending,
  onSubmit,
}: {
  initial?: Ingredient;
  pending: boolean;
  onSubmit: (value: { name: string; unit: Unit; isChicken: boolean; piecesPerKg: number | null }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? "gram");
  const [isChicken, setIsChicken] = useState(initial?.isChicken ?? false);
  const [piecesPerKg, setPiecesPerKg] = useState(initial?.piecesPerKg ?? PER_KG.default);
  const unitLocked = Boolean(initial?.inUse);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const perKg = unit === "potong" && isChicken;
        onSubmit({ name, unit, isChicken: perKg, piecesPerKg: perKg ? piecesPerKg : null });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Nama bahan</span>
        <input
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoFocus
          placeholder="Contoh: Cabai rawit"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Satuan takaran</span>
        <select
          className={fieldClass}
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          disabled={unitLocked}
        >
          {UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {unitLocked ? (
          <span className="mt-1.5 block text-[13px] text-ink-soft">
            Satuan dikunci karena bahan ini sudah dipakai di resep atau catatan waste.
          </span>
        ) : null}
      </label>
      {unit === "potong" ? (
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-row bg-white/55 px-3">
          <span>
            <span className="block text-[15px] font-medium">Ayam, dibeli per kg</span>
            <span className="block text-[13px] text-ink-soft">Potong diubah jadi kg di rekomendasi</span>
          </span>
          <input
            type="checkbox"
            checked={isChicken}
            onChange={(e) => setIsChicken(e.target.checked)}
            className="size-5 shrink-0 accent-brand-600"
          />
        </label>
      ) : null}
      {unit === "potong" && isChicken ? (
        <div className="flex items-center justify-between gap-3 rounded-row bg-white/55 px-3 py-2">
          <span>
            <span className="block text-[15px] font-medium">Perkiraan potong per kg</span>
            <span className="block text-[13px] text-ink-soft">Dipakai jika jumlah potong belanja tidak diisi</span>
          </span>
          <Stepper
            label="Perkiraan potong per kg"
            value={piecesPerKg}
            onChange={setPiecesPerKg}
            min={PER_KG.min}
            max={PER_KG.max}
          />
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending || name.trim().length === 0}>
        {pending ? "Menyimpan…" : "Simpan bahan"}
      </Button>
    </form>
  );
}

export function IngredientManager({ ingredients }: { ingredients: Ingredient[] }) {
  const { run: runAction, pending, toast, clearToast, needPin, dialogError, clearDialogError } =
    useActionRunner();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const openDialog = (next: DialogState) => {
    clearDialogError();
    setDialog(next);
  };
  const close = () => openDialog({ mode: "closed" });
  const run = (action: Parameters<typeof runAction>[0]) =>
    runAction(action, { inDialog: true, onSuccess: close, onPinLost: close });

  return (
    <section aria-labelledby="ingredient-list-title">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 id="ingredient-list-title" className="text-[15px] font-semibold text-ink-soft">
            Bahan baku
          </h2>
          <p className="text-[13px] text-ink-soft">Dipakai di resep dan catatan food waste.</p>
        </div>
        <Button onClick={() => openDialog({ mode: "create" })} className="shrink-0 px-4">
          <PlusIcon className="size-5" />
          Tambah
        </Button>
      </div>

      <ul className="glass divide-y divide-line/70 overflow-hidden rounded-panel">
        {ingredients.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openDialog({ mode: "edit", item })}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/50",
                !item.isActive && "bg-ink/[.03]",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-row",
                  item.isChicken ? "bg-kriuk-50" : "bg-brand-50 text-[15px] font-bold text-brand-700",
                )}
                aria-hidden="true"
              >
                {item.isChicken ? <DrumstickIcon className="size-5 text-kriuk-700" /> : item.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[16px] font-medium", !item.isActive && "text-ink-soft")}>
                  {item.name}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-soft">
                  per {item.unit}
                  {item.isChicken ? (
                    <Badge tone="kriuk">Dibeli per kg · perkiraan {item.piecesPerKg ?? "?"} potong/kg</Badge>
                  ) : null}
                  {!item.isActive ? <Badge>Nonaktif</Badge> : null}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {needPin ? (
        <Link
          href="/pin?next=/pengaturan"
          className="mt-4 block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <ConfirmDialog open={dialog.mode === "create"} onClose={close} title="Tambah bahan">
        {dialog.mode === "create" ? (
          <IngredientForm pending={pending} onSubmit={(v) => run(() => createIngredient(v))} />
        ) : null}
        <DialogError message={dialogError} />
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <ConfirmDialog open={dialog.mode === "edit"} onClose={close} title="Ubah bahan">
        {dialog.mode === "edit" ? (
          <>
            <IngredientForm
              key={dialog.item.id}
              initial={dialog.item}
              pending={pending}
              onSubmit={(v) => {
                const id = dialog.item.id;
                run(() => updateIngredient(id, v));
              }}
            />
            <DialogError message={dialogError} />
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                const { id, isActive } = dialog.item;
                run(() => setIngredientActive(id, !isActive));
              }}
            >
              {dialog.item.isActive ? "Nonaktifkan" : "Aktifkan lagi"}
            </Button>
            <Button variant="dangerSoft" disabled={pending} onClick={() => openDialog({ mode: "delete", item: dialog.item })}>
              Hapus bahan
            </Button>
          </>
        ) : null}
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog.mode === "delete"}
        onClose={close}
        title="Hapus bahan?"
        description={
          dialog.mode === "delete"
            ? `"${dialog.item.name}" akan dihapus permanen. Bahan yang sudah dipakai di resep atau waste tidak bisa dihapus; nonaktifkan saja.`
            : undefined
        }
      >
        {dialogError ? (
          <>
            <DialogError message={dialogError} />
            {dialog.mode === "delete" && dialog.item.isActive ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  const id = dialog.item.id;
                  run(() => setIngredientActive(id, false));
                }}
              >
                Nonaktifkan saja
              </Button>
            ) : null}
          </>
        ) : (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (dialog.mode !== "delete") return;
              const id = dialog.item.id;
              run(() => deleteIngredient(id));
            }}
          >
            {pending ? "Menghapus…" : "Ya, hapus"}
          </Button>
        )}
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={clearToast} />
    </section>
  );
}
