"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { computeStockSummary, STOCK_LIMITS, usedByRecap } from "@/lib/stock";

export type StockCardIngredient = {
  id: string;
  name: string;
  piecesPerKg: number;
  averagePiecesPerKg: number | null;
  qtyPerPortionByMenu: Record<string, number>;
};

/** Isian disimpan sebagai teks agar bisa kosong ("belum dicatat"). */
export type StockDraft = { kg: string; pieces: string; leftover: string };

export const EMPTY_DRAFT: StockDraft = { kg: "", pieces: "", leftover: "" };

const KG_RE = /^\d{0,3}([.,]\d{0,2})?$/;

export function parseKg(text: string): number | null {
  return text === "" ? null : Number(text.replace(",", "."));
}
export function parseInt0(text: string): number | null {
  return text === "" ? null : Number(text);
}

/** Pesan kesalahan isian stok satu bahan, atau null jika valid. */
export function stockDraftError(d: StockDraft): string | null {
  const kg = parseKg(d.kg);
  const pieces = parseInt0(d.pieces);
  const leftover = parseInt0(d.leftover);
  if (kg !== null && (!Number.isFinite(kg) || kg > STOCK_LIMITS.kgMax)) return `Maksimal ${STOCK_LIMITS.kgMax} kg.`;
  if (pieces !== null && pieces > STOCK_LIMITS.piecesMax) return `Maksimal ${formatNumber(STOCK_LIMITS.piecesMax)} potong.`;
  if (leftover !== null && leftover > STOCK_LIMITS.piecesMax) return `Maksimal ${formatNumber(STOCK_LIMITS.piecesMax)} potong.`;
  if (kg === 0 && pieces !== null && pieces > 0) return "Ada potong yang dibeli, tapi kg-nya 0.";
  return null;
}

/** Ubah teks isian sesuai jenisnya; mengembalikan null jika ketikan ditolak. */
export function sanitizeStockField(field: keyof StockDraft, raw: string): string | null {
  if (field === "kg") return KG_RE.test(raw) ? raw : null;
  return raw.replace(/\D/g, "").slice(0, 4);
}

const fieldClass =
  "h-12 w-full rounded-row bg-white/70 pl-3 text-right text-[18px] font-bold tabular-nums ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300";

function NumberField({
  label,
  ariaLabel,
  value,
  suffix,
  inputMode,
  invalid,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  suffix: string;
  inputMode: "decimal" | "numeric";
  invalid: boolean;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[13px] font-medium text-ink-soft">{label}</span>
      <span className="relative block">
        <input
          inputMode={inputMode}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className={cn(fieldClass, suffix.length > 3 ? "pr-[4.25rem]" : "pr-10", invalid && "ring-2 ring-sambal-300")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[14px] text-ink-soft">
          {suffix}
        </span>
      </span>
    </label>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-bold text-ink" : "font-semibold")}>{value}</dd>
    </div>
  );
}

/**
 * Kartu stok ayam (D-29): belanja (kg + potong opsional) bisa disimpan kapan saja,
 * sisa diisi saat tutup, lalu tampil hitungan tersedia → sisa seharusnya → selisih.
 */
export function StockCard({
  ingredients,
  drafts,
  previousLeftover,
  qtyByMenu,
  salesFilled,
  closed,
  dirty,
  invalid,
  pending,
  savedLabel,
  onChange,
  onSave,
}: {
  ingredients: StockCardIngredient[];
  drafts: Record<string, StockDraft>;
  previousLeftover: Record<string, number | null>;
  qtyByMenu: Record<string, number>;
  /** Rekap porsi sudah diisi (total > 0) di layar. */
  salesFilled: boolean;
  closed: boolean;
  dirty: boolean;
  invalid: boolean;
  pending: boolean;
  savedLabel: string | null;
  onChange: (id: string, field: keyof StockDraft, raw: string) => void;
  onSave: () => void;
}) {
  return (
    <section aria-label="Stok ayam">
      <p className="mb-2 px-1 text-[13px] text-ink-soft">
        Belanja bisa diisi kapan saja. Sisa diisi saat tutup, dari isi freezer.
      </p>
      <div className="glass divide-y divide-line/70 rounded-panel">
        {ingredients.map((ing) => {
          const d = drafts[ing.id] ?? EMPTY_DRAFT;
          const err = stockDraftError(d);
          const kg = parseKg(d.kg);
          const estimate = ing.averagePiecesPerKg ?? ing.piecesPerKg;
          const used = closed ? 0 : salesFilled ? usedByRecap(qtyByMenu, ing.qtyPerPortionByMenu) : null;
          const prev = previousLeftover[ing.id] ?? null;
          const s = err
            ? null
            : computeStockSummary({
                previousLeftover: prev,
                boughtKg: kg,
                boughtPieces: parseInt0(d.pieces),
                leftover: parseInt0(d.leftover),
                estimatePiecesPerKg: estimate,
                usedByRecap: used,
              });
          const hasRecipe = Object.keys(ing.qtyPerPortionByMenu).length > 0;

          return (
            <div key={ing.id} className="space-y-3 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[16px] font-medium">{ing.name}</span>
                <span className="text-right text-[13px] text-ink-soft">
                  {prev !== null ? `Sisa terakhir ${formatNumber(prev)} potong` : "Sisa terakhir belum tercatat"}
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink">Belanja hari ini</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Dibeli"
                    ariaLabel={`Dibeli ${ing.name}`}
                    value={d.kg}
                    suffix="kg"
                    inputMode="decimal"
                    invalid={Boolean(err)}
                    onChange={(v) => onChange(ing.id, "kg", v)}
                  />
                  <NumberField
                    label="Jadi berapa potong"
                    ariaLabel={`Jadi berapa potong ${ing.name}`}
                    value={d.pieces}
                    suffix="potong"
                    inputMode="numeric"
                    invalid={Boolean(err)}
                    onChange={(v) => onChange(ing.id, "pieces", v)}
                  />
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">
                  {s?.piecesPerKgToday != null
                    ? `Hari ini 1 kg ≈ ${formatNumber(s.piecesPerKgToday, 0, 1)} potong.`
                    : "Jumlah potong opsional, hitung saat memotong agar lebih akurat."}
                  {ing.averagePiecesPerKg !== null
                    ? ` Rata-rata 14 hari ≈ ${formatNumber(ing.averagePiecesPerKg, 0, 1)}/kg.`
                    : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Sisa masuk freezer"
                  ariaLabel={`Sisa masuk freezer ${ing.name}`}
                  value={d.leftover}
                  suffix="potong"
                  inputMode="numeric"
                  invalid={Boolean(err)}
                  onChange={(v) => onChange(ing.id, "leftover", v)}
                />
              </div>

              {err ? (
                <p role="alert" className="text-[13px] font-semibold text-sambal-700">
                  {err}
                </p>
              ) : s ? (
                <dl className="space-y-1 rounded-row bg-white/55 px-3 py-2.5 text-[13px]">
                  {s.boughtPieces > 0 ? (
                    <SummaryRow
                      label={s.estimated ? `Dibeli (perkiraan ${formatNumber(estimate, 0, 1)}/kg)` : "Dibeli"}
                      value={`${s.estimated ? "≈ " : ""}${formatNumber(s.boughtPieces)} potong`}
                    />
                  ) : null}
                  {s.available !== null ? (
                    <SummaryRow label="Tersedia (sisa terakhir + dibeli)" value={`${formatNumber(s.available)} potong`} />
                  ) : null}
                  {used !== null && hasRecipe ? (
                    <SummaryRow label="Terpakai menurut rekap porsi" value={`${formatNumber(used)} potong`} />
                  ) : null}
                  {s.expectedLeftover !== null && hasRecipe ? (
                    <SummaryRow label="Sisa seharusnya" value={`${formatNumber(s.expectedLeftover)} potong`} strong />
                  ) : null}
                  <DifferenceNote
                    summary={s}
                    hasPrevious={prev !== null}
                    hasRecipe={hasRecipe}
                    salesKnown={used !== null}
                  />
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p
          className={cn("text-[13px]", dirty ? "font-semibold text-sambal-700" : "text-ink-soft")}
          aria-live="polite"
        >
          {dirty ? "Stok belum disimpan." : (savedLabel ?? "Stok hari ini belum dicatat.")}
        </p>
        <Button variant="secondary" onClick={onSave} disabled={pending || !dirty || invalid} className="shrink-0">
          {pending ? "Menyimpan…" : "Simpan stok"}
        </Button>
      </div>
    </section>
  );
}

function DifferenceNote({
  summary,
  hasPrevious,
  hasRecipe,
  salesKnown,
}: {
  summary: ReturnType<typeof computeStockSummary>;
  hasPrevious: boolean;
  hasRecipe: boolean;
  salesKnown: boolean;
}) {
  const base = "pt-1 text-[13px] leading-snug";
  if (!hasPrevious) {
    return <p className={cn(base, "text-ink-soft")}>Selisih belum bisa dihitung: sisa hari sebelumnya tidak tercatat.</p>;
  }
  if (!hasRecipe) {
    return <p className={cn(base, "text-ink-soft")}>Selisih belum bisa dihitung: bahan ini belum ada di resep.</p>;
  }
  if (!salesKnown) {
    return <p className={cn(base, "text-ink-soft")}>Isi porsi terjual di bawah untuk menghitung sisa seharusnya.</p>;
  }
  if (summary.difference === null) {
    return <p className={cn(base, "text-ink-soft")}>Isi sisa masuk freezer saat tutup untuk melihat selisih.</p>;
  }
  const n = summary.difference;
  const approx = summary.estimated ? " (perkiraan, karena jumlah potong belanja tidak diisi)" : "";
  if (n === 0) return <p className={cn(base, "font-semibold text-daun-600")}>Cocok dengan hitungan{approx}.</p>;
  if (n > 0) {
    return (
      <p className={cn(base, "font-semibold text-kriuk-700")}>
        Selisih {formatNumber(n)} potong tidak tercatat: food waste, dipakai sendiri, atau salah hitung rekap{approx}.
      </p>
    );
  }
  return (
    <p className={cn(base, "font-semibold text-kriuk-700")}>
      Sisa {formatNumber(-n)} potong lebih banyak dari hitungan: cek jumlah potong belanja atau rekap porsi{approx}.
    </p>
  );
}
