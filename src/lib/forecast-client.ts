import "server-only";
import { addDays, todayWIB } from "@/lib/date";
import {
  buildForecastRequest,
  FORECAST_HISTORY_MAX,
  forecastHttpError,
  parseForecastResponse,
  type ForecastResult,
} from "@/lib/forecast-request";
import { selectAll } from "@/lib/data/select-all";
import type { Dataset } from "@/lib/dataset";
import { getSupabase } from "@/lib/supabase-server";

/**
 * Panggil fungsi forecast Python lalu simpan hasilnya (ARCHITECTURE §5–§6, T-18).
 * - Data: penjualan ≤ 400 hari terakhir, hari tutup dikeluarkan, hari stok ayam habis → `censored_dates`.
 * - Berhasil: 1 baris `forecast_runs` (status ok, ringkasan per kategori di `summary`) + titik di `forecasts`.
 * - Gagal: 1 baris `forecast_runs` status failed + pesan; data rekap tidak tersentuh.
 */

export type { Dataset };
export type ForecastOutcome =
  | { ok: true; runId: string; startDate: string; message: string }
  | { ok: false; error: string };

/** Ringkasan per kategori, disimpan di `forecast_runs.summary.menus`. */
export type MenuSummary = { model: string | null; error_pct: number | null; data_days: number; warnings: string[] };

const TIMEOUT_MS = 20_000;
const KEEP_RUNS_DAYS = 30;

type Supabase = ReturnType<typeof getSupabase>;

/** Galat dengan pesan yang aman ditampilkan ke pengguna. */
class ForecastError extends Error {}

function forecastConfig(): { url: string; secret: string } | null {
  const secret = process.env.FORECAST_SECRET?.trim();
  const explicit = process.env.FORECAST_URL?.trim();
  // Di Vercel boleh tanpa FORECAST_URL: pakai domain produksi (bukan URL deployment yang bisa diproteksi).
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (production ? `https://${production}/api/forecast` : "");
  return secret && url ? { url, secret } : null;
}

async function loadInput(supabase: Supabase, dataset: Dataset) {
  const since = addDays(todayWIB(), -(FORECAST_HISTORY_MAX + 7));
  const [menus, chicken] = await Promise.all([
    supabase.from("menus").select("id").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("ingredients").select("id").eq("is_chicken", true),
  ]);
  if (menus.error) throw menus.error;
  if (chicken.error) throw chicken.error;
  const menuIds = (menus.data ?? []).map((m) => m.id as string);
  const chickenIds = (chicken.data ?? []).map((i) => i.id as string);

  const [sales, context, leftovers, recipes] = await Promise.all([
    selectAll<{ sale_date: string; menu_id: string; qty: number }>((from, to) =>
      supabase
        .from("daily_sales")
        .select("sale_date, menu_id, qty")
        .eq("dataset", dataset)
        .gte("sale_date", since)
        .order("sale_date")
        .order("menu_id")
        .range(from, to),
    ),
    selectAll<{ ctx_date: string; tag: string }>((from, to) =>
      supabase
        .from("daily_context")
        .select("ctx_date, tag")
        .eq("dataset", dataset)
        .gte("ctx_date", since)
        .order("ctx_date")
        .range(from, to),
    ),
    chickenIds.length === 0
      ? Promise.resolve([])
      : selectAll<{ stock_date: string; ingredient_id: string; leftover_pieces: number | null }>((from, to) =>
          supabase
            .from("daily_stock")
            .select("stock_date, ingredient_id, leftover_pieces")
            .eq("dataset", dataset)
            .in("ingredient_id", chickenIds)
            .gte("stock_date", since)
            .order("stock_date")
            .order("ingredient_id")
            .range(from, to),
        ),
    chickenIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("menu_ingredients").select("menu_id, ingredient_id").in("ingredient_id", chickenIds),
  ]);
  if (recipes.error) throw recipes.error;

  return {
    menuIds,
    sales: sales.map((s) => ({ date: s.sale_date, menuId: s.menu_id, qty: Number(s.qty) })),
    context: context.map((c) => ({ date: c.ctx_date, tag: c.tag })),
    leftovers: leftovers.map((l) => ({
      date: l.stock_date,
      ingredientId: l.ingredient_id,
      leftover: l.leftover_pieces === null ? null : Number(l.leftover_pieces),
    })),
    chickenRecipes: (recipes.data ?? []).map((r) => ({
      menuId: r.menu_id as string,
      ingredientId: r.ingredient_id as string,
    })),
  };
}

async function callForecast(url: string, secret: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forecast-Secret": secret },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ForecastError("Fungsi forecast tidak merespons. Coba Hitung ulang sebentar lagi.");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const apiMessage = typeof (json as { error?: unknown })?.error === "string" ? (json as { error: string }).error : null;
    throw new ForecastError(forecastHttpError(res.status, apiMessage));
  }
  return json;
}

async function recordFailure(supabase: Supabase, dataset: Dataset, error: string) {
  try {
    await supabase.from("forecast_runs").insert({ dataset, status: "failed", summary: { error } });
  } catch {
    // Database juga tidak terjangkau: cukup kembalikan pesan ke pengguna.
  }
}

async function saveRun(
  supabase: Supabase,
  dataset: Dataset,
  startDate: string,
  horizon: number,
  results: ForecastResult[],
  meta: unknown,
): Promise<string> {
  const menus: Record<string, MenuSummary> = Object.fromEntries(
    results.map((r) => [
      r.menuId,
      { model: r.model, error_pct: r.errorPct, data_days: r.dataDays, warnings: r.warnings },
    ]),
  );
  const run = await supabase
    .from("forecast_runs")
    .insert({ dataset, status: "ok", summary: { start_date: startDate, horizon, menus, meta } })
    .select("id")
    .single();
  if (run.error || !run.data) throw run.error ?? new Error("Gagal membuat forecast_runs.");
  const runId = run.data.id as string;

  const rows = results.flatMap((r) =>
    r.forecast.map((p) => ({
      run_id: runId,
      dataset,
      target_date: p.date,
      menu_id: r.menuId,
      predicted: p.predicted,
      lower: p.lower,
      upper: p.upper,
    })),
  );
  if (rows.length > 0) {
    const ins = await supabase.from("forecasts").insert(rows);
    if (ins.error) {
      // Jangan tinggalkan run "ok" tanpa titik prediksi.
      await supabase.from("forecast_runs").delete().eq("id", runId);
      throw ins.error;
    }
  }

  // Bersihkan run lama (titiknya ikut terhapus lewat on delete cascade).
  const cutoff = new Date(Date.now() - KEEP_RUNS_DAYS * 86_400_000).toISOString();
  await supabase.from("forecast_runs").delete().eq("dataset", dataset).lt("created_at", cutoff);
  return runId;
}

/** Hitung ulang forecast satu dataset dan simpan hasilnya. Tidak pernah melempar. */
export async function runForecast(dataset: Dataset): Promise<ForecastOutcome> {
  try {
    return await runForecastUnsafe(dataset);
  } catch {
    return { ok: false, error: "Forecast gagal dihitung karena galat di server. Coba Hitung ulang." };
  }
}

async function runForecastUnsafe(dataset: Dataset): Promise<ForecastOutcome> {
  const supabase = getSupabase();
  const config = forecastConfig();
  if (!config) {
    const error = "Pengaturan forecast di server belum lengkap (FORECAST_URL / FORECAST_SECRET).";
    await recordFailure(supabase, dataset, error);
    return { ok: false, error };
  }

  let input;
  try {
    input = await loadInput(supabase, dataset);
  } catch {
    return { ok: false, error: "Database tidak terjangkau saat menyiapkan data forecast." };
  }
  const body = buildForecastRequest(input);
  if (!body) return { ok: false, error: "Belum ada rekap penjualan untuk dihitung." };

  try {
    const json = await callForecast(config.url, config.secret, body);
    const results = parseForecastResponse(json, input.menuIds);
    const runId = await saveRun(
      supabase,
      dataset,
      body.start_date,
      body.horizon,
      results,
      (json as { meta?: unknown })?.meta ?? null,
    );
    return { ok: true, runId, startDate: body.start_date, message: "Prediksi diperbarui." };
  } catch (err) {
    const error =
      err instanceof ForecastError
        ? err.message
        : "Hasil forecast tidak bisa disimpan. Coba Hitung ulang sebentar lagi.";
    await recordFailure(supabase, dataset, error);
    return { ok: false, error };
  }
}

// ── Baca hasil terakhir ─────────────────────────────────────────────────────
export type LatestForecast = {
  /** Run paling baru (bisa gagal). */
  last: { status: "ok" | "failed"; createdAt: string; error: string | null } | null;
  /** Run berhasil paling baru beserta titik prediksinya. */
  ok: {
    runId: string;
    createdAt: string;
    startDate: string;
    horizon: number;
    menus: Record<string, MenuSummary>;
    points: { date: string; menuId: string; predicted: number; lower: number | null; upper: number | null }[];
  } | null;
};

export async function getLatestForecast(dataset: Dataset): Promise<LatestForecast> {
  const supabase = getSupabase();
  const [last, ok] = await Promise.all([
    supabase
      .from("forecast_runs")
      .select("status, summary, created_at")
      .eq("dataset", dataset)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("forecast_runs")
      .select("id, summary, created_at")
      .eq("dataset", dataset)
      .eq("status", "ok")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (last.error) throw last.error;
  if (ok.error) throw ok.error;

  let okRun: LatestForecast["ok"] = null;
  if (ok.data) {
    const points = await supabase
      .from("forecasts")
      .select("target_date, menu_id, predicted, lower, upper")
      .eq("run_id", ok.data.id)
      .order("target_date")
      .order("menu_id");
    if (points.error) throw points.error;
    const summary = (ok.data.summary ?? {}) as { start_date?: string; horizon?: number; menus?: Record<string, MenuSummary> };
    okRun = {
      runId: ok.data.id as string,
      createdAt: ok.data.created_at as string,
      startDate: summary.start_date ?? "",
      horizon: summary.horizon ?? 0,
      menus: summary.menus ?? {},
      points: (points.data ?? []).map((p) => ({
        date: p.target_date as string,
        menuId: p.menu_id as string,
        predicted: Number(p.predicted),
        lower: p.lower === null ? null : Number(p.lower),
        upper: p.upper === null ? null : Number(p.upper),
      })),
    };
  }

  return {
    last: last.data
      ? {
          status: last.data.status as "ok" | "failed",
          createdAt: last.data.created_at as string,
          error: ((last.data.summary ?? {}) as { error?: string }).error ?? null,
        }
      : null,
    ok: okRun,
  };
}
