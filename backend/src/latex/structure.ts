/**
 * The parts/subparts tree, and the refs that key everything together.
 *
 * The single most important thing this module does: **generate the part
 * labels**. `(a)`, `(b)`, `(i)`, `(ii)` are never written in the source —
 * enumitem renders them from list position. The mark scheme, however, keys
 * its rows by exactly those labels (`1(c)(ii)`). So reconstructing them
 * correctly from position is what allows the QP and QA halves to be joined
 * at all. Get this wrong and every mark-scheme row lands on the wrong part.
 */

import { findCommand, findEnvironments } from './scan.js';
import { toBlocks } from './content.js';
import { parseMarkTag } from './blocks.js';
import type { AnswerSpace, Block, ImageMap, Part } from './types.js';

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const ROMAN = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv',
];

export function alphaLabel(index: number): string {
  return ALPHA[index] ?? `p${index + 1}`;
}

export function romanLabel(index: number): string {
  return ROMAN[index] ?? `r${index + 1}`;
}

/**
 * Split a list body on `\item`, but only at environment depth 0.
 *
 * Without the depth check, an `\item` inside a nested `\begin{subparts}`
 * would split the enclosing `parts` list and shatter the tree.
 */
export function splitItems(body: string): string[] {
  const tokenRe = /\\begin\{([a-zA-Z*]+)\}|\\end\{([a-zA-Z*]+)\}|\\item\b/g;
  const starts: number[] = [];
  let depth = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(body))) {
    if (m[1]) depth++;
    else if (m[2]) depth--;
    else if (depth === 0) starts.push(m.index);
  }

  if (starts.length === 0) return [];
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : body.length;
    return body.slice(start + '\\item'.length, end);
  });
}

interface Extracted {
  answerSpace: AnswerSpace | null;
  marks: number | null;
  /** The run with the answer-space macros removed. */
  rest: string;
}

/**
 * Pull the answer-space macro (and therefore the part's marks) out of a run.
 *
 * These macros are layout — ruled lines on a printed page. The only thing
 * worth keeping is the mark value in their last argument, plus the kind,
 * which hints at expected answer length.
 *
 * When a part carries several (a multi-value numeric answer using two
 * \ansval lines, say) the marks are summed and the first kind wins.
 */
export function extractAnswerSpace(raw: string): Extracted {
  let answerSpace: AnswerSpace | null = null;
  let marks: number | null = null;
  const cuts: [number, number][] = [];

  const addMarks = (n: number | null) => {
    if (n === null) return;
    marks = (marks ?? 0) + n;
  };

  for (const call of findCommand(raw, 'Alines', 2)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[1]));
    if (!answerSpace) {
      const lines = Number.parseInt(call.args[0], 10);
      answerSpace = { kind: 'lines', lines: Number.isFinite(lines) ? lines : 0 };
    }
  }

  for (const call of findCommand(raw, 'ansval', 3)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[2]));
    if (!answerSpace) {
      answerSpace = { kind: 'value', label: call.args[0].trim(), unit: call.args[1].trim() };
    }
  }

  for (const call of findCommand(raw, 'markright', 1)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[0]));
    if (!answerSpace) answerSpace = { kind: 'markright' };
  }

  // Some Maths D parts hand-roll their answer line out of \makebox/\dotfill
  // instead of using a macro, leaving the marks in a bare `\mbox{[2]}`.
  // Only an mbox whose entire content is a mark tag counts — \mbox is also
  // used for ordinary text.
  for (const call of findCommand(raw, 'mbox', 1)) {
    if (!/^\s*\[\s*\d+\s*\]\s*$/.test(call.args[0])) continue;
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[0]));
    if (!answerSpace) answerSpace = { kind: 'markright' };
  }

  // Cut from the end so earlier offsets stay valid.
  cuts.sort((a, b) => b[0] - a[0]);
  let rest = raw;
  for (const [start, end] of cuts) rest = rest.slice(0, start) + rest.slice(end);

  return { answerSpace, marks, rest };
}

/**
 * Build one part (and its subparts) from a list item.
 *
 * `parentRef` is the ref this part hangs off — the question number for a
 * top-level part ("1" -> "1(a)"), or the part's own ref for a subpart
 * ("1(c)" -> "1(c)(i)").
 */
function buildPart(
  itemBody: string,
  label: string,
  parentRef: string,
  images: ImageMap,
  isSub: boolean,
): Part {
  const ref = `${parentRef}(${label})`;

  // A part's own content stops where its subparts begin.
  const subEnvs = isSub ? [] : findEnvironments(itemBody, 'subparts');
  let ownRaw = itemBody;
  const subparts: Part[] = [];

  if (subEnvs.length > 0) {
    ownRaw = itemBody.slice(0, subEnvs[0].start) + itemBody.slice(subEnvs[subEnvs.length - 1].end);
    for (const env of subEnvs) {
      splitItems(env.body).forEach((sub, i) => {
        subparts.push(buildPart(sub, romanLabel(i), ref, images, true));
      });
    }
  }

  const { answerSpace, marks, rest } = extractAnswerSpace(ownRaw);

  return {
    label,
    ref,
    // A grouping part has no marks of its own — they live on the subparts.
    marks: subparts.length > 0 ? sumMarks(subparts) : marks,
    answerSpace,
    content: toBlocks(rest, images),
    subparts,
  };
}

function sumMarks(parts: Part[]): number | null {
  const known = parts.map((p) => p.marks).filter((m): m is number => m !== null);
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null;
}

export interface StructuredBody {
  stem: Block[];
  parts: Part[];
}

/**
 * Split a question body into its stem and its parts tree.
 *
 * A question with no `\begin{parts}` (an MCQ, or a one-part structured
 * question) yields an empty parts array and everything in the stem.
 */
export function parseStructure(
  body: string,
  questionNumber: number,
  images: ImageMap = {},
): StructuredBody {
  const envs = findEnvironments(body, 'parts');
  const ref = String(questionNumber);

  if (envs.length === 0) {
    const { rest } = extractAnswerSpace(body);
    return { stem: toBlocks(rest, images), parts: [] };
  }

  const stemRaw = body.slice(0, envs[0].start) + body.slice(envs[envs.length - 1].end);
  const parts: Part[] = [];
  // Lettering runs continuously across the question. A question split into
  // two `parts` environments (it happens, around a page break) still reads
  // (a) (b) (c) (d), not (a) (b) (a) (b) — so the counter is `parts.length`,
  // not the index within one environment.
  for (const env of envs) {
    for (const item of splitItems(env.body)) {
      parts.push(buildPart(item, alphaLabel(parts.length), ref, images, false));
    }
  }

  return { stem: toBlocks(stemRaw, images), parts };
}
