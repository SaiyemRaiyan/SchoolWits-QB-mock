"use client";

import { ArrowRight, CalendarDays, FileText } from "lucide-react";

import { MIN_NARROWING, narrowingCount, whatIsMissing, type Paper, type SearchFilters } from "@/lib/supabase";

import type { Option } from "./filter-select";

type PaperFinderProps = {
  filters: SearchFilters;
  /** Null until the paper list has loaded. */
  papers: Paper[] | null;
  /** Papers that contain the chosen topic, when one is chosen. */
  topicPapers: { keys: Set<string> | null; loading: boolean };
  subjectOptions: Option[];
  onPickSubject: (subject: string) => void;
  onPickPaper: (paper: Paper) => void;
};

/**
 * What the page shows until a paper has been asked for: the next step in words,
 * and every paper that still fits, one click from opening.
 *
 * Showing "all questions for Physics" instead put several years of every
 * paper on one screen, which reads as noise. A shelf of papers to pick from
 * is the honest alternative to that, and it needs no knowledge of the filters.
 */
export function PaperFinder({ filters, papers, topicPapers, subjectOptions, onPickSubject, onPickPaper }: PaperFinderProps) {
  const missing = whatIsMissing(filters);

  if (missing.subject) {
    return (
      <Panel
        title="Choose a subject"
        text="Start with the subject. Then add two more choices (a paper, a session, a year or a topic) and the paper opens."
      >
        <ul className="mt-5 flex flex-wrap justify-center gap-2.5">
          {subjectOptions.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onPickSubject(o.value)}
                className="sw-key rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  // Until the paper list (and, with a topic, the topic's papers) has arrived,
  // "no paper matches" would be a false statement, so show that it is loading.
  const waiting = papers === null || (Boolean(filters.topic) && topicPapers.loading);

  // Papers that still fit what has been chosen, newest first.
  const fits = (papers ?? [])
    .filter(
      (p) =>
        (!filters.topic || !topicPapers.keys || topicPapers.keys.has(p.paperKey)) &&
        p.subject === filters.subject &&
        (!filters.paper || p.paper === filters.paper) &&
        (!filters.variant || p.variant === filters.variant) &&
        (!filters.session || p.session === filters.session) &&
        (!filters.year || String(p.year) === filters.year),
    )
    .sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper) || a.variant.localeCompare(b.variant));

  const chosen = narrowingCount(filters);
  return (
    <Panel
      title={`Now narrow ${filters.subject} down`}
      text={`${Math.min(chosen, MIN_NARROWING)} of ${MIN_NARROWING} chosen. Pick ${missing.more} more in the filters, or open a paper below.`}
    >
      {waiting ? (
        <div className="mt-6 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sw-skeleton h-[4.5rem]" />
          ))}
          <span className="sr-only">Loading papers…</span>
        </div>
      ) : fits.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No paper matches those choices.</p>
      ) : (
        <ul className="mt-6 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fits.map((p) => (
            <li key={p.paperKey}>
              <button
                type="button"
                onClick={() => onPickPaper(p)}
                className="sw-key group flex w-full items-center gap-3 rounded-2xl border bg-background p-3.5 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--sw-grad-q)] text-white shadow-[0_6px_12px_-4px_rgba(10,23,48,0.6)]">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm font-semibold">{p.label}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3" />
                    Paper {p.paper} · Variant {p.variant} · {p.session} {p.year}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="sw-sheet-in flex flex-col items-center rounded-3xl bg-card px-5 py-10 text-center shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10 sm:px-10 sm:py-14">
      <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{text}</p>
      {children}
    </section>
  );
}
