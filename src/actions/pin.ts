"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  attemptKey,
  clearAttempts,
  PIN_LIMITS,
  pinMatches,
  readAttempts,
  recordFailure,
} from "@/lib/pin";
import { createPinToken, PIN_COOKIE, PIN_MAX_AGE_SECONDS, safeNextPath } from "@/lib/pin-token";

export type PinFormState = { error: string | null };

export async function submitPin(_prev: PinFormState, formData: FormData): Promise<PinFormState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "PIN berupa 4–8 angka." };
  }
  if (!process.env.APP_PIN?.trim() || !process.env.SESSION_SECRET?.trim()) {
    return { error: "PIN belum diatur di server. Hubungi pengelola aplikasi." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = attemptKey(ip);

  // Gagal membaca batas percobaan → tolak (fail-closed), jangan biarkan tebak PIN tanpa batas.
  let state;
  try {
    state = await readAttempts(key);
  } catch {
    return { error: "PIN belum bisa diperiksa karena database tidak terjangkau. Coba lagi sebentar." };
  }
  if (state.kind === "blocked") {
    return {
      error: `Terlalu banyak percobaan. Coba lagi dalam ${state.retryAfterMinutes} menit.`,
    };
  }

  if (!pinMatches(pin)) {
    try {
      await recordFailure(key, state.count);
    } catch {
      return { error: "PIN belum bisa diperiksa karena database tidak terjangkau. Coba lagi sebentar." };
    }
    const left = PIN_LIMITS.MAX_ATTEMPTS - (state.count + 1);
    return {
      error:
        left > 0
          ? `PIN salah. Sisa ${left} percobaan.`
          : `PIN salah. Coba lagi dalam ${PIN_LIMITS.WINDOW_MINUTES} menit.`,
    };
  }

  const token = createPinToken();
  if (!token) return { error: "PIN belum diatur di server. Hubungi pengelola aplikasi." };

  await clearAttempts(key).catch(() => undefined); // tidak kritis
  const store = await cookies();
  store.set(PIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_MAX_AGE_SECONDS,
  });

  redirect(next);
}
