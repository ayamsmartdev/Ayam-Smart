"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export type RecipeIngredient = { id: string; name: string; unit: string; isActive: boolean };
type Row = { key: number; ingredientId: string; qty: string };

const fieldClass =
  "min-h-11 rounded-row bg-white/70 px-2.5 text-[16px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300";

/** Editor resep satu menu: daftar bahan + takaran per porsi. */
export function RecipeEditor({
  initial,
  ingredients,
  pending,
  onSave,
}: {
  initial: { ingredientId: string; qty: number }[];
  ingredients: RecipeIngredient[];
  pending: boolean;
  onSave: (items: { ingredientId: string; qty: string }[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((it, i) => ({ key: i, ingredientId: it.ingredientId, qty: String(it.qty).replace(".", ",") })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  // Bahan nonaktif tetap tampil jika sudah ada di resep ini, tapi tidak bisa ditambahkan baru.
  const usedIds = new Set(rows.map((r) => r.ingredientId));
  const selectable = ingredients.filter((i) => i.isActive || usedIds.has(i.id));
  const unused = ingredients.filter((i) => i.isActive && !usedIds.has(i.id));
  const unitOf = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";

  const update = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  if (ingredients.length === 0) {
    return (
      <p className="rounded-row bg-white/55 px-3 py-3 text-[14px] text-ink-soft">
        Belum ada bahan baku. Tambahkan bahan di bagian Bahan baku dulu.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(rows.map(({ ingredientId, qty }) => ({ ingredientId, qty })));
      }}
    >
      {rows.length === 0 ? (
        <p className="rounded-row bg-white/55 px-3 py-3 text-[14px] text-ink-soft">
          Resep masih kosong. Tambahkan bahan yang dipakai untuk 1 porsi menu ini.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="space-y-2 rounded-row bg-white/45 p-2">
              <select
                aria-label="Bahan"
                className={`${fieldClass} w-full`}
                value={row.ingredientId}
                onChange={(e) => update(row.key, { ingredientId: e.target.value })}
              >
                {selectable
                  .filter((i) => i.id === row.ingredientId || !usedIds.has(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.isActive ? "" : " (nonaktif)"}
                    </option>
                  ))}
              </select>
              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Takaran per porsi</span>
                  <input
                    className={`${fieldClass} w-full pr-[4.75rem] text-right tabular-nums`}
                    inputMode="decimal"
                    value={row.qty}
                    onChange={(e) => update(row.key, { qty: e.target.value.replace(/[^\d.,]/g, "") })}
                    placeholder="0"
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[14px] text-ink-soft">
                    {unitOf(row.ingredientId)}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-sambal-700 hover:bg-sambal-50"
                  aria-label="Hapus bahan dari resep"
                >
                  <MinusIcon className="size-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="secondary"
        className="w-full"
        disabled={unused.length === 0}
        onClick={() => {
          setRows((prev) => [...prev, { key: nextKey, ingredientId: unused[0].id, qty: "" }]);
          setNextKey((k) => k + 1);
        }}
      >
        <PlusIcon className="size-5" />
        {unused.length === 0 ? "Semua bahan sudah dipakai" : "Tambah bahan"}
      </Button>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan resep"}
      </Button>
    </form>
  );
}
