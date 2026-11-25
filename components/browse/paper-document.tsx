"use client";

import { BookOpenCheck, ClipboardCheck, FileText } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { MarksSeal } from "@/components/common/marks-seal";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import { paperLabel, type Question } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { MarkSchemeTable } from "./mark-scheme-table";
import { ModeTabs, TONE_GRAD, TONE_TINT, type Mode, type Tone } from "./mode-tabs";
import { QuestionHtml } from "./question-html";

type Kind = "paper" | "markscheme" | "worked-solution";

const MODES: (Mode & { value: Kind; title: string; blurb: string })[] = [
  { value: "paper", label: "Question paper", title: "Question Paper", tone: "q", icon: <FileText className="size-4" />, blurb: "The paper as the candidate sees it." },
  { value: "markscheme", label: "Mark scheme", title: "Mark Scheme", tone: "ms", icon: <ClipboardCheck className="size-4" />, blurb: "What the examiner credits, mark by mark." },
  { value: "worked-solution", label: "Worked solutions", title: "Worked Solutions", tone: "sol", icon: <BookOpenCheck className="size-4" />, blurb: "Each answer reasoned step by step." },
];

type PaperDocumentProps = {
  questions: Question[];
  loading: boolean;
  /** How many of these the filters actually matched, when it is fewer. */
  matched?: number;
};

/**
 * The whole paper read end to end, as the three documents a candidate gets.
 *
 * Every question is its own raised box with a coloured header, so where one
 * ends and the next begins is never in doubt. A navigator follows the reader:
 * a column beside the page on wide screens, a sticky strip under the header
 * on anything narrower, where a side column would squeeze the page itself.
 */
export function PaperDocument({ questions, loading, matched }: PaperDocumentProps) {
  const [kind, setKind] = useState<Kind>("paper");
  const panelId = useId();
  const meta = questions[0];
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
    [questions],
  );
  const mode = MODES.find((m) => m.value === kind) ?? MODES[0];
  const current = useCurrentQuestion(questions, kind);

  if (loading) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-live="polite">
        <div className="sw-skeleton sw-skeleton-dark h-28" />
        <div className="sw-skeleton sw-skeleton-dark h-96" />
        <span className="sr-only">Loading the paper…</span>
      </div>
    );
  }
  if (!meta) {
    return (
      <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground shadow-[var(--sw-shadow-sheet)]">
        No questions found for this paper.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <ModeTabs
        modes={MODES}
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        panelId={panelId}
        label="Which document of the paper to read"
      />

      <Navigator
        questions={questions}
        kind={kind}
        current={current}
        tone={mode.tone}
        className="sticky top-[7.6rem] z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f]/80 p-2 backdrop-blur-xl md:top-16 2xl:hidden"
        itemClass="h-9 min-w-9 shrink-0 px-2"
      />

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_12.5rem]">
        <div
          key={kind}
          id={panelId}
          role="tabpanel"
          aria-label={mode.label}
          className="sw-sheet-in grid min-w-0 gap-6"
        >
          {/* The cover, like the front of the printed paper. */}
          <header
            className="relative overflow-hidden rounded-3xl p-6 text-white shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10 sm:p-8"
            style={{ backgroundImage: TONE_GRAD[mode.tone] }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -bottom-10 font-serif text-[9rem] leading-none font-bold text-white/[0.07] select-none sm:text-[12rem]"
            >
              {meta.paper}
            </span>
            <p className="relative font-mono text-xs tracking-[0.16em] text-white/75 uppercase">
              {paperLabel(meta)} &middot; {meta.subject}
            </p>
            <h2 className="relative mt-1 font-serif text-3xl font-bold sm:text-4xl">{mode.title}</h2>
            <p className="relative mt-1 text-sm text-white/80">{mode.blurb}</p>
            <p className="relative mt-4 flex flex-wrap gap-2 text-sm font-medium">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {questions.length} question{questions.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1">{totalMarks || "·"} total marks</span>
            </p>
            {/* Switching into this view silently widens the result set, so it
                says so rather than leaving you to notice. */}
            {matched !== undefined && matched < questions.length && (
              <p className="relative mt-2 text-xs text-white/75">
                Showing the whole paper. Your filters matched {matched} of these.
              </p>
            )}
          </header>

          {questions.map((q) => (
            <article
              key={q.uid}
              id={`${kind}-q${q.id}`}
              data-qid={q.id}
              className="scroll-mt-[14rem] overflow-hidden rounded-3xl bg-card shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10 md:scroll-mt-32 2xl:scroll-mt-24"
            >
              <header
                className="flex items-center gap-3 px-4 py-3 text-white sm:px-6"
                style={{ backgroundImage: TONE_GRAD[mode.tone] }}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-mono text-base font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]">
                  {q.id}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-xl leading-tight font-semibold">Question {q.id}</h3>
                  {q.topic && <p className="truncate text-xs text-white/75">{q.topic}</p>}
                </div>
                <MarksSeal marks={q.marks} size={54} label={false} />
              </header>
              <div className="p-3 sm:p-6 lg:p-8" style={{ background: kind === "paper" ? undefined : TONE_TINT[mode.tone] }}>
                <div className={cn(kind !== "paper" && "rounded-2xl bg-card p-3 shadow-[var(--sw-shadow-box)] sm:p-5")}>
                  <PaperSection kind={kind} question={q} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <Navigator
          questions={questions}
          kind={kind}
          current={current}
          tone={mode.tone}
          className="sticky top-24 hidden max-h-[calc(100vh-8rem)] grid-cols-3 gap-1.5 overflow-y-auto rounded-2xl bg-card p-3 shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10 2xl:grid"
          itemClass="h-9"
          heading
        />
      </div>
    </div>
  );
}

/** Which question is nearest the top of the screen, so the navigator can follow. */
function useCurrentQuestion(questions: Question[], kind: Kind) {
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    const articles = [...document.querySelectorAll<HTMLElement>(`article[id^="${kind}-q"]`)];
    if (!articles.length || typeof IntersectionObserver === "undefined") return;
    // A thin band just under the sticky header: whatever crosses it is "here".
    // The set is kept, not just the latest hit, because content shifts as
    // maths and images load and a question can leave the band without being
    // replaced; remembering only the last hit left a stale highlight behind.
    const inBand = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = Number((e.target as HTMLElement).dataset.qid);
          if (e.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }
        if (inBand.size) setCurrent(Math.min(...inBand));
        else if (window.scrollY < 200) setCurrent(null);
      },
      // Under the sticky header and strip: taller on a phone, where the header has two rows.
      { rootMargin: window.innerWidth < 768 ? "-210px 0px -65% 0px" : "-130px 0px -70% 0px" },
    );
    articles.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, [questions, kind]);

  return current;
}

function Navigator({
  questions,
  kind,
  current,
  tone,
  className,
  itemClass,
  heading,
}: {
  questions: Question[];
  kind: Kind;
  current: number | null;
  tone: Tone;
  className: string;
  itemClass: string;
  heading?: boolean;
}) {
  const shown = current ?? questions[0]?.id;
  return (
    <nav aria-label="Jump to a question" className={className}>
      {heading && (
        <p className="col-span-3 mb-1 px-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Questions
        </p>
      )}
      {questions.map((q) => {
        const active = q.id === shown;
        return (
          <a
            key={q.uid}
            href={`#${kind}-q${q.id}`}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById(`${kind}-q${q.id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            aria-current={active ? "true" : undefined}
            className={cn(
              "sw-key flex items-center justify-center rounded-lg font-mono text-xs font-semibold",
              itemClass,
              active ? "text-white" : "bg-muted text-foreground",
            )}
            style={active ? { backgroundImage: TONE_GRAD[tone] } : undefined}
          >
            {q.id}
          </a>
        );
      })}
    </nav>
  );
}

function PaperSection({ kind, question }: { kind: Kind; question: Question }) {
  if (kind === "markscheme") {
    return <MarkSchemeTable rows={toMarkSchemeRows(question.content, { showGuidance: true })} />;
  }
  if (kind === "worked-solution") {
    return <QuestionHtml html={renderWorkedSolution(question.content)} className="worked-solution" />;
  }
  return <QuestionHtml html={renderQuestionHtml(question.content)} className="question-body" />;
}
