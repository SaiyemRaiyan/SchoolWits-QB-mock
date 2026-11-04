"use client";

import { QuestionHtml } from "@/components/browse/question-html";
import { MarkSchemeTable } from "@/components/browse/mark-scheme-table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { renderQuestionHtml, renderWorkedSolution, toMarkSchemeRows } from "@/lib/render";
import type { Question } from "@/lib/supabase";

/** A bank question, or a module's edited copy of one. */
type PreviewQuestion = Question & { hasOverride?: boolean };

/** What a student sees inside a module. The builder's View uses the same
    component, so a preview can never drift from the real thing. */
export function QuestionPreview({ question }: { question: PreviewQuestion }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-serif text-lg font-semibold">Q{question.id}</h4>
        {question.topic && <Badge variant="outline">{question.topic}</Badge>}
        <Badge variant="outline">{question.marks ?? "?"} marks</Badge>
        {question.hasOverride && <Badge variant="secondary">Edited for this module</Badge>}
      </div>

      <QuestionHtml html={renderQuestionHtml(question.content)} className="question-body" />

      <Section label="Mark scheme">
        <MarkSchemeTable rows={toMarkSchemeRows(question.content, { showGuidance: true })} />
      </Section>
      <Section label="Worked solution">
        <QuestionHtml html={renderWorkedSolution(question.content)} className="worked-solution" />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start font-mono text-[11px] tracking-wider uppercase"
          />
        }
      >
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
