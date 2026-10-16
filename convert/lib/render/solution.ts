import type { QuestionContent, SolutionSegment } from "@/lib/supabase";

import { escapeHTML } from "./escape";

const EMPTY_MESSAGE = "No worked solution uploaded for this question.";

export function renderWorkedSolution(content: QuestionContent | null): string {
  const segments = content?.answer?.workedSolution;
  if (!Array.isArray(segments) || !segments.length) {
    return `<p><i>${EMPTY_MESSAGE}</i></p>`;
  }

  // For MCQ the letter is the answer, so it leads rather than hiding at the end.
  const correct = content?.answer?.correct;
  const head = correct
    ? `<p class="worked-solution-correct"><strong>Answer: ${escapeHTML(correct)}</strong></p>`
    : "";

  return head + segments.map(renderSegment).join("");
}

function renderSegment(seg: SolutionSegment): string {
  const label = segmentLabel(seg);
  return (
    '<div class="worked-solution-part">' +
    (label ? `<h4 class="worked-solution-head">${label}</h4>` : "") +
    `<div>${seg.html || ""}</div>` +
    "</div>"
  );
}

// The ref is a plain string so it is escaped; the heading is already a parser
// fragment and may contain math.
function segmentLabel(seg: SolutionSegment): string {
  const ref = seg.ref ? escapeHTML(seg.ref) : "";
  const heading = seg.heading || "";
  if (ref && heading) return `${ref}: ${heading}`;
  return ref || heading;
}
