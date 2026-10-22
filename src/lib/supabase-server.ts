import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/**
 * Client Supabase KHUSUS SERVER (D-05). Memakai secret key yang melewati RLS,
 * jadi modul ini tidak boleh pernah diimpor oleh komponen "use client"
 * (`server-only` akan menggagalkan build kalau itu terjadi).
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const env = requireEnv("SUPABASE_URL", "SUPABASE_SECRET_KEY");
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
