/**
 * Food waste (F7, T-21): validasi input dan hitungan ayam terbuang. Murni, dipakai server & form.
 * Satu catatan = porsi kategori menu ATAU bahan (CHECK `num_nonnulls(menu_id, ingredient_id) = 1`).
 */
import { addDays } from "@/lib/date";

export const WASTE_REASONS = ["tidak_laku", "rusak", "kedaluwarsa", "lainnya"] as const;
export type WasteReason = (typeof WASTE_REASONS)[number];
export const WASTE_REASON_LABEL: Record<WasteReason, string> = {
  tidak_laku: "Tidak laku",
  rusak: "Rusak",
  kedaluwarsa: "Kedaluwarsa",
  lainnya: "Lainnya",
};
export const WASTE_LIMITS = { qtyMax: 100_000, noteMax: 200 } as const;
/** Satuan yang hanya boleh bilangan bulat. */
const WHOLE_UNITS = new Set(["porsi", "potong", "pcs", "gelas"]);

export type WasteKind = "menu" | "bahan";
export type WasteInput = {
  kind: WasteKind;
  itemId: string;
  qty: number;
  reason: WasteReason;
  note: string | null;
};

/**
 * @param units satuan tiap item yang boleh dipilih: kategori → "porsi", bahan → satuannya.
 */
export function cleanWasteInput(
  raw: unknown,
  units: { menu: Map<string, string>; bahan: Map<string, string> },
): { ok: true; value: WasteInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = r.kind;
  if (kind !== "menu" && kind !== "bahan") return { ok: false, error: "Pilih jenis: porsi menu atau bahan." };
  const itemId = typeof r.itemId === "string" ? r.itemId : "";
  const unit = units[kind].get(itemId);
  if (!unit) return { ok: false, error: kind === "menu" ? "Pilih kategori menu." : "Pilih bahan." };
  const qty = r.qty;
  if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 || qty > WASTE_LIMITS.qtyMax) {
    return { ok: false, error: `Jumlah harus lebih dari 0 dan maksimal ${WASTE_LIMITS.qtyMax.toLocaleString("id-ID")}.` };
  }
  // Toleransi floating-point: 0,29 × 100 = 28,999999999999996.
  if (Math.abs(qty * 100 - Math.round(qty * 100)) > 1e-6) {
    return { ok: false, error: "Jumlah maksimal 2 angka desimal." };
  }
  if (WHOLE_UNITS.has(unit) && !Number.isInteger(qty)) {
    return { ok: false, error: `Jumlah ${unit} harus bilangan bulat.` };
  }
  if (!WASTE_REASONS.includes(r.reason as WasteReason)) return { ok: false, error: "Pilih alasan." };
  const note = typeof r.note === "string" ? r.note.replace(/\s+/g, " ").trim() : "";
  if (note.length > WASTE_LIMITS.noteMax) {
    return { ok: false, error: `Catatan maksimal ${WASTE_LIMITS.noteMax} karakter.` };
  }
  return { ok: true, value: { kind, itemId, qty, reason: r.reason as WasteReason, note: note || null } };
}

export type WasteFact = { date: string; menuId: string | null; ingredientId: string | null; qty: number };

/**
 * Potong ayam terbuang per tanggal untuk satu bahan ayam:
 * catatan bahan itu (potong) + catatan porsi kategori × takaran bahan itu per porsi (resep).
 */
export function chickenWasteByDate(
  rows: WasteFact[],
  ingredientId: string,
  perPortionByMenu: Record<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of rows) {
    const pieces =
      w.ingredientId === ingredientId ? w.qty : w.menuId ? w.qty * (perPortionByMenu[w.menuId] ?? 0) : 0;
    if (pieces > 0) out.set(w.date, (out.get(w.date) ?? 0) + pieces);
  }
  return out;
}

export type ChickenWasteSummary = {
  /** Potong ayam terbuang per hari, `days` hari s.d. `end` (urut lama → baru). */
  perDay: { date: string; pieces: number }[];
  pieces7: number;
  /** Potong ayam terpakai menurut rekap 7 hari (Σ porsi × resep). */
  used7: number;
  /** Waste ÷ (terpakai + waste) × 100; null jika belum ada rekap. */
  ratePct7: number | null;
};

/** Ringkasan ayam terbuang semua bahan ayam (potong). Tingkat waste = bagian ayam yang terbuang. */
export function chickenWasteSummary(input: {
  end: string;
  days: number;
  waste: WasteFact[];
  sales: { date: string; menuId: string; qty: number }[];
  chickenIds: string[];
  recipes: Record<string, { ingredientId: string; qty: number }[]>;
}): ChickenWasteSummary {
  const dates = Array.from({ length: input.days }, (_, i) => addDays(input.end, i - input.days + 1));
  const last7 = new Set(dates.slice(-7));
  const wasteBy = new Map<string, number>();
  let used7 = 0;
  for (const id of input.chickenIds) {
    const perPortion: Record<string, number> = {};
    for (const [menuId, items] of Object.entries(input.recipes)) {
      for (const it of items) if (it.ingredientId === id) perPortion[menuId] = it.qty;
    }
    for (const [d, p] of chickenWasteByDate(input.waste, id, perPortion)) wasteBy.set(d, (wasteBy.get(d) ?? 0) + p);
    for (const s of input.sales) if (last7.has(s.date)) used7 += s.qty * (perPortion[s.menuId] ?? 0);
  }
  const perDay = dates.map((date) => ({ date, pieces: wasteBy.get(date) ?? 0 }));
  const pieces7 = perDay.filter((p) => last7.has(p.date)).reduce((a, p) => a + p.pieces, 0);
  return {
    perDay,
    pieces7,
    used7,
    ratePct7: used7 + pieces7 > 0 && used7 > 0 ? (pieces7 / (used7 + pieces7)) * 100 : null,
  };
}
