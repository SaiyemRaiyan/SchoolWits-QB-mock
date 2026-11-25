"use client";

import { paperLabel, type Question } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type QuestionPickerProps = {
  questions: Question[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

/**
 * Every question in the result set as a numbered tile, grouped by paper.
 *
 * A dropdown hid how many questions there were and made you open it to move;
 * the grid shows all forty at once, marks on each, and the current one lit.
 * Tiles are buttons in a labelled group, so the keyboard and screen readers
 * get the same overview.
 */
export function QuestionPicker({ questions, activeIndex, onSelect }: QuestionPickerProps) {
  if (!questions.length) return null;

  const groups = groupByPaper(questions);
  const activeUid = questions[activeIndex]?.uid;

  return (
    <section
      aria-label="Questions"
      className="sw-sheet-in grid gap-4 rounded-2xl bg-card p-4 shadow-[0_30px_60px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
    >
      {groups.map((group) => (
        <div key={group.paperKey} className="grid gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-xs font-semibold tracking-wide text-[var(--sw-ink)]">
              {group.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.items.length} question{group.items.length === 1 ? "" : "s"}
            </p>
          </div>

          <div
            role="group"
            aria-label={group.label}
            className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto sm:max-h-none sm:overflow-visible"
          >
            {group.items.map(({ question: q, index }) => {
              const active = q.uid === activeUid;
              return (
                <button
                  key={q.uid}
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-current={active ? "true" : undefined}
                  aria-label={`Question ${q.id}, ${q.marks ?? "unmarked"} ${q.marks === 1 ? "mark" : "marks"}`}
                  title={`${q.marks ?? "·"} ${q.marks === 1 ? "mark" : "marks"}${q.topic ? ` · ${q.topic}` : ""}`}
                  className={cn(
                    "sw-key group relative flex h-11 min-w-11 flex-col items-center justify-center rounded-xl border px-2 font-mono",
                    active
                      ? "border-[var(--sw-ink)] bg-[var(--sw-ink)] text-white"
                      : "border-border bg-background text-foreground hover:border-[var(--sw-brass)]",
                  )}
                >
                  <span className="text-sm leading-none font-bold">{q.id}</span>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] leading-none",
                      active ? "text-[var(--sw-brass-light)]" : "text-muted-foreground",
                    )}
                  >
                    {q.marks ?? "·"}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function groupByPaper(questions: Question[]) {
  const groups: {
    paperKey: string;
    label: string;
    items: { question: Question; index: number }[];
  }[] = [];

  questions.forEach((question, index) => {
    const last = groups.at(-1);
    if (last?.paperKey === question.paperKey) last.items.push({ question, index });
    else
      groups.push({
        paperKey: question.paperKey,
        label: paperLabel(question),
        items: [{ question, index }],
      });
  });
  return groups;
}
