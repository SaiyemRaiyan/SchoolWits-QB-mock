/**
 * Flatten a parsed question to plain text for questions.search_vector.
 *
 * This lives here, next to the parser, because it is the only thing that
 * knows how to walk a Question — and because `search_vector` is generated
 * from q_text, NOT from content. Anything that writes `content` must write
 * q_text in the same statement or the question stays findable by its old
 * wording. There were two divergent copies of this before (the parse-paper
 * Edge Function and scripts/import-paper.ts); a third was about to appear
 * for question editing, so it is one function now.
 *
 * Math is dropped rather than indexed: "$\frac{1}{2}$" yields no useful
 * search terms, only noise like "frac".
 *
 * Deliberately typed loosely (`QuestionLike`) rather than against Question.
 * The Edge Function receives `content` back as anonymous JSON from the
 * database and from the edit modal, where it is jsonb and not a Question
 * instance. Requiring the exact type there would mean a cast at every call
 * site, which defeats the point of having one checked implementation.
 */

/** Truncation limit, matching the comment on questions.q_text. */
const MAX_LENGTH = 8000;

/**
 * The shape this walker needs. Every field is optional because it is also
 * applied to half-built questions: `answer` is null until the QA file is
 * uploaded, and `options` is null for anything that is not an MCQ.
 */
export interface QuestionLike {
  stem?: unknown[];
  parts?: unknown[];
  options?: { items?: { content?: string | null }[] } | null;
  answer?: {
    markScheme?: { answer?: string | null }[];
    // `heading` is genuinely `string | null` on SolutionSegment — an ansbox
    // without a title. Widening here rather than at the call sites is what
    // lets a real Question be passed straight in with no cast.
    workedSolution?: { heading?: string | null; html?: string | null }[];
  } | null;
}

/** Strips every math span, in both TeX conventions the papers use. */
const MATH = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]*\$|\\\([\s\S]*?\\\)/g;

export function flattenQuestion(q: QuestionLike | null | undefined): string {
  if (!q) return '';
  const out: string[] = [];

  const fromBlocks = (blocks: unknown[] | undefined) => {
    for (const block of blocks ?? []) {
      const b = block as { type?: string; html?: string; caption?: string };
      if (b.type === 'text') out.push(b.html ?? '');
      // A figure contributes its caption ("Fig. 1.1") and nothing else —
      // there is no text to index inside the image itself.
      else if (b.type === 'figure' && b.caption) out.push(b.caption);
      else if (b.type === 'table') out.push(b.html ?? '');
    }
  };

  const fromParts = (parts: unknown[] | undefined) => {
    for (const part of parts ?? []) {
      const p = part as { content?: unknown[]; subparts?: unknown[] };
      fromBlocks(p.content);
      fromParts(p.subparts);
    }
  };

  fromBlocks(q.stem);
  fromParts(q.parts);
  for (const item of q.options?.items ?? []) out.push(item.content ?? '');
  for (const row of q.answer?.markScheme ?? []) out.push(row.answer ?? '');
  for (const seg of q.answer?.workedSolution ?? []) {
    if (seg.heading) out.push(seg.heading);
    out.push(seg.html ?? '');
  }

  return out
    .join(' ')
    .replace(MATH, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH);
}
