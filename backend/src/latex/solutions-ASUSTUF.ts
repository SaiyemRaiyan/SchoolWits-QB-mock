/**
 * The `ansbox` worked solution -> segments keyed to part refs.
 *
 * Inside the box, part headings are plain text lines that start with a
 * `(a)` / `(c)(i)` marker followed by a title and `\\[4pt]`. They are not
 * a list or a sectioning command, so splitting is on that leading marker.
 *
 * MCQ answer boxes have no markers at all — they get a single segment with
 * a null ref, plus the correct letter pulled out separately.
 */

import { findEnvironments } from './scan.js';
import { inlineToHtml } from './inline.js';
import type { SolutionSegment } from './types.js';

/** `(a)`, `(c)(i)`, `(iii)` at the start of a line. */
const MARKER = /^\s*(\((?:[a-z]+|[ivx]+)\)(?:\((?:[ivx]+)\))?)\s*/;

/**
 * Split an ansbox body into segments.
 *
 * `questionNumber` prefixes the refs so they match the mark scheme's
 * `1(c)(ii)` form rather than a bare `(c)(ii)`.
 */
export function parseAnsbox(body: string, questionNumber: number): SolutionSegment[] {
  const lines = body.split('\n');
  const segments: SolutionSegment[] = [];

  let currentRef: string | null = null;
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const raw = buffer.join('\n').trim();
    if (!raw && !currentHeading) return;
    segments.push({
      ref: currentRef,
      heading: currentHeading,
      html: inlineToHtml(raw),
    });
    buffer = [];
  };

  for (const line of lines) {
    const m = MARKER.exec(line);
    // A marker only starts a new segment when it heads its own line — a
    // "(a)" mid-sentence inside prose must not split the box.
    if (m) {
      flush();
      const suffix = line.slice(m[0].length);
      currentRef = `${questionNumber}${m[1]}`;
      // The heading runs to the \\[4pt] that ends the title line.
      const headingEnd = suffix.search(/\\\\/);
      const headingRaw = headingEnd === -1 ? suffix : suffix.slice(0, headingEnd);
      currentHeading = headingRaw.trim() ? inlineToHtml(headingRaw) : null;
      const rest = headingEnd === -1 ? '' : suffix.slice(headingEnd).replace(/^\\\\(\[[^\]]*\])?/, '');
      buffer = rest.trim() ? [rest] : [];
      continue;
    }
    buffer.push(line);
  }
  flush();

  return segments.filter((s) => s.html.length > 0 || s.heading);
}

/**
 * The correct MCQ letter.
 *
 * Physics 5054/11 records this only in the worked-solution prose (there is
 * no mark-scheme table for MCQ papers at all — templates/README.md, issue
 * 5), so it has to be read out of text like "\textbf{Answer: A}".
 */
export function parseCorrectOption(body: string): string | null {
  const at = body.search(/\bAnswer\b/);
  if (at === -1) return null;

  // The letter is wrapped differently in every paper — `Answer: A`,
  // `\textbf{Answer: B}`, `Answer: $\boxed{\text{C}}$`. Rather than trying
  // to match each shape, strip the LaTeX scaffolding off the text that
  // follows and take the first standalone letter.
  const after = body
    .slice(at + 'Answer'.length, at + 80)
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[${}[\]:\-.,]/g, ' ')
    .trim();

  const m = /^([A-D])\b/.exec(after);
  return m ? m[1] : null;
}

/** Every ansbox in a question body, flattened. */
export function extractSolution(body: string, questionNumber: number): SolutionSegment[] {
  return findEnvironments(body, 'ansbox').flatMap((env) => parseAnsbox(env.body, questionNumber));
}

export function extractCorrectOption(body: string): string | null {
  for (const env of findEnvironments(body, 'ansbox')) {
    const letter = parseCorrectOption(env.body);
    if (letter) return letter;
  }
  return null;
}
