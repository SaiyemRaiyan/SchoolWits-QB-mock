"use client";

import { useEffect, useState } from "react";

import { getAllPapers, getAllQuestions, type Paper, type Question } from "@/lib/supabase";

export type QuestionPool = {
  questions: Question[];
  papers: Paper[];
  loading: boolean;
  /** Replaces one question in place, e.g. after an edit. */
  replace: (question: Question) => void;
};

/** Every question and paper, loaded once. The module builder filters this
    pool client-side rather than re-querying on each tick. */
export function useQuestionPool(): QuestionPool {
  const [loaded, setLoaded] = useState<{ questions: Question[]; papers: Paper[] } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getAllQuestions(), getAllPapers()]).then(
      ([questions, papers]) => alive && setLoaded({ questions, papers }),
      (err) => {
        console.error("Modules: could not load the question pool:", err);
        if (alive) setLoaded({ questions: [], papers: [] });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return {
    questions: loaded?.questions ?? [],
    papers: loaded?.papers ?? [],
    loading: !loaded,
    replace: (question) =>
      setLoaded((prev) =>
        prev
          ? { ...prev, questions: prev.questions.map((q) => (q.uid === question.uid ? question : q)) }
          : prev,
      ),
  };
}
