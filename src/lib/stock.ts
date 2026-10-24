/**
 * Logika stok ayam (D-26, D-28, D-29). Murni (tanpa server/DB) → dipakai server & form, dan mudah dites.
 *
 *   dibeli (potong) = jumlah potong yang didapat; jika kosong ≈ kg × perkiraan potong/kg (ditandai perkiraan)
 *   tersedia        = sisa terakhir (freezer) + dibeli
 *   terpakai rekap  = Σ porsi kategori × resep
 *   sisa seharusnya = tersedia − terpakai rekap
 *   selisih         = sisa seharusnya − sisa dihitung   (>0: tidak tercatat, <0: lebih dari hitungan)
 */

/** Batas wajar input per bahan per hari (sama dengan CHECK di 0004_belanja_sisa.sql). */
export const STOCK_LIMITS = { kgMax: 500, piecesMax: 5000 } as const;

/** Rata-rata potong/kg dihitung dari belanja beberapa hari terakhir (D-29). */
export const PIECES_PER_KG_WINDOW_DAYS = 14;

export type StockValues = { boughtKg: number | null; boughtPieces: number | null; leftover: number | null };
export type StockInputItem = StockValues & { ingredientId: string };

export type CleanStockResult =
  | { ok: true; upserts: StockInputItem[]; clearIds: string[] }
  | { ok: false; error: string };

const isInt = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const isKg = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= STOCK_LIMITS.kgMax &&
  Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

/**
 * Validasi stok dari form. Semua kosong = tidak dicatat (baris lama dihapus).
 * Belanja dan sisa boleh diisi terpisah (pagi belanja, malam sisa).
 */
export function cleanStockInput(raw: unknown, allowedIds: Set<string>): CleanStockResult {
  if (raw === undefined || raw === null) return { ok: true, upserts: [], clearIds: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "Data stok tidak valid." };

  const upserts: StockInputItem[] = [];
  const clearIds: string[] = [];
  const seen = new Set<string>();
  const empty = (v: unknown) => v === null || v === undefined;

  for (const item of raw as Partial<StockInputItem>[]) {
    const id = item?.ingredientId;
    if (typeof id !== "string" || !allowedIds.has(id) || seen.has(id)) {
      return { ok: false, error: "Ada bahan stok yang tidak dikenal. Muat ulang halaman." };
    }
    seen.add(id);
    const { boughtKg, boughtPieces, leftover } = item;
    if (empty(boughtKg) && empty(boughtPieces) && empty(leftover)) {
      clearIds.push(id);
      continue;
    }
    if (!empty(boughtKg) && !isKg(boughtKg)) {
      return { ok: false, error: `Ayam dibeli harus 0–${STOCK_LIMITS.kgMax} kg, maksimal 2 angka di belakang koma.` };
    }
    if (!empty(boughtPieces) && !isInt(boughtPieces, STOCK_LIMITS.piecesMax)) {
      return { ok: false, error: `Jumlah potong harus angka bulat 0–${STOCK_LIMITS.piecesMax}.` };
    }
    if (!empty(leftover) && !isInt(leftover, STOCK_LIMITS.piecesMax)) {
      return { ok: false, error: `Sisa harus angka bulat 0–${STOCK_LIMITS.piecesMax} potong.` };
    }
    if (boughtKg === 0 && typeof boughtPieces === "number" && boughtPieces > 0) {
      return { ok: false, error: "Ada potong yang dibeli, tapi kg-nya 0. Periksa lagi." };
    }
    upserts.push({
      ingredientId: id,
      boughtKg: empty(boughtKg) ? null : (boughtKg as number),
      boughtPieces: empty(boughtPieces) ? null : (boughtPieces as number),
      leftover: empty(leftover) ? null : (leftover as number),
    });
  }
  return { ok: true, upserts, clearIds };
}

/**
 * Sisa freezer terakhir sebelum tanggal rekap. Hari tutup dilewati (stok tidak berubah);
 * hari buka yang sisanya tidak tercatat memutus rantai → null (tidak ditebak).
 * @param previousDates tanggal sebelum rekap, urut dari yang terdekat (mis. kemarin, lusa, …)
 */
export function findPreviousLeftover(
  previousDates: string[],
  leftoverByDate: Record<string, number | null | undefined>,
  closedDates: Set<string>,
): number | null {
  for (const d of previousDates) {
    const v = leftoverByDate[d];
    if (typeof v === "number") return v;
    if (!closedDates.has(d)) return null;
  }
  return null;
}

/** Rata-rata potong per kg dari belanja yang kg & potongnya terisi; null jika belum ada. */
export function averagePiecesPerKg(rows: { boughtKg: number | null; boughtPieces: number | null }[]): number | null {
  let kg = 0;
  let pieces = 0;
  for (const r of rows) {
    if (r.boughtKg && r.boughtKg > 0 && r.boughtPieces !== null) {
      kg += r.boughtKg;
      pieces += r.boughtPieces;
    }
  }
  return kg > 0 ? pieces / kg : null;
}

export type StockSummary = {
  /** Potong dibeli yang dipakai hitungan (asli atau perkiraan); 0 jika tidak ada belanja. */
  boughtPieces: number;
  /** True jika potong dibeli dihitung dari kg × perkiraan (jumlah potong tidak diisi). */
  estimated: boolean;
  /** Potong per kg hari ini (jika kg & potong terisi). */
  piecesPerKgToday: number | null;
  /** Null jika sisa terakhir tidak diketahui. */
  available: number | null;
  /** Null jika tersedia tidak diketahui atau rekap porsi belum diisi. */
  expectedLeftover: number | null;
  /** Null jika sisa seharusnya atau sisa dihitung belum ada. */
  difference: number | null;
};

export function computeStockSummary(input: {
  previousLeftover: number | null;
  boughtKg: number | null;
  boughtPieces: number | null;
  leftover: number | null;
  /** Perkiraan potong/kg: rata-rata 14 hari, atau angka di pengaturan bahan. */
  estimatePiecesPerKg: number;
  /** Potong terpakai menurut rekap porsi (Σ porsi × resep); null jika rekap porsi belum diisi. */
  usedByRecap: number | null;
}): StockSummary {
  const { previousLeftover, boughtKg, boughtPieces, leftover, estimatePiecesPerKg, usedByRecap } = input;
  let bought = 0;
  let estimated = false;
  if (boughtPieces !== null) bought = boughtPieces;
  else if (boughtKg !== null && boughtKg > 0) {
    bought = Math.round(boughtKg * estimatePiecesPerKg);
    estimated = true;
  }
  const piecesPerKgToday = boughtKg && boughtKg > 0 && boughtPieces !== null ? boughtPieces / boughtKg : null;
  const available = previousLeftover === null ? null : previousLeftover + bought;
  const expectedLeftover = available === null || usedByRecap === null ? null : available - usedByRecap;
  const difference = expectedLeftover === null || leftover === null ? null : expectedLeftover - leftover;
  return { boughtPieces: bought, estimated, piecesPerKgToday, available, expectedLeftover, difference };
}

/** Potong terpakai menurut rekap: Σ porsi kategori × takaran bahan per porsi. */
export function usedByRecap(
  qtyByMenu: Record<string, number>,
  qtyPerPortionByMenu: Record<string, number>,
): number {
  let total = 0;
  for (const [menuId, perPortion] of Object.entries(qtyPerPortionByMenu)) total += (qtyByMenu[menuId] ?? 0) * perPortion;
  return Math.round(total * 100) / 100;
}
