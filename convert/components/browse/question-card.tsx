"use client";

import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collectMarksBreakdown, renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import { paperLabel, type Question } from "@/lib/supabase";

import { MarkSchemeTable } from "./mark-scheme-table";
import { QuestionHtml } from "./question-html";
import { VideoPanel } from "./video-panel";

type QuestionCardProps = {
  question: Question;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Admin only. Gating here is presentation; RLS refuses the write anyway. */
  onEdit?: () => void;
};

export function QuestionCard({
  question,
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

  const rendered = useMemo(
    () => ({
      question: renderQuestionHtml(question.content),
      markScheme: toMarkSchemeRows(question.content, { showGuidance: true }),
      solution: renderWorkedSolution(question.content),
      breakdown: collectMarksBreakdown(question.content),
    }),
    [question.content],
  );

  return (
    <Card className="gap-0 py-0 overflow-hidden">
      {/* A fixed two-column grid, not flex-wrap: the topic line varies from a
          few words to three clauses, and wrapping moved the controls around. */}
      <CardHeader className="grid gap-4 border-b p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-bold">Question {question.id}</h2>
          <p className="mt-0.5 font-mono text-xs break-words text-muted-foreground">
            {question.ref || `${paperLabel(question)} · Q${question.id}`}
            {question.topic && ` · Topic: ${question.topic}`}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-4 sm:justify-self-end">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-[var(--sw-marker)] font-mono leading-none">
              <span className="text-lg font-bold text-[var(--sw-marker)]">
                {question.marks ?? "·"}
              </span>
              <span className="text-[8px] tracking-wider text-muted-foreground uppercase">
                {question.marks === 1 ? "mark" : "marks"}
              </span>
            </div>
            {rendered.breakdown.length > 1 && (
              <div className="flex max-w-40 flex-wrap justify-center gap-1">
                {rendered.breakdown.map((part) => (
                  <Badge key={part.label} variant="outline" className="px-1.5 font-mono text-[10px]">
                    ({part.label}) {part.marks}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
              <ArrowLeft className="size-3.5" />
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={tab} onValueChange={(next) => setPicked({ uid: question.uid, tab: next })}>
        <TabsList className="m-4 mb-0">
          <TabsTrigger value="question">Question</TabsTrigger>
          <TabsTrigger value="markscheme">Mark Scheme</TabsTrigger>
          <TabsTrigger value="worked-solution">Worked Solution</TabsTrigger>
          {hasVideo && <TabsTrigger value="video">Video</TabsTrigger>}
        </TabsList>

        <CardContent className="p-5">
          <TabsContent value="question">
            <QuestionHtml html={rendered.question} className="question-body" />
          </TabsContent>
          <TabsContent value="markscheme">
            <MarkSchemeTable rows={rendered.markScheme} />
          </TabsContent>
          <TabsContent value="worked-solution">
            <QuestionHtml html={rendered.solution} className="worked-solution" />
          </TabsContent>
          {hasVideo && (
            <TabsContent value="video">
              <VideoPanel question={question} />
            </TabsContent>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
