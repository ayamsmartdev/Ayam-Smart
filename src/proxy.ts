import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE, verifyPinToken } from "@/lib/pin-token";

/**
 * Pengecekan cepat (Next.js 16 "proxy", dulu middleware): halaman yang mengubah data
 * dialihkan ke /pin jika cookie PIN tidak valid.
 * Ini BUKAN satu-satunya pengaman — setiap Server Action tulis tetap memanggil isPinVerified().
 */
export function proxy(request: NextRequest) {
  if (verifyPinToken(request.cookies.get(PIN_COOKIE)?.value)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/pin";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

// Harus sama dengan PROTECTED_PREFIXES di lib/pin-token.ts (matcher wajib konstanta statis).
export const config = {
  matcher: ["/rekap/:path*", "/waste/:path*", "/pengaturan/:path*", "/import/:path*"],
};
