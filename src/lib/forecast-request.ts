/**
 * Menyusun body `POST /api/forecast` dan membaca response-nya (ARCHITECTURE §6.1, T-18).
 * Murni (tanpa database/env), dipakai `forecast-client.ts` dan bisa dites langsung.
 */
import { addDays } from "@/lib/date";

/** 7 hari: cukup untuk "besok" dan tampilan seminggu ke depan. Batas kontrak = 7. */
export const FORECAST_HORIZON = 7;
/** Batas kontrak: maks 400 baris riwayat per seri. */
export const FORECAST_HISTORY_MAX = 400;
const CONTEXT_MAX = 400;
const CONTEXT_TAGS = new Set(["ramai", "sepi", "libur", "gajian"]);

export type SalesRow = { date: string; menuId: string; qty: number };
export type ContextRow = { date: string; tag: string };
export type LeftoverRow = { date: string; ingredientId: string; leftover: number | null };
export type RecipeLink = { menuId: string; ingredientId: string };

export type ForecastRequestBody = {
  horizon: number;
  start_date: string;
  series: { menu_id: string; history: { date: string; qty: number }[]; censored_dates?: string[] }[];
  context: { date: string; tag: string }[];
};

export type BuildInput = {
  /** Kategori aktif, urut tampilan. */
  menuIds: string[];
  sales: SalesRow[];
  /** Semua penanda hari, termasuk `tutup`. */
  context: ContextRow[];
  /** Sisa freezer per bahan ayam; sisa 0 = stok habis hari itu. */
  leftovers: LeftoverRow[];
  /** Resep kategori → bahan ayam (hanya bahan ayam). */
  chickenRecipes: RecipeLink[];
  horizon?: number;
};

/**
 * Tanggal data terakhir = rekap porsi terakhir atau hari tutup terakhir.
 * Prediksi mulai sehari sesudahnya (§6.1).
 */
export function lastDataDate(sales: SalesRow[], context: ContextRow[]): string | null {
  let last: string | null = null;
  for (const s of sales) if (last === null || s.date > last) last = s.date;
  for (const c of context) if (c.tag === "tutup" && (last === null || c.date > last)) last = c.date;
  return last;
}

/** Null jika belum ada rekap penjualan sama sekali. */
export function buildForecastRequest(input: BuildInput): ForecastRequestBody | null {
  const horizon = input.horizon ?? FORECAST_HORIZON;
  const closed = new Set(input.context.filter((c) => c.tag === "tutup").map((c) => c.date));
  const sales = input.sales.filter((s) => !closed.has(s.date) && Number.isFinite(s.qty) && s.qty >= 0);
  if (sales.length === 0) return null;
  const last = lastDataDate(sales, input.context);
  if (last === null) return null;
  const start = addDays(last, 1);
  const end = addDays(start, horizon - 1);

  // Bahan ayam per kategori + tanggal stok habis per bahan.
  const chickenByMenu = new Map<string, Set<string>>();
  for (const r of input.chickenRecipes) {
    if (!chickenByMenu.has(r.menuId)) chickenByMenu.set(r.menuId, new Set());
    chickenByMenu.get(r.menuId)!.add(r.ingredientId);
  }
  const stockoutByIngredient = new Map<string, Set<string>>();
  for (const l of input.leftovers) {
    if (l.leftover !== 0) continue;
    if (!stockoutByIngredient.has(l.ingredientId)) stockoutByIngredient.set(l.ingredientId, new Set());
    stockoutByIngredient.get(l.ingredientId)!.add(l.date);
  }

  const byMenu = new Map<string, Map<string, number>>();
  for (const s of sales) {
    if (s.date >= start) continue;
    if (!byMenu.has(s.menuId)) byMenu.set(s.menuId, new Map());
    byMenu.get(s.menuId)!.set(s.date, s.qty);
  }

  let firstDate = start;
  const series = input.menuIds.map((menuId) => {
    const history = [...(byMenu.get(menuId) ?? new Map<string, number>())]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .slice(-FORECAST_HISTORY_MAX)
      .map(([date, qty]) => ({ date, qty }));
    if (history.length > 0 && history[0].date < firstDate) firstDate = history[0].date;

    const dates = new Set(history.map((h) => h.date));
    const censored = new Set<string>();
    for (const ing of chickenByMenu.get(menuId) ?? []) {
      for (const d of stockoutByIngredient.get(ing) ?? []) if (dates.has(d)) censored.add(d);
    }
    return censored.size > 0
      ? { menu_id: menuId, history, censored_dates: [...censored].sort() }
      : { menu_id: menuId, history };
  });

  const context = input.context
    .filter((c) => CONTEXT_TAGS.has(c.tag) && c.date >= firstDate && c.date <= end)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-CONTEXT_MAX)
    .map((c) => ({ date: c.date, tag: c.tag }));

  return { horizon, start_date: start, series, context };
}

// ── Response ────────────────────────────────────────────────────────────────
export type ForecastPoint = { date: string; predicted: number; lower: number | null; upper: number | null };
export type ForecastResult = {
  menuId: string;
  model: string | null;
  errorPct: number | null;
  dataDays: number;
  forecast: ForecastPoint[];
  warnings: string[];
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (isNum(v) ? v : null);

/** Validasi bentuk response; lempar Error jika tidak sesuai kontrak (jangan simpan data aneh). */
export function parseForecastResponse(json: unknown, menuIds: string[]): ForecastResult[] {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results)) throw new Error("Response forecast tanpa 'results'.");
  const known = new Set(menuIds);
  return results.map((r: Record<string, unknown>) => {
    if (typeof r?.menu_id !== "string" || !known.has(r.menu_id)) throw new Error("menu_id tidak dikenal.");
    if (!Array.isArray(r.forecast)) throw new Error("forecast bukan daftar.");
    const forecast = r.forecast.map((p: Record<string, unknown>) => {
      if (typeof p?.date !== "string" || !isNum(p.predicted) || p.predicted < 0) {
        throw new Error("Titik forecast tidak valid.");
      }
      return { date: p.date, predicted: p.predicted, lower: numOrNull(p.lower), upper: numOrNull(p.upper) };
    });
    return {
      menuId: r.menu_id,
      model: typeof r.model === "string" ? r.model : null,
      errorPct: numOrNull(r.error_pct),
      dataDays: isNum(r.data_days) ? r.data_days : 0,
      forecast,
      warnings: Array.isArray(r.warnings) ? r.warnings.filter((w): w is string => typeof w === "string") : [],
    };
  });
}

/** Pesan Indonesia untuk status HTTP dari fungsi forecast. */
export function forecastHttpError(status: number, apiMessage: string | null): string {
  if (status === 401) return "Kunci rahasia forecast tidak cocok (cek FORECAST_SECRET di server).";
  if (status === 503) return "FORECAST_SECRET belum diatur di fungsi forecast.";
  if (status === 400) return `Data ditolak fungsi forecast: ${apiMessage ?? "format tidak sesuai"}.`;
  if (status === 404) return "Fungsi forecast tidak ditemukan (cek FORECAST_URL).";
  if (status === 413) return "Data terlalu besar untuk fungsi forecast.";
  return `Fungsi forecast error (HTTP ${status}).`;
}
