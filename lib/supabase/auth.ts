import { supabase } from "./client";

export async function currentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Comes back to the page it was called from, minus any query string.
 *
 * Supabase only honours a redirect it can match against the project's
 * Redirect URLs allow-list; anything else silently falls back to the Site
 * URL. Dropping the query keeps that one entry simple, and stops the PKCE
 * `?code=` landing on Browse, where `code` already means a syllabus.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const target = redirectTo || `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: target },
  });
  if (error) throw error;
  return data;
}

/** UX only. Every write is independently refused by RLS, which runs the same is_admin(). */
export async function isAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  const { data, error } = await supabase.rpc("is_admin");
  return error ? false : Boolean(data);
}
