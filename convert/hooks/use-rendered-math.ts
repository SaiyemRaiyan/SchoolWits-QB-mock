"use client";

import { useEffect, useRef } from "react";

import { renderMath } from "@/lib/katex";

/** Runs KaTeX over the returned element whenever `deps` change. */
export function useRenderedMath(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderMath(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
