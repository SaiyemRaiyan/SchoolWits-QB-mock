/* =====================================================================
   Supabase connection config.

   Safe to ship in client code, and deliberately committed rather than
   kept in .env.local: the publishable key can only do what RLS
   (backend/supabase/migrations/0007_rls_policies.sql onward) allows,
   which is public read and admin-authenticated write. It is not a
   secret, and committing it means a Vercel/Netlify/Cloudflare build
   needs no environment variables set at all.

   The service-role key is the one that bypasses RLS. It lives in
   backend/.env, is gitignored, and must never reach this folder.

   The env vars are an override, not the source of truth, so a second
   project (a staging database, say) needs no code change.
   ===================================================================== */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://zzztbpbvxfpyzuxxlkdh.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_EHP41d7uHXKEzGJTsRqQrA_9CnS5EI9";
