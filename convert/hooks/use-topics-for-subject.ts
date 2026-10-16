"use client";

import { useEffect, useState } from "react";

import { getTopicsForSubject } from "@/lib/supabase";

export type TopicsState = {
  topics: string[];
  loading: boolean;
  failed: boolean;
};

/**
 * Topics for one subject, refetched whenever the subject changes.
 *
 * Takes the papers.subject NAME, not the syllabus code: the two differ
 * ("Add Maths" vs "Additional Mathematics") and the questions table joins
 * on the name. The caller is responsible for the translation.
 *
 * The stored result remembers which subject it came from, and `loading`
 * is derived from that rather than being flipped on in the effect. Two
 * reasons: switching subject twice quickly leaves two requests in flight
 * and the first to come back is not necessarily the one asked for last,
 * and setting state in an effect body costs an extra render pass.
 */
export function useTopicsForSubject(subjectName: string | null): TopicsState {
  const [result, setResult] = useState<{
    subject: string;
    topics: string[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!subjectName) return;

    getTopicsForSubject(subjectName).then(
      (topics) => setResult({ subject: subjectName, topics, failed: false }),
      (err) => {
        console.error("Landing: could not load topics for subject:", err);
        setResult({ subject: subjectName, topics: [], failed: true });
      },
    );
  }, [subjectName]);

  const current = result && result.subject === subjectName ? result : null;

  return {
    topics: current?.topics ?? [],
    loading: Boolean(subjectName) && !current,
    failed: current?.failed ?? false,
  };
}
