/**
 * Menyusun angka Beranda, Prediksi, dan Bahan dari data tersimpan + hasil forecast terakhir (T-19, T-20).
 * Murni (tanpa database), dipakai `lib/data/dashboard.ts` dan bisa dites langsung.
 */
import { addDays } from "@/lib/date";
import {
  type Ingredient,
  ingredientNeeds,
  type IngredientNeed,
  type RecipeItem as NeedRecipe,
} from "@/lib/recommend";
import {
  averagePiecesPerKg,
  computeStockSummary,
  findPreviousLeftover,
  PIECES_PER_KG_WINDOW_DAYS,
  usedByRecap,
} from "@/lib/stock";
import { chickenWasteByDate, chickenWasteSummary, type WasteFact } from "@/lib/waste";

export type ChartPoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
  band: [number, number] | null;
};

export type ForecastPoint = { date: string; predicted: number; lower: number | null; upper: number | null };

/** Bentuk hasil forecast tersimpan yang dibutuhkan (sama dengan `LatestForecast` di forecast-client). */
export type StoredForecast = {
  last: { status: "ok" | "failed"; createdAt: string; error: string | null } | null;
  ok: {
    createdAt: string;
    startDate: string;
    horizon: number;
    menus: Record<
      string,
      {
        model: string | null;
        error_pct: number | null;
        data_days: number;
        warnings: string[];
        baseline_error_pct?: number | null;
        alpha?: number | null;
        factors?: { key: string; effect: number }[];
      }
    >;
    points: (ForecastPoint & { menuId: string })[];
  } | null;
};

export type DashboardInput = {
  today: string;
  menus: { id: string; name: string }[];
  /** Penjualan ±45 hari terakhir (hari tutup tidak ada barisnya). */
  sales: { date: string; menuId: string; qty: number }[];
  closedDates: string[];
  forecast: StoredForecast;
  ingredients: { id: string; name: string; unit: string; isChicken: boolean; piecesPerKg: number | null }[];
  recipes: Record<string, { ingredientId: string; qty: number }[]>;
  bufferPct: number;
  /** Stok bahan ayam ±21 hari terakhir. */
  stock: { date: string; ingredientId: string; boughtKg: number | null; boughtPieces: number | null; leftover: number | null }[];
  /** Catatan food waste ±21 hari terakhir (T-21). */
  waste: WasteFact[];
};

export type CategoryView = {
  id: string;
  name: string;
  last7: number;
  model: string | null;
  errorPct: number | null;
  /** Error rata-rata 7 hari sebagai pembanding (null jika belum diuji / run lama). */
  baselineErrorPct: number | null;
  factors: { key: string; effect: number }[];
  dataDays: number;
  warnings: string[];
  points: ForecastPoint[];
};

export type LeftoverInfo = { ingredientId: string; name: string; pieces: number; date: string };

export type DashboardSnapshot = {
  today: string;
  tomorrow: string;
  lastDataDate: string | null;
  forecast: {
    createdAt: string;
    startDate: string;
    endDate: string;
    /** Ada rekap baru (tanggal ≥ start) setelah prediksi dihitung. */
    stale: boolean;
  } | null;
  lastFailed: { at: string; error: string } | null;
  /** Tanggal yang dipakai kartu utama: besok jika ada di prediksi, selain itu titik terdekat ≥ hari ini. */
  focusDate: string | null;
  categories: CategoryView[];
  totalPoints: { date: string; predicted: number }[];
  chart: ChartPoint[];
  needs: { focus: IngredientNeed[]; week: IngredientNeed[]; weekRange: [string, string] | null };
  leftovers: LeftoverInfo[];
  stats: {
    sold7: number;
    soldPrev7: number;
    openDays7: number;
    avgPerDay7: number;
    /** Jumlah selisih stok ayam 7 hari (potong tidak tercatat); null jika belum ada hari yang bisa dihitung. */
    /**
     * Selisih stok ayam 7 hari (D-29): `pieces` = Σ selisih harian, `untracked` = selisih dikurangi waste ayam
     * yang tercatat di hari-hari itu. Null jika belum ada hari yang bisa dihitung.
     */
    stockDiff: { pieces: number; untracked: number; days: number } | null;
    /** Ayam terbuang tercatat 7 hari s.d. tanggal data terakhir (potong) dan tingkatnya. */
    waste: { pieces: number; ratePct: number | null };
  };
  bufferPct: number;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const CHART_DAYS = 30;

export function buildDashboard(input: DashboardInput): DashboardSnapshot {
  const { today, menus, forecast, bufferPct } = input;
  const tomorrow = addDays(today, 1);
  const closed = new Set(input.closedDates);
  const sales = input.sales.filter((s) => !closed.has(s.date) && s.date <= today);

  // Penjualan per tanggal (total & per kategori).
  const totalByDate = new Map<string, number>();
  const byDateMenu = new Map<string, Record<string, number>>();
  for (const s of sales) {
    totalByDate.set(s.date, (totalByDate.get(s.date) ?? 0) + s.qty);
    (byDateMenu.get(s.date) ?? byDateMenu.set(s.date, {}).get(s.date)!)[s.menuId] = s.qty;
  }
  const lastDataDate = [...totalByDate.keys()].sort().at(-1) ?? null;
  const window7 = lastDataDate ? Array.from({ length: 7 }, (_, i) => addDays(lastDataDate, -i)) : [];
  const windowPrev7 = lastDataDate ? Array.from({ length: 7 }, (_, i) => addDays(lastDataDate, -7 - i)) : [];

  // ── Prediksi ──
  const ok = forecast.ok;
  const points = ok?.points ?? [];
  const pointDates = [...new Set(points.map((p) => p.date))].sort();
  const focusDate = pointDates.includes(tomorrow) ? tomorrow : (pointDates.find((d) => d >= today) ?? null);
  const futureDates = focusDate ? pointDates.filter((d) => d >= focusDate) : [];

  const categories: CategoryView[] = menus.map((m) => {
    const summary = ok?.menus[m.id];
    return {
      id: m.id,
      name: m.name,
      last7: sum(window7.map((d) => byDateMenu.get(d)?.[m.id] ?? 0)),
      model: summary?.model ?? null,
      errorPct: summary?.error_pct ?? null,
      baselineErrorPct: summary?.baseline_error_pct ?? null,
      factors: summary?.factors ?? [],
      dataDays: summary?.data_days ?? 0,
      warnings: summary?.warnings ?? [],
      points: points
        .filter((p) => p.menuId === m.id)
        .map(({ date, predicted, lower, upper }) => ({ date, predicted, lower, upper })),
    };
  });
  const activeIds = new Set(menus.map((m) => m.id));
  const totalPoints = pointDates.map((date) => ({
    date,
    predicted: sum(points.filter((p) => p.date === date && activeIds.has(p.menuId)).map((p) => p.predicted)),
  }));

  // ── Grafik: 30 hari aktual + prediksi total (tanpa kisaran: kisaran per kategori tidak bisa dijumlah) ──
  const chart: ChartPoint[] = [];
  if (lastDataDate) {
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const date = addDays(lastDataDate, -i);
      chart.push({ date, actual: totalByDate.get(date) ?? null, predicted: null, band: null });
    }
    // Sambungkan garis prediksi ke titik aktual terakhir jika prediksi mulai tepat sehari sesudahnya.
    if (ok && ok.startDate === addDays(lastDataDate, 1)) chart[chart.length - 1].predicted = chart[chart.length - 1].actual;
  }
  for (const p of totalPoints) {
    if (lastDataDate && p.date <= lastDataDate) continue;
    chart.push({ date: p.date, actual: null, predicted: Math.round(p.predicted), band: null });
  }

  // ── Stok ayam: sisa terakhir, potong/kg rata-rata 14 hari, selisih 7 hari ──
  const chicken = input.ingredients.filter((i) => i.isChicken);
  const stockBy = new Map<string, Map<string, DashboardInput["stock"][number]>>();
  for (const s of input.stock) {
    if (s.date > today) continue;
    (stockBy.get(s.ingredientId) ?? stockBy.set(s.ingredientId, new Map()).get(s.ingredientId)!).set(s.date, s);
  }
  const avgFrom = addDays(today, -(PIECES_PER_KG_WINDOW_DAYS - 1));
  const leftovers: LeftoverInfo[] = [];
  const piecesPerKgUsed = new Map<string, number>();
  let diffPieces = 0;
  let diffUntracked = 0;
  let diffDays = 0;
  for (const ing of chicken) {
    const rows = stockBy.get(ing.id) ?? new Map();
    const avg = averagePiecesPerKg(
      [...rows.values()]
        .filter((r) => r.date >= avgFrom)
        .map((r) => ({ boughtKg: r.boughtKg, boughtPieces: r.boughtPieces })),
    );
    const estimate = avg ?? ing.piecesPerKg ?? 9;
    piecesPerKgUsed.set(ing.id, estimate);

    const latest = [...rows.values()].filter((r) => r.leftover !== null).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (latest) leftovers.push({ ingredientId: ing.id, name: ing.name, pieces: latest.leftover!, date: latest.date });

    const leftoverByDate = Object.fromEntries([...rows.values()].map((r) => [r.date, r.leftover]));
    const perPortion = Object.fromEntries(
      Object.entries(input.recipes).flatMap(([menuId, items]) =>
        items.filter((r) => r.ingredientId === ing.id).map((r) => [menuId, r.qty] as const),
      ),
    );
    if (Object.keys(perPortion).length === 0) continue;
    const wasteBy = chickenWasteByDate(input.waste, ing.id, perPortion);
    for (const d of window7) {
      const row = rows.get(d);
      const daySales = byDateMenu.get(d);
      if (!row || row.leftover === null || closed.has(d) || !daySales) continue;
      const prevDates = Array.from({ length: 7 }, (_, i) => addDays(d, -(i + 1)));
      const s = computeStockSummary({
        previousLeftover: findPreviousLeftover(prevDates, leftoverByDate, closed),
        boughtKg: row.boughtKg,
        boughtPieces: row.boughtPieces,
        leftover: row.leftover,
        estimatePiecesPerKg: estimate,
        usedByRecap: usedByRecap(daySales, perPortion),
      });
      if (s.difference !== null) {
        diffPieces += s.difference;
        diffUntracked += s.difference - (wasteBy.get(d) ?? 0);
        diffDays += 1;
      }
    }
  }

  // ── Kebutuhan bahan (§7): prediksi × resep + cadangan − sisa freezer, ayam → kg ──
  const needIngredients: Ingredient[] = input.ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    isChicken: i.isChicken,
    piecesPerKg: i.isChicken ? (piecesPerKgUsed.get(i.id) ?? i.piecesPerKg) : null,
  }));
  const needRecipes: NeedRecipe[] = Object.entries(input.recipes).flatMap(([menuId, items]) =>
    items.map((r) => ({ menuId, ingredientId: r.ingredientId, qtyPerPortion: r.qty })),
  );
  const stockForNeeds = Object.fromEntries(leftovers.map((l) => [l.ingredientId, l.pieces]));
  const predictedBy = (dates: string[]) => {
    const out: Record<string, number> = {};
    for (const p of points) if (dates.includes(p.date) && activeIds.has(p.menuId)) out[p.menuId] = (out[p.menuId] ?? 0) + p.predicted;
    return out;
  };
  const needs = (dates: string[]) =>
    dates.length === 0 ? [] : ingredientNeeds(predictedBy(dates), needRecipes, needIngredients, bufferPct, stockForNeeds);

  const wasteSummary = lastDataDate
    ? chickenWasteSummary({
        end: lastDataDate,
        days: 7,
        waste: input.waste,
        sales,
        chickenIds: chicken.map((c) => c.id),
        recipes: input.recipes,
      })
    : null;
  const wasteStats = { pieces: wasteSummary?.pieces7 ?? 0, ratePct: wasteSummary?.ratePct7 ?? null };

  const failedIsNewest =
    forecast.last?.status === "failed" && (!ok || forecast.last.createdAt > ok.createdAt);
  const sold7 = sum(window7.map((d) => totalByDate.get(d) ?? 0));
  const openDays7 = window7.filter((d) => totalByDate.has(d)).length;

  return {
    today,
    tomorrow,
    lastDataDate,
    forecast: ok
      ? {
          createdAt: ok.createdAt,
          startDate: ok.startDate,
          endDate: addDays(ok.startDate, Math.max(ok.horizon, 1) - 1),
          stale: lastDataDate !== null && lastDataDate >= ok.startDate,
        }
      : null,
    lastFailed:
      failedIsNewest && forecast.last
        ? { at: forecast.last.createdAt, error: forecast.last.error ?? "Penyebab tidak diketahui." }
        : null,
    focusDate,
    categories,
    totalPoints,
    chart,
    needs: {
      focus: needs(focusDate ? [focusDate] : []),
      week: needs(futureDates),
      weekRange: futureDates.length > 0 ? [futureDates[0], futureDates[futureDates.length - 1]] : null,
    },
    leftovers,
    stats: {
      sold7,
      soldPrev7: sum(windowPrev7.map((d) => totalByDate.get(d) ?? 0)),
      openDays7,
      avgPerDay7: openDays7 > 0 ? sold7 / openDays7 : 0,
      stockDiff: diffDays > 0 ? { pieces: diffPieces, untracked: diffUntracked, days: diffDays } : null,
      waste: wasteStats,
    },
    bufferPct,
  };
}

/** Nama model untuk ditampilkan (§6.2). */
export function modelLabel(model: string | null): string {
  if (model === "ridge") return "Ridge regression (machine learning)";
  if (model === "ma7") return "Rata-rata 7 hari (data belum cukup untuk machine learning)";
  if (model === "snaive") return "Pola minggu lalu"; // hanya di hasil lama sebelum D-33
  return "Belum ada";
}

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const FACTOR_LABELS: Record<string, string> = {
  tgl_1_5: "Tanggal 1–5 (awal bulan)",
  tgl_6_10: "Tanggal 6–10",
  tag_ramai: "Hari ditandai ramai",
  tag_sepi: "Hari ditandai sepi",
  tag_libur: "Hari libur",
  tag_gajian: "Hari gajian",
  tren: "Tren",
};

/** Nama faktor Ridge (§6.2) untuk ditampilkan; hari_0 = Senin (weekday Python). */
export function factorLabel(key: string): string {
  const day = /^hari_([0-6])$/.exec(key);
  if (day) return DAY_NAMES[Number(day[1])];
  return FACTOR_LABELS[key] ?? key;
}

/**
 * Faktor yang cukup menonjol untuk ditampilkan: |pengaruh| ≥ max(0,5 porsi, 5% rata-rata prediksi),
 * urut dari yang terbesar. Faktor kecil di bawah ambang lebih mungkin kebetulan daripada pola.
 */
export function notableFactors(factors: { key: string; effect: number }[], avgPredicted: number) {
  const min = Math.max(0.5, 0.05 * avgPredicted);
  return factors.filter((f) => Math.abs(f.effect) >= min).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
}
