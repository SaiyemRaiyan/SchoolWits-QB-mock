"use client";

import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import { paperLabel, type Question } from "@/lib/supabase";

import { MarkSchemeTable } from "./mark-scheme-table";
import { QuestionHtml } from "./question-html";

/** The whole paper read end to end, as the three documents a candidate gets. */
export function PaperDocument({ questions }: { questions: Question[] }) {
  const meta = questions[0];
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
    [questions],
  );

  if (!meta) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">No questions found for this paper.</Card>;
  }

  return (
    <Tabs defaultValue="paper">
      <TabsList>
        <TabsTrigger value="paper">Question Paper</TabsTrigger>
        <TabsTrigger value="markscheme">Mark Scheme</TabsTrigger>
        <TabsTrigger value="worked-solution">Worked Solutions</TabsTrigger>
      </TabsList>

      {(
        [
          ["paper", "Question Paper"],
          ["markscheme", "Mark Scheme"],
          ["worked-solution", "Worked Solutions"],
        ] as const
      ).map(([value, title]) => (
        <TabsContent key={value} value={value}>
          <Card className="gap-0 py-0">
            <CardContent className="p-6">
              <header className="mb-6 border-b pb-4">
                <p className="font-mono text-xs text-muted-foreground">
                  {paperLabel(meta)} &middot; {meta.subject}
                </p>
                <h2 className="font-serif text-2xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground">
                  {questions.length} question{questions.length === 1 ? "" : "s"} &middot;{" "}
                  {totalMarks || "·"} total marks
                </p>
              </header>

              <div className="grid gap-8">
                {questions.map((q) => (
                  <article key={q.uid} className="border-l-4 border-primary/40 pl-4">
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
