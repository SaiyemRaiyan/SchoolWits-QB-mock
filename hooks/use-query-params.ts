"use client";

import { useState } from "react";

/**
 * The query string, read once on mount.
 *
 * Deliberately not useSearchParams: that opts the whole page out of
 * prerendering, so the shell would not paint until JS loaded. These params
 * only ever arrive from a link clicked in a browser, and nothing derived from
 * them renders before the catalogue loads, so the first paint matches.
 */
export function useQueryParams(): URLSearchParams {
  const [params] = useState(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
  );
  return params;
}
