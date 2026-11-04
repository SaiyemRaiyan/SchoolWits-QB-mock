"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/* =====================================================================
   The query string as shared state.

   Deliberately not useSearchParams: that opts the whole route out of
   prerendering, and these pages are a static export, so the shell would
   not paint until JS loaded. This reads window.location directly and
   publishes changes to every subscriber, so the header's search box and
   the page below it stay in step without a context between them.
   ===================================================================== */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Back and forward change the URL without going through set().
  window.addEventListener("popstate", emit);
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) window.removeEventListener("popstate", emit);
  };
}

const getSnapshot = () => window.location.search;
// During hydration React uses this, then re-renders with the real value,
// which is what keeps the prerendered HTML and the first client render equal.
const getServerSnapshot = () => "";

export type UrlPatch = Record<string, string | null | undefined>;

export function useUrlState(): [URLSearchParams, (patch: UrlPatch) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const set = useCallback((patch: UrlPatch) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      // An empty value is the absence of a filter, not a filter for "".
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    // replaceState, not push: typing in the search box would otherwise put
    // one history entry per keystroke between you and the previous page.
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    emit();
  }, []);

  return [params, set];
}
