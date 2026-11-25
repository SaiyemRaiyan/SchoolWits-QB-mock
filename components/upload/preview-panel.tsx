"use client";

import { BookOpenCheck, ClipboardCheck, FileText } from "lucide-react";
import { useId, useState } from "react";

import { MarkSchemeTable } from "@/components/browse/mark-scheme-table";
import { ModeTabs, TONE_GRAD, type Mode } from "@/components/browse/mode-tabs";
import { QuestionHtml } from "@/components/browse/question-html";
import { MarksSeal } from "@/components/common/marks-seal";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import type { ParsedQuestion } from "@/lib/supabase";

type Kind = "paper" | "markscheme" | "worked-solution";

const MODES: (Mode & { value: Kind })[] = [
  { value: "paper", label: "Question paper", tone: "q", icon: <FileText className="size-4" /> },
  { value: "markscheme", label: "Mark scheme", tone: "ms", icon: <ClipboardCheck className="size-4" /> },
  { value: "worked-solution", label: "Worked solutions", tone: "sol", icon: <BookOpenCheck className="size-4" /> },
];

type PreviewPanelProps = {
  questions: ParsedQuestion[];
  /** The paper id, once the .tex has been read. */
  label?: string | null;
};

/**
 * What the paper will look like, in a frame: a bezel with a title bar, and the
 * page inside it. It is the same renderer Browse uses, so this is a faithful
 * check of what students will see rather than an approximation. The frame is
 * deliberately wide and tall, because checking a paper means reading it.
 */
export function PreviewPanel({ questions, label }: PreviewPanelProps) {
  const [kind, setKind] = useState<Kind>("paper");
  const panelId = useId();
  const mode = MODES.find((m) => m.value === kind) ?? MODES[0];
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  return (
    <section
      aria-label="Live preview"
      className="sw-sheet-in overflow-hidden rounded-[1.75rem] p-2.5 text-foreground shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/15 sm:p-3.5"
      style={{ backgroundImage: TONE_GRAD[mode.tone] }}
    >
      {/* The title bar: three lights, what is being previewed, and the totals. */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 pt-1 pb-3 text-white">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-[#ff6b5e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
          <i className="size-2.5 rounded-full bg-[#ffc24a] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
          <i className="size-2.5 rounded-full bg-[#3fd07f] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
        </span>
        <h2 className="font-serif text-lg font-semibold">Live preview</h2>
        {label && <span className="font-mono text-xs text-white/75">{label}</span>}
        {questions.length > 0 && (
          <span className="ml-auto flex items-center gap-2 text-xs text-white/80">
            {questions.length} questions · {totalMarks} marks
          </span>
        )}
      </header>

      <div className="rounded-2xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_10px_rgba(0,0,0,0.35)]">
        <div className="border-b p-3">
          <ModeTabs
            modes={MODES}
            value={kind}
            onChange={(v) => setKind(v as Kind)}
            panelId={panelId}
            label="Preview a document"
          />
        </div>

        {!questions.length ? (
          <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[image:var(--sw-grad-q)] text-white shadow-[0_8px_16px_-6px_rgba(10,23,48,0.7)]">
              <FileText className="size-6" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              Parsed questions appear here as soon as the questions file is loaded. Each question is
              shown as its own box, exactly as students will read it.
            </p>
          </div>
        ) : (
          <div
            key={kind}
            id={panelId}
            role="tabpanel"
            aria-label={mode.label}
            tabIndex={0}
            className="sw-rise rounded-b-2xl bg-muted/60 p-3 outline-none sm:p-4 xl:max-h-[calc(100vh-15rem)] xl:min-h-[28rem] xl:overflow-y-auto"
          >
            <div className="grid gap-5">
              {questions.map((q) => (
                <article
                  key={q.number}
                  className="overflow-hidden rounded-2xl bg-card shadow-[var(--sw-shadow-box)] ring-1 ring-foreground/10"
                >
                  <header
                    className="flex items-center gap-3 px-4 py-2.5 text-white"
                    style={{ backgroundImage: TONE_GRAD[mode.tone] }}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 font-mono text-sm font-bold">
                      {q.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base leading-tight font-semibold">Question {q.number}</h3>
                      {q.topics.length > 0 && (
                        <p className="truncate text-[11px] text-white/75">{q.topics.join(" · ")}</p>
                      )}
                    </div>
                    <MarksSeal marks={q.marks} size={42} label={false} />
                  </header>
                  <div className="p-3 sm:p-5">
                    <PreviewBody kind={kind} question={q} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PreviewBody({ kind, question }: { kind: Kind; question: ParsedQuestion }) {
  if (kind === "markscheme") {
    return <MarkSchemeTable rows={toMarkSchemeRows(question, { showGuidance: true })} />;
  }
  if (kind === "worked-solution") {
    return <QuestionHtml html={renderWorkedSolution(question)} className="worked-solution" />;
  }
  return <QuestionHtml html={renderQuestionHtml(question)} className="question-body" />;
}
