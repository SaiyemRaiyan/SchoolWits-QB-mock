"use client";

import { ArrowLeft, ArrowRight, BookOpenCheck, ClipboardCheck, FileText, Pencil, PlayCircle } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { MarksSeal } from "@/components/common/marks-seal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collectMarksBreakdown, renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import { paperLabel, type Question } from "@/lib/supabase";

import { MarkSchemeTable } from "./mark-scheme-table";
import { ModePanel, ModeTabs, TONE_TINT, type Mode } from "./mode-tabs";
import { QuestionHtml } from "./question-html";
import { VideoPanel } from "./video-panel";

type QuestionCardProps = {
  question: Question;
  /** Where this sits in the result set, for the counter and progress bar. */
  position?: { index: number; total: number };
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Admin only. Gating here is presentation; RLS refuses the write anyway. */
  onEdit?: () => void;
};

export function QuestionCard({
  question,
  position,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onEdit,
}: QuestionCardProps) {
  // Keyed on the question, so moving to the next one lands on its text
  // rather than on whichever tab happened to be open.
  const [picked, setPicked] = useState<{ uid: string; tab: string } | null>(null);
  const tab = picked?.uid === question.uid ? picked.tab : "question";
  const hasVideo = Boolean(question.videoUrl || question.videoId);
  const panelId = useId();

  const rendered = useMemo(
    () => ({
      question: renderQuestionHtml(question.content),
      markScheme: toMarkSchemeRows(question.content, { showGuidance: true }),
      solution: renderWorkedSolution(question.content),
      breakdown: collectMarksBreakdown(question.content),
    }),
    [question.content],
  );

  const modes: Mode[] = [
    { value: "question", label: "Question", tone: "q", icon: <FileText className="size-4" /> },
    { value: "markscheme", label: "Mark scheme", tone: "ms", icon: <ClipboardCheck className="size-4" /> },
    { value: "worked-solution", label: "Worked solution", tone: "sol", icon: <BookOpenCheck className="size-4" /> },
    ...(hasVideo
      ? [{ value: "video", label: "Video", tone: "video", icon: <PlayCircle className="size-4" /> } as Mode]
      : []),
  ];
  const mode = modes.find((m) => m.value === tab) ?? modes[0];
  const progress = position ? ((position.index + 1) / position.total) * 100 : 0;

  return (
    <article className="sw-sheet-in overflow-hidden rounded-3xl bg-card shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10">
      {/* Header band: which question, from which paper, and what it is worth. */}
      <header className="relative overflow-hidden bg-[image:var(--sw-grad-q)] px-5 py-5 text-white sm:px-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-24 font-serif text-[9rem] leading-none font-bold text-white/[0.04] select-none"
        >
          {question.id}
        </span>

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.16em] break-words text-[var(--sw-brass-light)] uppercase">
              {question.ref || `${paperLabel(question)} · Q${question.id}`}
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold">Question {question.id}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge className="border-white/20 bg-white/10 font-normal text-white">
                {question.kind === "mcq" ? "Multiple choice" : "Structured"}
              </Badge>
              {question.topics.map((t) => (
                <Badge key={t} className="border-white/20 bg-white/10 font-normal text-white">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {rendered.breakdown.length > 1 && (
              <ul className="hidden max-w-44 flex-wrap justify-end gap-1 sm:flex">
                {rendered.breakdown.map((part) => (
                  <li
                    key={part.label}
                    className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                  >
                    ({part.label}) {part.marks}
                  </li>
                ))}
              </ul>
            )}
            <MarksSeal marks={question.marks} size={84} className="size-16 sm:size-[84px]" />
          </div>
        </div>
      </header>

      {position && (
        <div className="h-1 bg-muted" role="presentation">
          <div
            className="h-full bg-[image:var(--sw-grad-sol)] transition-[width] duration-500 ease-[var(--sw-ease)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <ModeTabs
          modes={modes}
          value={mode.value}
          onChange={(next) => setPicked({ uid: question.uid, tab: next })}
          panelId={panelId}
          label="Show the question, its mark scheme or its worked solution"
        />

        <div className="flex items-center gap-2">
          {position && (
            <span className="mr-1 font-mono text-xs text-muted-foreground tabular-nums">
              {position.index + 1} / {position.total}
            </span>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev} aria-label="Previous question">
            <ArrowLeft className="size-3.5" />
            Prev
          </Button>
          <Button size="sm" disabled={!hasNext} onClick={onNext} aria-label="Next question">
            Next
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-6 lg:p-8" style={{ background: mode.value === "question" ? undefined : TONE_TINT[mode.tone] }}>
        <ModePanel
          id={panelId}
          mode={mode}
          className={
            mode.value === "question"
              ? "bg-card p-1 sm:p-2"
              : "bg-card p-3 shadow-[var(--sw-shadow-box)] sm:p-6"
          }
        >
          {mode.value === "question" && <QuestionHtml html={rendered.question} className="question-body" />}
          {mode.value === "markscheme" && <MarkSchemeTable rows={rendered.markScheme} />}
          {mode.value === "worked-solution" && (
            <QuestionHtml html={rendered.solution} className="worked-solution" />
          )}
          {mode.value === "video" && <VideoPanel question={question} />}
        </ModePanel>
      </div>
    </article>
  );
}
