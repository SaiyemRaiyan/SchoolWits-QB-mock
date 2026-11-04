"use client";

import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import { paperLabel, type Question } from "@/lib/supabase";

import { MarkSchemeTable } from "./mark-scheme-table";
import { QuestionHtml } from "./question-html";

const DOCUMENTS = [
  ["paper", "Question Paper"],
  ["markscheme", "Mark Scheme"],
  ["worked-solution", "Worked Solutions"],
] as const;

type PaperDocumentProps = {
  questions: Question[];
  loading: boolean;
  /** How many of these the filters actually matched, when it is fewer. */
  matched?: number;
};

/** The whole paper read end to end, as the three documents a candidate gets. */
export function PaperDocument({ questions, loading, matched }: PaperDocumentProps) {
  const meta = questions[0];
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
    [questions],
  );

  if (loading) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">Loading the paper…</Card>
    );
  }
  if (!meta) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No questions found for this paper.
      </Card>
    );
  }

  return (
    <Tabs defaultValue="paper">
      <TabsList>
        {DOCUMENTS.map(([value, title]) => (
          <TabsTrigger key={value} value={value}>
            {title}
          </TabsTrigger>
        ))}
      </TabsList>

      {DOCUMENTS.map(([value, title]) => (
        <TabsContent key={value} value={value}>
          <Card className="gap-0 py-0">
            <CardContent className="p-6">
              <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {paperLabel(meta)} &middot; {meta.subject}
                  </p>
                  <h2 className="font-serif text-2xl font-bold">{title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {questions.length} question{questions.length === 1 ? "" : "s"} &middot;{" "}
                    {totalMarks || "·"} total marks
                  </p>
                  {/* Switching into this view silently widens the result set,
                      so it says so rather than leaving you to notice. */}
                  {matched !== undefined && matched < questions.length && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Showing the whole paper. Your filters matched {matched} of these.
                    </p>
                  )}
                </div>
                <JumpTo questions={questions} document={value} />
              </header>

              <div className="grid gap-8">
                {questions.map((q) => (
                  <article
                    key={q.uid}
                    id={`${value}-q${q.id}`}
                    className="scroll-mt-20 border-l-4 border-border pl-4"
                  >
                    <div className="mb-3 flex items-baseline gap-3">
                      <h3 className="font-serif text-lg font-semibold">Question {q.id}</h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.marks ?? "·"} marks
                      </span>
                    </div>
                    <PaperSection kind={value} question={q} />
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Forty questions is a long scroll, so the header carries a way down it. */
function JumpTo({ questions, document: doc }: { questions: Question[]; document: string }) {
  const items = Object.fromEntries(questions.map((q) => [String(q.id), `Question ${q.id}`]));

  return (
    <Select
      items={items}
      value={null}
      onValueChange={(id) => {
        const target = window.document.getElementById(`${doc}-q${id}`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <SelectTrigger size="sm" className="w-44">
        <SelectValue placeholder="Jump to…" />
      </SelectTrigger>
      <SelectContent>
        {questions.map((q) => (
          <SelectItem key={q.uid} value={String(q.id)}>
            Question {q.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PaperSection({
  kind,
  question,
}: {
  kind: "paper" | "markscheme" | "worked-solution";
  question: Question;
}) {
  if (kind === "markscheme") {
    return <MarkSchemeTable rows={toMarkSchemeRows(question.content, { showGuidance: true })} />;
  }
  if (kind === "worked-solution") {
    return <QuestionHtml html={renderWorkedSolution(question.content)} className="worked-solution" />;
  }
  return <QuestionHtml html={renderQuestionHtml(question.content)} className="question-body" />;
}
