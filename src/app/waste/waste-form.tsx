"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/cn";
import { WASTE_LIMITS, WASTE_REASON_LABEL, WASTE_REASONS, type WasteKind, type WasteReason } from "@/lib/waste";

export type WasteOption = { id: string; name: string; unit: string; isChicken: boolean; isActive: boolean };
export type WasteFormValue = {
  date: string;
  kind: WasteKind;
  itemId: string;
  qty: number;
  reason: WasteReason;
  note: string;
};

const WHOLE = new Set(["porsi", "potong", "pcs", "gelas"]);
const QTY_RE = /^\d{0,6}([.,]\d{0,2})?$/;
const inputClass =
  "min-h-12 w-full rounded-row bg-white/70 px-3 text-[16px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300";

/** Form catat/ubah waste. Pilihan hanya item aktif, ditambah item catatan lama bila sudah nonaktif. */
export function WasteForm({
  menus,
  bahan,
  today,
  minDate,
  initial,
  pending,
  submitLabel,
  onSubmit,
}: {
  menus: WasteOption[];
  bahan: WasteOption[];
  today: string;
  minDate: string;
  initial?: WasteFormValue;
  pending: boolean;
  submitLabel: string;
  onSubmit: (value: WasteFormValue) => void;
}) {
  const [date, setDate] = useState(initial?.date ?? today);
  const [kind, setKind] = useState<WasteKind>(initial?.kind ?? "menu");
  const listFor = (k: WasteKind) =>
    (k === "menu" ? menus : bahan).filter((o) => o.isActive || (initial?.kind === k && o.id === initial.itemId));
  const [itemId, setItemId] = useState(initial?.itemId ?? listFor("menu")[0]?.id ?? "");
  const [qtyText, setQtyText] = useState(initial ? String(initial.qty).replace(".", ",") : "1");
  const [reason, setReason] = useState<WasteReason>(initial?.reason ?? "tidak_laku");
  const [note, setNote] = useState(initial?.note ?? "");

  const options = listFor(kind);
  const item = options.find((o) => o.id === itemId);
  const unit = item?.unit ?? (kind === "menu" ? "porsi" : "");
  const whole = WHOLE.has(unit);
  const qty = Number(qtyText.replace(",", ".")) || 0;

  const changeKind = (k: WasteKind) => {
    setKind(k);
    setItemId(listFor(k)[0]?.id ?? "");
    setQtyText("1");
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ date, kind, itemId, qty, reason, note });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Tanggal</span>
        <input
          type="date"
          className={inputClass}
          value={date}
          min={minDate}
          max={today}
          required
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <Segmented
        label="Jenis"
        value={kind}
        onChange={changeKind}
        options={[
          { value: "menu", label: "Porsi menu" },
          { value: "bahan", label: "Bahan baku" },
        ]}
      />

      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">
          {kind === "menu" ? "Kategori menu" : "Bahan"}
        </span>
        <select className={inputClass} value={itemId} onChange={(e) => setItemId(e.target.value)} required>
          {options.length === 0 ? <option value="">Belum ada {kind === "menu" ? "kategori" : "bahan"}</option> : null}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.isActive ? "" : " (nonaktif)"}
            </option>
          ))}
        </select>
        {kind === "menu" ? (
          <span className="mt-1 block text-[13px] text-ink-soft">
            Porsi yang sudah dibuat tapi terbuang. Ayamnya ikut dihitung lewat resep.
          </span>
        ) : null}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[14px] font-medium text-ink-soft">Jumlah ({unit})</span>
        {whole ? (
          <Stepper
            label={`Jumlah ${unit}`}
            value={Math.max(1, Math.round(qty))}
            onChange={(v) => setQtyText(String(v))}
            min={1}
            max={5000}
          />
        ) : (
          <input
            inputMode="decimal"
            aria-label={`Jumlah ${unit}`}
            className={cn(inputClass, "w-36 text-right font-bold tabular-nums")}
            value={qtyText}
            onChange={(e) => QTY_RE.test(e.target.value) && setQtyText(e.target.value)}
          />
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-[14px] font-medium text-ink-soft">Alasan</legend>
        <div className="flex flex-wrap gap-2">
          {WASTE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                "min-h-10 rounded-full px-4 text-[14px] font-semibold ring-1 transition-colors",
                reason === r ? "bg-sambal-50 text-sambal-700 ring-sambal-500/40" : "bg-white/60 text-ink-soft ring-line",
              )}
            >
              {WASTE_REASON_LABEL[r]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Catatan (opsional)</span>
        <input
          className={inputClass}
          value={note}
          maxLength={WASTE_LIMITS.noteMax}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: jatuh saat digoreng"
        />
      </label>

      <Button type="submit" variant="danger" className="w-full sm:w-auto" disabled={pending || !itemId || qty <= 0}>
        {pending ? "Menyimpan…" : submitLabel}
      </Button>
    </form>
  );
}
