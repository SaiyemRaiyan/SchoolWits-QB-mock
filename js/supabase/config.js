/* =====================================================================
   School Wits — Supabase connection config.
   Safe to ship in client code: the publishable key can only do what RLS
   (backend/supabase/migrations/0007_rls_policies.sql onward) allows it to
   do — public read, admin-authenticated write. It is not a secret.
   ===================================================================== */
window.SUPABASE_URL = 'https://zzztbpbvxfpyzuxxlkdh.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_EHP41d7uHXKEzGJTsRqQrA_9CnS5EI9';
