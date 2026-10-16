"use client";

import { useEffect, useState } from "react";

import { hasAnyFilter, searchQuestions, type Question, type SearchFilters } from "@/lib/supabase";

export type SearchState = { questions: Question[]; loading: boolean; active: boolean };

/**
 * Runs the search whenever the filters change, debounced so typing in the
 * search box does not fire a query per keystroke.
 */
export function useQuestionSearch(filters: SearchFilters, debounceMs = 180): SearchState {
  const [result, setResult] = useState<{ key: string; questions: Question[] } | null>(null);
  const key = JSON.stringify(filters);
  const active = hasAnyFilter(filters);

  useEffect(() => {
    // Nothing chosen yet means no fetch: an unfiltered search pulls every
    // question in the bank with its full content blob.
    if (!active) return;

    const timer = setTimeout(() => {
      searchQuestions(filters).then(
        (questions) => setResult({ key, questions }),
        (err) => {
          console.error("Browse: search failed:", err);
          setResult({ key, questions: [] });
        },
      );
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, debounceMs]);

  const fresh = result?.key === key ? result : null;
  return { questions: active ? (fresh?.questions ?? []) : [], loading: active && !fresh, active };
}
