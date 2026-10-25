import "server-only";

/** Batas baris per permintaan Supabase (setelan max-rows bawaan). */
export const SUPABASE_PAGE = 1000;

/** Ambil semua baris sebuah query dengan berhalaman `.range()` (melewati batas 1000 baris). */
export async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE) {
    const { data, error } = await build(from, from + SUPABASE_PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < SUPABASE_PAGE) return rows;
  }
}
