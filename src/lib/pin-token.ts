/**
 * Token cookie PIN (ARCHITECTURE §8). Dipakai oleh proxy.ts DAN Server Actions.
 * Sengaja TIDAK mengimpor "server-only": paket itu menolak dipakai di Proxy.
 * Modul ini tetap hanya untuk server (memakai node:crypto & env rahasia).
 *
 * Format nilai cookie: "<exp>.<hmac-hex>"
 *   exp  = waktu kedaluwarsa (detik epoch)
 *   hmac = HMAC-SHA256(SESSION_SECRET, "pin:<exp>:<APP_PIN>")
 * PIN ikut ditandatangani → mengganti APP_PIN otomatis membatalkan semua perangkat.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PIN_COOKIE = "as_pin";
export const PIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

/** Halaman yang wajib PIN. Sumber tunggal untuk proxy.ts dan validasi `next`. */
export const PROTECTED_PREFIXES = ["/rekap", "/waste", "/pengaturan", "/import"] as const;
/** Halaman tanpa PIN yang boleh jadi tujuan kembali setelah PIN (mis. tombol Hitung ulang di Prediksi). */
const PUBLIC_RETURN_PATHS = ["/", "/prediksi", "/bahan"] as const;

function secrets(): { pin: string; secret: string } | null {
  const pin = process.env.APP_PIN?.trim();
  const secret = process.env.SESSION_SECRET?.trim();
  return pin && secret ? { pin, secret } : null;
}

function sign(exp: number, s: { pin: string; secret: string }): string {
  return createHmac("sha256", s.secret).update(`pin:${exp}:${s.pin}`).digest("hex");
}

/** Buat nilai cookie baru. Null jika APP_PIN/SESSION_SECRET belum diatur. */
export function createPinToken(nowSeconds = Math.floor(Date.now() / 1000)): string | null {
  const s = secrets();
  if (!s) return null;
  const exp = nowSeconds + PIN_MAX_AGE_SECONDS;
  return `${exp}.${sign(exp, s)}`;
}

/** True jika token valid, belum kedaluwarsa, dan dibuat dengan PIN & secret yang berlaku sekarang. */
export function verifyPinToken(
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const s = secrets();
  if (!s || !token) return false;
  const [expRaw, mac] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= nowSeconds || !mac || !/^[0-9a-f]{64}$/.test(mac)) return false;
  const expected = Buffer.from(sign(exp, s), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Path tujuan setelah PIN; hanya halaman terproteksi di aplikasi ini (cegah open redirect). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/rekap";
  const isProtected = PROTECTED_PREFIXES.some((p) => next === p || next.startsWith(`${p}/`));
  const isPublicReturn = (PUBLIC_RETURN_PATHS as readonly string[]).includes(next);
  return isProtected || isPublicReturn ? next : "/rekap";
}
