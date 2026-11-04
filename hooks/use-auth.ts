"use client";

import { useEffect, useState } from "react";

import { currentUser, isAdmin, supabase } from "@/lib/supabase";

export type AuthUser = {
  email: string;
  /** Display name and picture come from the OAuth provider's metadata. */
  name: string;
  avatarUrl: string;
};

export type AuthState = {
  user: AuthUser | null;
  admin: boolean;
  loading: boolean;
};

/** Who is signed in, and are they an admin. Gates UI only; RLS is the boundary. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, admin: false, loading: true });

  useEffect(() => {
    let alive = true;

    const read = async () => {
      const [user, admin] = await Promise.all([currentUser(), isAdmin()]);
      if (!alive) return;
      const meta = (user?.user_metadata ?? {}) as Record<string, string>;
      setState({
        user: user
          ? {
              email: user.email ?? "",
              name: meta.full_name || meta.name || user.email || "",
              avatarUrl: meta.avatar_url || meta.picture || "",
            }
          : null,
        admin,
        loading: false,
      });
    };

    read().catch(() => alive && setState({ user: null, admin: false, loading: false }));
    const { data } = supabase.auth.onAuthStateChange(() => void read());

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
