/* Turns a question's stored `content` into HTML. The parser knows LaTeX and
   emits inline tags; this knows CSS classes and emits structure. */
import type { QuestionContent } from "@/lib/supabase";

import { renderBlocks } from "./blocks";
import { escapeHTML } from "./escape";
import { renderOptions } from "./options";
import { renderParts } from "./parts";

export { toMarkSchemeRows, type MarkSchemeDisplayRow } from "./mark-scheme";
export { renderWorkedSolution } from "./solution";
export { escapeAttr, escapeHTML } from "./escape";

const EMPTY_MESSAGE = "No question text was parsed from the uploaded file.";

/** Stem, then options (MCQ) or parts (structured). */
export function renderQuestionHtml(content: QuestionContent | null): string {
  if (!content) return emptyQuestion();

  const html =
    renderBlocks(content.stem) + renderOptions(content.options) + renderParts(content.parts);

  return html || emptyQuestion();
}

function emptyQuestion(): string {
  return `<p><i>${escapeHTML(EMPTY_MESSAGE)}</i></p>`;
}

/** Leaf marks only: a part that just groups subparts has marks:null. */
export function collectMarksBreakdown(
  content: QuestionContent | null,
): { label: string; marks: number }[] {
  const out: { label: string; marks: number }[] = [];
  const walk = (list: NonNullable<QuestionContent["parts"]>) => {
    list.forEach((p) => {
      if (p.marks != null) out.push({ label: p.label, marks: p.marks });
      else if (p.subparts?.length) walk(p.subparts);
    });
  };
  walk(content?.parts ?? []);
  return out;
}
