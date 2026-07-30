import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/database.js";

// Reads from process.env so this works both in a plain Node script
// (backend/src/*) and once bundled into a frontend build step that injects
// these at build time — nothing here is Node-specific besides the read.
export function createSupabaseClient(
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_ANON_KEY
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set (see backend/.env.example)."
    );
  }
  return createClient<Database>(url, key);
}

// Only for trusted server-side scripts (seeding admin_users, bulk imports)
// that need to bypass RLS entirely. Never call this from browser code — the
// service role key must never reach the client.
export function createServiceRoleClient(
  url = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
): SupabaseClient<Database> {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see backend/.env.example)."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
