"use client";

import { useEffect, useState } from "react";

import { getQuestionsByPaperKey, type Question } from "@/lib/supabase";

export type FullPaper = { questions: Question[]; loading: boolean };

/**
 * Every question in one paper, regardless of the filters.
 *
 * Deliberately a second query rather than reusing the search results: with
 * a topic filter or a search term those are a subset, and showing six of
 * forty questions as "the full paper" is a lie.
 */
export function useFullPaper(paperKey: string | null): FullPaper {
  const [result, setResult] = useState<{ key: string; questions: Question[] } | null>(null);

  useEffect(() => {
    if (!paperKey) return;
    getQuestionsByPaperKey(paperKey).then(
      (questions) => setResult({ key: paperKey, questions }),
      (err) => {
        console.error("Browse: could not load the paper:", err);
        setResult({ key: paperKey, questions: [] });
      },
    );
  }, [paperKey]);

  const fresh = result?.key === paperKey ? result : null;
  return { questions: fresh?.questions ?? [], loading: Boolean(paperKey) && !fresh };
}
