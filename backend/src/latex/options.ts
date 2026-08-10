/**
 * Multiple-choice options.
 *
 * The source papers use four incompatible encodings for the same thing
 * (templates/README.md, issue 1), so this module detects which one is in
 * play and records it on `Options.source`. That field is not decoration —
 * it is how the upload UI can tell "parsed cleanly" from "needs the source
 * fixing", and `figure` means the options exist only as pixels and cannot
 * be recovered by any amount of parsing.
 *
 * Preference order is `choices` > `tabular` > `inline`, because a question
 * that uses the proper environment may also contain an unrelated table.
 */

import { findEnvironments, splitRows, splitTopLevel } from './scan.js';
import { splitItems } from './structure.js';
import { inlineToHtml } from './inline.js';
import type { Options } from './types.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** `\begin{choices}\item ...` — the format the template mandates. */
function fromChoices(body: string): Options | null {
  const envs = findEnvironments(body, 'choices');
  if (envs.length === 0) return null;

  const items = envs
    .flatMap((env) => splitItems(env.body))
    .map((raw, i) => ({ label: LETTERS[i] ?? `#${i + 1}`, content: inlineToHtml(raw) }))
    .filter((it) => it.content.length > 0);

  return items.length > 0 ? { source: 'choices', items } : null;
}

/**
 * A bare tabular whose rows are labelled A/B/C/D.
 *
 * Only tables that actually look like an option grid qualify — a data
 * table inside the stem must not be mistaken for the answer options.
 */
function fromTabular(body: string): Options | null {
  for (const env of findEnvironments(body, 'tabular')) {
    const rows = splitRows(env.body)
      .map((r) => r.replace(/\\hline|\\cline\{[^}]*\}/g, '').trim())
      .filter((r) => r.length > 0);

    const labelled = rows.filter((r) => /^\\textbf\{[A-D]\}/.test(r.trim()));
    if (labelled.length < 2) continue;

    const items = labelled.map((row) => {
      const cells = splitTopLevel(row, '&');
      const label = /\{([A-D])\}/.exec(cells[0] ?? '')?.[1] ?? '?';
      const content = cells.slice(1).map((c) => inlineToHtml(c)).filter(Boolean).join(' — ');
      return { label, content };
    });

    return { source: 'tabular', items };
  }
  return null;
}

/**
 * One-line `\textbf{A}\hspace{0.6em}20\,m\hspace{1.6cm}\textbf{B}...`.
 *
 * Fragile by nature — the separator is pure spacing, so the option text is
 * whatever sits between two bold letters.
 */
function fromInline(body: string): Options | null {
  const re = /\\textbf\{([A-D])\}/g;
  const hits: { label: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    hits.push({ label: m[1], start: m.index, end: m.index + m[0].length });
  }
  if (hits.length < 2) return null;

  // Must run A, B, C... in order to be an option list rather than emphasis.
  const inOrder = hits.every((h, i) => h.label === LETTERS[i]);
  if (!inOrder) return null;

  const items = hits.map((hit, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].start : body.length;
    return { label: hit.label, content: inlineToHtml(body.slice(hit.end, end)) };
  });

  return { source: 'inline', items };
}

/**
 * Detect and extract options from an MCQ question body.
 *
 * Returns a `figure`-sourced, empty-item result when no textual options
 * exist but the question has a figure — that is the unrecoverable case,
 * and it's better to say so explicitly than to return null.
 */
export function parseOptions(body: string): Options | null {
  const found = fromChoices(body) ?? fromTabular(body) ?? fromInline(body);
  if (found) return found;

  if (/\\qfig|\\includegraphics/.test(body)) {
    return { source: 'figure', items: [] };
  }
  return null;
}
