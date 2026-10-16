/* =====================================================================
   The one Supabase client the browser uses.

   A module-level singleton, not a per-call createClient(): supabase-js
   holds the auth session and its refresh timer on the instance, so a
   second client would mean a second session listener and a race over
   who refreshes the token.
   ===================================================================== */
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Postgres errors come back in the result, not as a throw. */
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
