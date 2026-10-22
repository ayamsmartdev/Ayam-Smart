import "server-only";
import { getSupabase } from "@/lib/supabase-server";

export type AppSettings = { bufferPct: number; piecesPerChicken: number };

/** Nilai awal; sama dengan seed di 0001_init.sql. */
export const DEFAULT_SETTINGS: AppSettings = { bufferPct: 10, piecesPerChicken: 8 };

export const SETTINGS_LIMITS = {
  bufferPct: { min: 0, max: 100 },
  piecesPerChicken: { min: 1, max: 20 },
} as const;

const KEYS = { bufferPct: "buffer_pct", piecesPerChicken: "pieces_per_chicken" } as const;

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("key, value")
    .in("key", Object.values(KEYS));
  if (error) throw error;
  const byKey = new Map((data ?? []).map((r) => [r.key as string, Number(r.value)]));
  const pick = (k: keyof AppSettings) => {
    const v = byKey.get(KEYS[k]);
    return Number.isInteger(v) ? (v as number) : DEFAULT_SETTINGS[k];
  };
  return { bufferPct: pick("bufferPct"), piecesPerChicken: pick("piecesPerChicken") };
}

export function cleanSettingsInput(raw: unknown): { ok: true; value: AppSettings } | { ok: false; error: string } {
  const r = (raw ?? {}) as Partial<Record<keyof AppSettings, unknown>>;
  const buffer = Number(r.bufferPct);
  const pieces = Number(r.piecesPerChicken);
  const { bufferPct: b, piecesPerChicken: p } = SETTINGS_LIMITS;
  if (!Number.isInteger(buffer) || buffer < b.min || buffer > b.max) {
    return { ok: false, error: `Cadangan stok harus angka bulat ${b.min}–${b.max}%.` };
  }
  if (!Number.isInteger(pieces) || pieces < p.min || pieces > p.max) {
    return { ok: false, error: `Potong per ekor harus angka bulat ${p.min}–${p.max}.` };
  }
  return { ok: true, value: { bufferPct: buffer, piecesPerChicken: pieces } };
}

export function settingsRows(s: AppSettings) {
  return [
    { key: KEYS.bufferPct, value: s.bufferPct },
    { key: KEYS.piecesPerChicken, value: s.piecesPerChicken },
  ];
}
