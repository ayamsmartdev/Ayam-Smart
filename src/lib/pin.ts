import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PIN_COOKIE, verifyPinToken } from "./pin-token";
import { getSupabase } from "./supabase-server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Dipanggil di AWAL setiap Server Action yang mengubah data (jangan hanya andalkan proxy). */
export async function isPinVerified(): Promise<boolean> {
  const store = await cookies();
  return verifyPinToken(store.get(PIN_COOKIE)?.value);
}

/** Bandingkan PIN tanpa membocorkan panjang/isi lewat waktu respons. */
export function pinMatches(input: string): boolean {
  const expected = process.env.APP_PIN?.trim();
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Kunci rate limit: hash IP + secret, jadi IP asli tidak pernah disimpan. */
export function attemptKey(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex");
}

export type AttemptState =
  | { kind: "allowed"; count: number }
  | { kind: "blocked"; retryAfterMinutes: number };

export async function readAttempts(key: string, now = Date.now()): Promise<AttemptState> {
  const { data, error } = await getSupabase()
    .from("pin_attempts")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { kind: "allowed", count: 0 };

  const started = new Date(data.window_start).getTime();
  if (now - started >= WINDOW_MS) return { kind: "allowed", count: 0 };
  if (data.count >= MAX_ATTEMPTS) {
    return { kind: "blocked", retryAfterMinutes: Math.ceil((started + WINDOW_MS - now) / 60000) };
  }
  return { kind: "allowed", count: data.count };
}

/** Catat percobaan salah. Jika jendela lama sudah lewat (count 0), mulai jendela baru. */
export async function recordFailure(key: string, previousCount: number, now = Date.now()) {
  const table = getSupabase().from("pin_attempts");
  const { error } =
    previousCount === 0
      ? await table.upsert(
          { key, count: 1, window_start: new Date(now).toISOString() },
          { onConflict: "key" },
        )
      : await table.update({ count: previousCount + 1 }).eq("key", key);
  if (error) throw error;
}

export async function clearAttempts(key: string) {
  const { error } = await getSupabase().from("pin_attempts").delete().eq("key", key);
  if (error) throw error;
}

export const PIN_LIMITS = { MAX_ATTEMPTS, WINDOW_MINUTES: WINDOW_MS / 60000 } as const;
