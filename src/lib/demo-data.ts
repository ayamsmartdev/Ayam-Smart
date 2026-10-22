/**
 * DATA SIMULASI untuk pratinjau UI (D-08). Bukan data nyata klien.
 * Menu, resep, dan angka penjualan adalah contoh sampai klien mengirim data (PRD Q-01–Q-04).
 * Nilai deterministik per tanggal, jadi tampilan stabil saat halaman dimuat ulang.
 */
import { addDays, dayOfMonth, dayOfWeek } from "./date";

export type Unit = "potong" | "porsi" | "gram" | "gelas";

export type Menu = { id: string; name: string };
export type Ingredient = { id: string; name: string; unit: Unit; isChicken: boolean };
export type RecipeItem = { menuId: string; ingredientId: string; qtyPerPortion: number };
export type SalesRow = { date: string; menuId: string; qty: number };
export type WasteReason = "tidak_laku" | "rusak" | "kedaluwarsa" | "lainnya";
export type WasteRow = {
  id: string;
  date: string;
  itemName: string;
  qty: number;
  unit: Unit;
  reason: WasteReason;
  isChicken: boolean;
};

export const DEMO_MENUS: Menu[] = [
  { id: "geprek-nasi", name: "Ayam geprek + nasi" },
  { id: "geprek-saja", name: "Ayam geprek saja" },
  { id: "geprek-keju", name: "Geprek keju + nasi" },
  { id: "paket-esteh", name: "Paket geprek + es teh" },
];

export const DEMO_INGREDIENTS: Ingredient[] = [
  { id: "ayam", name: "Ayam", unit: "potong", isChicken: true },
  { id: "nasi", name: "Nasi", unit: "porsi", isChicken: false },
  { id: "tepung", name: "Tepung bumbu", unit: "gram", isChicken: false },
  { id: "cabai", name: "Cabai rawit", unit: "gram", isChicken: false },
  { id: "keju", name: "Keju parut", unit: "gram", isChicken: false },
  { id: "teh", name: "Es teh", unit: "gelas", isChicken: false },
];

export const DEMO_RECIPES: RecipeItem[] = [
  ...DEMO_MENUS.flatMap((m) => [
    { menuId: m.id, ingredientId: "ayam", qtyPerPortion: 1 },
    { menuId: m.id, ingredientId: "tepung", qtyPerPortion: 45 },
    { menuId: m.id, ingredientId: "cabai", qtyPerPortion: 25 },
  ]),
  { menuId: "geprek-nasi", ingredientId: "nasi", qtyPerPortion: 1 },
  { menuId: "geprek-keju", ingredientId: "nasi", qtyPerPortion: 1 },
  { menuId: "paket-esteh", ingredientId: "nasi", qtyPerPortion: 1 },
  { menuId: "geprek-keju", ingredientId: "keju", qtyPerPortion: 20 },
  { menuId: "paket-esteh", ingredientId: "teh", qtyPerPortion: 1 },
];

export const DEMO_SETTINGS = { bufferPct: 10, piecesPerChicken: 8 } as const;

export const WASTE_REASON_LABEL: Record<WasteReason, string> = {
  tidak_laku: "Tidak laku",
  rusak: "Rusak",
  kedaluwarsa: "Kedaluwarsa",
  lainnya: "Lainnya",
};

/** Jumlah hari riwayat simulasi. */
export const HISTORY_DAYS = 56;

const BASE_DEMAND: Record<string, number> = {
  "geprek-nasi": 38,
  "geprek-saja": 14,
  "geprek-keju": 11,
  "paket-esteh": 16,
};

/** Minggu … Sabtu: akhir pekan lebih ramai. */
const WEEKDAY_FACTOR = [1.22, 0.9, 0.88, 0.95, 1.0, 1.12, 1.3];

/** Bilangan semu-acak 0–1 yang selalu sama untuk kunci yang sama. */
function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function isPayday(date: string): boolean {
  const d = dayOfMonth(date);
  return d >= 25 || d <= 2;
}

function demandFor(date: string, menuId: string): number {
  const base = BASE_DEMAND[menuId] ?? 10;
  const weekday = WEEKDAY_FACTOR[dayOfWeek(date)];
  const payday = isPayday(date) ? 1.12 : 1;
  const noise = 0.88 + 0.24 * seeded(`${date}:${menuId}`);
  return Math.max(0, Math.round(base * weekday * payday * noise));
}

/** Riwayat penjualan simulasi sampai kemarin (rekap hari ini belum diisi). */
export function getDemoSales(today: string): SalesRow[] {
  const rows: SalesRow[] = [];
  for (let i = HISTORY_DAYS; i >= 1; i--) {
    const date = addDays(today, -i);
    for (const menu of DEMO_MENUS) {
      rows.push({ date, menuId: menu.id, qty: demandFor(date, menu.id) });
    }
  }
  return rows;
}

/** Catatan food waste simulasi 14 hari terakhir. */
export function getDemoWaste(today: string): WasteRow[] {
  const rows: WasteRow[] = [];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(today, -i);
    const r = seeded(`waste:${date}`);
    rows.push({
      id: `w-${date}-ayam`,
      date,
      itemName: "Ayam goreng",
      qty: 1 + Math.round(r * 4),
      unit: "potong",
      reason: r > 0.85 ? "rusak" : "tidak_laku",
      isChicken: true,
    });
    if (seeded(`waste-cabai:${date}`) > 0.8) {
      rows.push({
        id: `w-${date}-cabai`,
        date,
        itemName: "Cabai rawit",
        qty: 150,
        unit: "gram",
        reason: "kedaluwarsa",
        isChicken: false,
      });
    }
  }
  return rows.reverse();
}
