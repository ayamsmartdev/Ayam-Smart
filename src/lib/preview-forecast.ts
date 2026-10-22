/**
 * Forecast PRATINJAU (sementara, di TypeScript) agar UI bisa dicoba sebelum model Python siap.
 * Metode: rata-rata penjualan di hari yang sama selama 4 minggu terakhir (fallback: rata-rata 7 hari).
 * Akan digantikan pipeline forecast di ARCHITECTURE §6. Error dihitung jujur lewat backtest.
 */
import { addDays } from "./date";

export type ForecastPoint = {
  date: string;
  predicted: number;
  lower: number | null;
  upper: number | null;
};

export type SeriesForecast = {
  points: ForecastPoint[];
  /** WAPE backtest 14 hari terakhir, dalam persen. */
  errorPct: number | null;
  dataDays: number;
};

const WEEKS_BACK = 4;
const BACKTEST_DAYS = 14;
const MIN_RESIDUALS_FOR_RANGE = 10;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Prediksi satu tanggal hanya dari data sebelum `cutoff` (tidak bocor ke masa depan). */
function predictOne(series: Map<string, number>, target: string, cutoff: string): number {
  const sameWeekday: number[] = [];
  for (let k = 1; k <= WEEKS_BACK; k++) {
    const d = addDays(target, -7 * k);
    const v = series.get(d);
    if (d < cutoff && v !== undefined) sameWeekday.push(v);
  }
  if (sameWeekday.length > 0) return mean(sameWeekday);

  const recent: number[] = [];
  for (let k = 1; k <= 7; k++) {
    const v = series.get(addDays(cutoff, -k));
    if (v !== undefined) recent.push(v);
  }
  return recent.length > 0 ? mean(recent) : 0;
}

/**
 * @param series tanggal → jumlah terjual (hanya hari yang ada datanya)
 * @param startDate tanggal pertama yang diprediksi (hari setelah data terakhir)
 */
export function forecastSeries(
  series: Map<string, number>,
  startDate: string,
  horizon = 5,
): SeriesForecast {
  const dates = [...series.keys()].sort();
  const backtestDates = dates.slice(-BACKTEST_DAYS);

  const residuals: number[] = [];
  let absError = 0;
  let actualSum = 0;
  for (const d of backtestDates) {
    const actual = series.get(d) ?? 0;
    const pred = predictOne(series, d, d);
    residuals.push(actual - pred);
    absError += Math.abs(actual - pred);
    actualSum += actual;
  }

  const errorPct = actualSum > 0 && backtestDates.length > 0 ? (absError / actualSum) * 100 : null;
  const sorted = [...residuals].sort((a, b) => a - b);
  const hasRange = sorted.length >= MIN_RESIDUALS_FOR_RANGE;
  const lowAdj = hasRange ? quantile(sorted, 0.1) : 0;
  const highAdj = hasRange ? quantile(sorted, 0.9) : 0;

  const points: ForecastPoint[] = [];
  for (let h = 0; h < horizon; h++) {
    const date = addDays(startDate, h);
    const predicted = predictOne(series, date, startDate);
    points.push({
      date,
      predicted,
      lower: hasRange ? Math.max(0, predicted + lowAdj) : null,
      upper: hasRange ? Math.max(0, predicted + highAdj) : null,
    });
  }

  return { points, errorPct, dataDays: dates.length };
}
