/**
 * Menyusun semua angka pratinjau dari data simulasi.
 * Saat database tersambung, sumber data diganti ke Supabase; bentuk keluarannya dipertahankan.
 */
import { addDays, todayWIB } from "./date";
import {
  DEMO_INGREDIENTS,
  DEMO_MENUS,
  DEMO_RECIPES,
  DEMO_SETTINGS,
  getDemoSales,
  getDemoWaste,
  type Menu,
  type WasteRow,
} from "./demo-data";
import { forecastSeries, type SeriesForecast } from "./preview-forecast";
import { ingredientNeeds, type IngredientNeed } from "./recommend";

export type ChartPoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
  band: [number, number] | null;
};

export type MenuSummary = { menu: Menu; last7: number; forecast: SeriesForecast };

export type PreviewSnapshot = {
  today: string;
  tomorrow: string;
  lastDataDate: string;
  menus: MenuSummary[];
  total: SeriesForecast;
  chart: ChartPoint[];
  tomorrowNeeds: IngredientNeed[];
  fiveDayNeeds: IngredientNeed[];
  stats: {
    sold7: number;
    soldPrev7: number;
    avgPerDay7: number;
    wasteChicken7: number;
    wasteRate7: number;
  };
  waste: WasteRow[];
  settings: typeof DEMO_SETTINGS;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function getPreviewSnapshot(today: string = todayWIB()): PreviewSnapshot {
  const sales = getDemoSales(today);
  const waste = getDemoWaste(today);
  const lastDataDate = addDays(today, -1);
  const startDate = today; // prediksi dimulai sehari setelah data terakhir

  const totalByDate = new Map<string, number>();
  const menus: MenuSummary[] = DEMO_MENUS.map((menu) => {
    const series = new Map<string, number>();
    for (const row of sales.filter((r) => r.menuId === menu.id)) {
      series.set(row.date, row.qty);
      totalByDate.set(row.date, (totalByDate.get(row.date) ?? 0) + row.qty);
    }
    const last7 = sum([...Array(7)].map((_, i) => series.get(addDays(lastDataDate, -i)) ?? 0));
    return { menu, last7, forecast: forecastSeries(series, startDate) };
  });

  const total = forecastSeries(totalByDate, startDate);

  // Grafik: 30 hari aktual + 5 hari prediksi, garis prediksi tersambung dari titik aktual terakhir.
  const chart: ChartPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = addDays(lastDataDate, -i);
    const actual = totalByDate.get(date) ?? null;
    chart.push({
      date,
      actual,
      predicted: i === 0 ? actual : null,
      band: i === 0 && actual !== null ? [actual, actual] : null,
    });
  }
  for (const p of total.points) {
    chart.push({
      date: p.date,
      actual: null,
      predicted: Math.round(p.predicted),
      band: p.lower !== null && p.upper !== null ? [Math.round(p.lower), Math.round(p.upper)] : null,
    });
  }

  const predictedFor = (date: string) =>
    Object.fromEntries(
      menus.map((m) => [m.menu.id, m.forecast.points.find((p) => p.date === date)?.predicted ?? 0]),
    );
  const predictedFiveDays = Object.fromEntries(
    menus.map((m) => [m.menu.id, sum(m.forecast.points.map((p) => p.predicted))]),
  );

  const tomorrow = addDays(today, 1);
  const needs = (byMenu: Record<string, number>) =>
    ingredientNeeds(
      byMenu,
      DEMO_RECIPES,
      DEMO_INGREDIENTS,
      DEMO_SETTINGS.bufferPct,
      DEMO_SETTINGS.piecesPerChicken,
    );

  const soldOn = (date: string) => totalByDate.get(date) ?? 0;
  const sold7 = sum([...Array(7)].map((_, i) => soldOn(addDays(lastDataDate, -i))));
  const soldPrev7 = sum([...Array(7)].map((_, i) => soldOn(addDays(lastDataDate, -7 - i))));
  const weekStart = addDays(lastDataDate, -6);
  const wasteChicken7 = sum(
    waste.filter((w) => w.isChicken && w.date >= weekStart).map((w) => w.qty),
  );

  return {
    today,
    tomorrow,
    lastDataDate,
    menus,
    total,
    chart,
    tomorrowNeeds: needs(predictedFor(tomorrow)),
    fiveDayNeeds: needs(predictedFiveDays),
    stats: {
      sold7,
      soldPrev7,
      avgPerDay7: sold7 / 7,
      wasteChicken7,
      wasteRate7: (wasteChicken7 / (sold7 + wasteChicken7)) * 100,
    },
    waste,
    settings: DEMO_SETTINGS,
  };
}
