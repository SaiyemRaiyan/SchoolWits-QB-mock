"use client";

import { MarkSchemeTable } from "@/components/browse/mark-scheme-table";
import { QuestionHtml } from "@/components/browse/question-html";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import type { ParsedQuestion } from "@/lib/supabase";

/** The same renderer Browse uses, so this is a faithful check of what will
    be shown rather than an approximation. */
export function PreviewPanel({ questions }: { questions: ParsedQuestion[] }) {
  if (!questions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Parsed questions appear here as soon as the questions file is loaded.
      </p>
    );
  }

  return (
    <Tabs defaultValue="paper">
      <TabsList>
        <TabsTrigger value="paper">Question Paper</TabsTrigger>
        <TabsTrigger value="markscheme">Mark Scheme</TabsTrigger>
        <TabsTrigger value="worked-solution">Worked Solutions</TabsTrigger>
      </TabsList>

      {(["paper", "markscheme", "worked-solution"] as const).map((kind) => (
        <TabsContent key={kind} value={kind}>
          <ScrollArea className="h-[32rem] rounded-lg border">
            <div className="grid gap-6 p-4">
              {questions.map((q) => (
                <article key={q.number} className="border-l-4 border-border pl-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-base font-semibold">Question {q.number}</h3>
                    {q.topics.map((t) => (
                      <Badge key={t} variant="outline" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="font-mono">
                      {q.marks} marks
                    </Badge>
                  </div>
                  <PreviewBody kind={kind} question={q} />
                </article>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function PreviewBody({
  kind,
  question,
}: {
  kind: "paper" | "markscheme" | "worked-solution";
  question: ParsedQuestion;
}) {
  if (kind === "markscheme") {
    return <MarkSchemeTable rows={toMarkSchemeRows(question, { showGuidance: true })} />;
  }
  if (kind === "worked-solution") {
    return <QuestionHtml html={renderWorkedSolution(question)} className="worked-solution" />;
  }
  return <QuestionHtml html={renderQuestionHtml(question)} className="question-body" />;
}
