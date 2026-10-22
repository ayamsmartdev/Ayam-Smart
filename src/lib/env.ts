import "server-only";

/**
 * Akses environment variable server. Dibaca saat dipanggil (bukan saat import),
 * supaya build tidak gagal di halaman yang tidak memakainya.
 * Daftar lengkap: .env.example dan ARCHITECTURE §9.
 */
type EnvName =
  | "SUPABASE_URL"
  | "SUPABASE_SECRET_KEY"
  | "APP_PIN"
  | "SESSION_SECRET"
  | "FORECAST_URL"
  | "FORECAST_SECRET";

export class MissingEnvError extends Error {
  constructor(public readonly names: EnvName[]) {
    super(`Environment variable belum diisi: ${names.join(", ")}`);
    this.name = "MissingEnvError";
  }
}

/** Ambil beberapa env sekaligus; lempar MissingEnvError berisi semua yang kosong. */
export function requireEnv<const T extends EnvName>(...names: T[]): Record<T, string> {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length > 0) throw new MissingEnvError(missing);
  return Object.fromEntries(names.map((n) => [n, process.env[n]!.trim()])) as Record<T, string>;
}
