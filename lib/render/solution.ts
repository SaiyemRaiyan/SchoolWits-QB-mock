import type { QuestionContent, SolutionSegment } from "./types";

import { escapeAttr, escapeHTML } from "./escape";

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

  return head + groupByRef(segments).map(renderGroup).join("");
}

type Group = { ref: string | null; heading: string; bodies: string[] };

/** A part explained in several paragraphs, or in several segments that name
    the same part, is one box. Only neighbours merge, so order is kept. */
function groupByRef(segments: SolutionSegment[]): Group[] {
  const groups: Group[] = [];
  for (const seg of segments) {
    const ref = seg.ref ?? null;
    const last = groups.at(-1);
    if (last && last.ref === ref) {
      if (!last.heading && seg.heading) last.heading = seg.heading;
      if (seg.html) last.bodies.push(seg.html);
    } else {
      groups.push({ ref, heading: seg.heading || "", bodies: seg.html ? [seg.html] : [] });
    }
  }
  return groups;
}

// "1(c)(ii)" -> "(c)(ii)": the question is already named by the box around it.
function partLabel(ref: string | null): string {
  if (!ref) return "";
  return ref.replace(/^\d+/, "") || ref;
}

function renderGroup(group: Group): string {
  const label = partLabel(group.ref);
  const title = group.heading;
  const header =
    label || title
      ? '<h4 class="worked-solution-head">' +
        (label ? `<span class="ws-ref">${escapeHTML(label)}</span>` : "") +
        (title ? `<span class="ws-title">${title}</span>` : "") +
        "</h4>"
      : "";

  const ref = group.ref ? ` data-ref="${escapeAttr(group.ref)}"` : "";
  return (
    `<div class="worked-solution-part"${ref}>` +
    header +
    `<div class="ws-body${startsWithPlainWord(group.bodies[0]) ? " ws-cap" : ""}">${group.bodies.map(paragraphs).join("")}</div>` +
    "</div>"
  );
}

// A solution that opens "For (b), opening the parachute..." reads on from its
// label, so the sentence starts in lowercase beside the part chip. The first
// letter is raised by the stylesheet (the text itself is never changed), and
// only for an ordinary English word, so a symbol or unit such as "g is the
// field strength" or "mg is the weight" is left exactly as authored. That means
// three letters or more, or one of the common short words, minus a few that
// are usually quantities or functions (every opening word in the sample papers
// is an ordinary word; this guards the ones that are not yet written).
const SHORT_WORDS = new Set(["at", "in", "to", "an", "up", "by", "on", "of", "as", "is", "it", "or", "if", "so", "no", "we"]);
const NOT_PROSE = new Set(["sin", "cos", "tan", "log", "exp", "emf", "rms", "mol", "rho", "eta", "phi", "psi", "tau", "mu"]);

function startsWithPlainWord(html: string | undefined): boolean {
  const word = /^\s*([a-z]+)(?=[\s,.;:])/.exec(html ?? "")?.[1];
  if (!word || NOT_PROSE.has(word)) return false;
  return word.length >= 3 || SHORT_WORDS.has(word);
}

// The parser keeps authored blank lines inside a segment's html. Without
// turning them back into paragraphs a whole explanation ran together as one
// block. TeX forbids a blank line inside display maths, so a plain split is
// safe; lists and block elements are left as the parser wrote them.
function paragraphs(html: string): string {
  return html
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (/^<(ul|ol|div|table)[ >]/.test(chunk) ? chunk : `<p>${chunk}</p>`))
    .join("");
}
