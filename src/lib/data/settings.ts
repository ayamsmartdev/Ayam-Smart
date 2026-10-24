import "server-only";
import { getSupabase } from "@/lib/supabase-server";

/** Setelan global. Potong per kg pindah ke tiap bahan (D-28). */
export type AppSettings = { bufferPct: number };

/** Nilai awal; sama dengan seed di 0001_init.sql. */
export const DEFAULT_SETTINGS: AppSettings = { bufferPct: 10 };

export const SETTINGS_LIMITS = {
  bufferPct: { min: 0, max: 100 },
} as const;

const KEYS = { bufferPct: "buffer_pct" } as const;

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("key, value")
    .in("key", Object.values(KEYS));
  if (error) throw error;
  const byKey = new Map((data ?? []).map((r) => [r.key as string, Number(r.value)]));
  const v = byKey.get(KEYS.bufferPct);
  return { bufferPct: Number.isInteger(v) ? (v as number) : DEFAULT_SETTINGS.bufferPct };
}

export function cleanSettingsInput(raw: unknown): { ok: true; value: AppSettings } | { ok: false; error: string } {
  const r = (raw ?? {}) as Partial<Record<keyof AppSettings, unknown>>;
  const buffer = Number(r.bufferPct);
  const { min, max } = SETTINGS_LIMITS.bufferPct;
  if (!Number.isInteger(buffer) || buffer < min || buffer > max) {
    return { ok: false, error: `Cadangan stok harus angka bulat ${min}–${max}%.` };
  }
  return { ok: true, value: { bufferPct: buffer } };
}

export function settingsRows(s: AppSettings) {
  return [{ key: KEYS.bufferPct, value: s.bufferPct }];
}
