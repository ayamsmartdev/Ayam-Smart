/**
 * Helper tanggal bisnis. Semua tanggal berupa string "YYYY-MM-DD" di zona Asia/Jakarta.
 * Jangan pakai `new Date().toISOString().slice(0, 10)` untuk "hari ini" — itu tanggal UTC.
 */
const TZ = "Asia/Jakarta";

/** Tanggal hari ini menurut WIB, format YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Tanggal kalender sebagai Date pada tengah malam UTC (hanya untuk aritmetika & format). */
function toCalendarDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Tambah/kurangi hari. Aman dipakai toISOString karena basisnya tengah malam UTC. */
export function addDays(date: string, days: number): string {
  const t = toCalendarDate(date);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** 0 = Minggu … 6 = Sabtu. */
export function dayOfWeek(date: string): number {
  return toCalendarDate(date).getUTCDay();
}

export function dayOfMonth(date: string): number {
  return toCalendarDate(date).getUTCDate();
}

function format(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...options }).format(
    toCalendarDate(date),
  );
}

/** "Jum, 23 Okt" */
export const formatDayShort = (date: string) =>
  format(date, { weekday: "short", day: "numeric", month: "short" });

/** "Jumat, 23 Oktober" */
export const formatDayLong = (date: string) =>
  format(date, { weekday: "long", day: "numeric", month: "long" });

/** "Jumat" */
export const formatWeekday = (date: string) => format(date, { weekday: "long" });

/** "23 Okt" */
export const formatDayMonth = (date: string) => format(date, { day: "numeric", month: "short" });

/** Label relatif singkat: "Hari ini", "Besok", "Kemarin", atau nama hari. */
export function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Hari ini";
  if (date === addDays(today, 1)) return "Besok";
  if (date === addDays(today, -1)) return "Kemarin";
  return formatWeekday(date);
}
