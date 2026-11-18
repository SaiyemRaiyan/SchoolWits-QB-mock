/**
 * The `mstab` mark-scheme grid -> rows.
 *
 * Two conventions here are counter-intuitive enough to be worth stating
 * before reading the code (both documented in templates/README.md):
 *
 * 1. **Labels carry UPWARD.** A part worth n marks is n rows sharing one
 *    label, and the label is written on the *last* row of the group as
 *    `\multirow{-n}{1.9cm}{1(a)}`; the rows above it have an empty first
 *    cell. The negative count is a deliberate workaround for a
 *    multirow/columncolor clipping bug, not a mistake. So a blank label
 *    means "belongs to a group whose label appears further down".
 *
 * 2. **Column count varies by paper.** Physics declares 3 columns
 *    (Question | Answer | Marks), Add Maths and Maths D declare 4
 *    (+ Partial Marks / Guidance). Both are invoked identically as
 *    `\begin{mstab}{qNcolor}`, so arity cannot be read from the call site.
 */

import { findEnvironments, splitRows, splitTopLevel } from './scan.js';
import { inlineToHtml } from './inline.js';
import type { ImageMap, MarkSchemeRow } from './types.js';

/** Strip the rules and tints that decorate a row but carry no content. */
function stripRowDecoration(row: string): string {
  return row
    .replace(/\\hline/g, '')
    .replace(/\\cline\{[^}]*\}/g, '')
    .replace(/\\rowcolor\{[^}]*\}/g, '')
    .replace(/\\arrayrulecolor\{[^}]*\}/g, '')
    .trim();
}

/**
 * Which way a label applies to the rows around it.
 *
 * This is the `\multirow` sign, and it is the whole reason two papers that
 * look alike parse differently:
 *
 *   `\multirow{-2}{1.9cm}{1(a)}`  negative -> the group is the 2 rows ENDING
 *                                 here, so the label carries UP  (Physics)
 *   `\multirow{2}{*}{3(b)}`       positive -> the group is the 2 rows STARTING
 *                                 here, so it carries DOWN  (Add Maths)
 *
 * A plain label with no \multirow also heads its group, so it carries down.
 * Getting this backwards leaves roughly half the Add Maths rows unattached
 * to any part.
 */
export type LabelDirection = 'up' | 'down';

export interface LabelCell {
  label: string | null;
  direction: LabelDirection;
}

export function parseLabelCellDetailed(cell: string): LabelCell {
  const cleaned = stripRowDecoration(cell);
  const mr = /\\multirow\{(-?)\d+\}\{[^}]*\}\{([^}]*)\}/.exec(cleaned);
  if (mr) return { label: mr[2].trim(), direction: mr[1] === '-' ? 'up' : 'down' };

  const plain = cleaned.replace(/\\[a-zA-Z]+\s*/g, '').trim();
  return { label: plain.length > 0 ? plain : null, direction: 'down' };
}

/**
 * Read the label out of a first cell. Returns null for a blank cell (a
 * continuation row) and the inner label for a `\multirow{...}` cell.
 */
export function parseLabelCell(cell: string): string | null {
  return parseLabelCellDetailed(cell).label;
}

/**
 * Split an answer cell into alternative acceptable answers.
 *
 * `\newline or \newline` between forms is the papers' convention; a bare
 * `\newline` is also used for a plain line break inside one answer, so a
 * lone "or" separator is required rather than splitting on every break.
 */
export function splitAlternatives(cell: string): string[] {
  const pieces = cell
    .split(/\\newline\s*or\s*\\newline/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return pieces.length > 1 ? pieces.map((p) => inlineToHtml(p)) : [];
}

/** Marks encoded in a code cell: "B1" -> 1, "M2" -> 2, "" -> 0. */
export function marksFromCode(code: string): number {
  const m = /(\d+)/.exec(code);
  return m ? Number(m[1]) : 0;
}

/**
 * Parse one mstab body into rows.
 *
 * `columns` decides whether a trailing cell is guidance or overflow. When
 * a row carries fewer cells than declared, the missing ones read as empty
 * rather than throwing — real files have ragged rows.
 */
export function parseMstab(body: string, columns: 3 | 4 = 3, _images: ImageMap = {}): MarkSchemeRow[] {
  // Pass 1: build the rows, recording only the label each row states for
  // ITSELF. Nothing is inherited yet.
  interface Draft {
    own: string | null;
    direction: LabelDirection;
    row: MarkSchemeRow;
  }
  const drafts: Draft[] = [];

  // \altrow expands to a full-width cell that supplies its OWN `\\`, so in
  // the raw source it has no row break before it and would otherwise be
  // glued to the row that follows. Give it a real row break.
  const expanded = body.replace(/\\altrow\{[^}]*\}\{([^}]*)\}/g, '\\altrowmark{$1} \\\\ ');

  for (const rawRow of splitRows(expanded)) {
    const row = stripRowDecoration(rawRow);
    if (row.length === 0) continue;

    // A full-width heading introducing an alternative method — not a mark
    // row. It states no label of its own and inherits like a blank row.
    const alt = /\\altrowmark\{([^}]*)\}/.exec(row);
    if (alt) {
      drafts.push({
        own: null,
        direction: 'down',
        row: {
          ref: '',
          answer: inlineToHtml(alt[1]),
          alternatives: [],
          code: '',
          marks: 0,
          guidance: null,
          banner: true,
        },
      });
      continue;
    }

    const cells = splitTopLevel(row, '&');
    // The header row is literal text in the environment definition, but a
    // stray one in the body would otherwise become a bogus mark row.
    if (/^\s*Question\s*$/i.test(cells[0] ?? '')) continue;

    const { label, direction } = parseLabelCellDetailed(cells[0] ?? '');
    const answerRaw = (cells[1] ?? '').trim();
    const codeRaw = stripRowDecoration(cells[2] ?? '')
      .replace(/\\[a-zA-Z]+\s*/g, '')
      .replace(/[{}]/g, '')
      .trim();
    const guidanceRaw = columns === 4 ? (cells[3] ?? '').trim() : '';

    drafts.push({
      own: label,
      direction,
      row: {
        ref: label ?? '',
        answer: inlineToHtml(answerRaw),
        alternatives: splitAlternatives(answerRaw),
        code: codeRaw,
        marks: marksFromCode(codeRaw),
        guidance: columns === 4 ? inlineToHtml(guidanceRaw) : null,
        banner: false,
      },
    });
  }

  // Pass 2a: a NEGATIVE \multirow labels the rows ending at it, so walk
  // upward from it over rows that stated no label of their own, stopping at
  // the first row that did.
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!d.own || d.direction !== 'up') continue;
    for (let j = i - 1; j >= 0 && !drafts[j].own; j--) {
      drafts[j].row.ref = d.own;
    }
  }

  // Pass 2b: everything still unlabelled belongs to the nearest label above
  // it — a positive \multirow, a plain group label, or the part an
  // "Alternative" block offers another route to.
  //
  // Deliberately no reliance on \hline vs \cline: Physics uses \hline to
  // close a part, but Add Maths uses it between every row of an alternative
  // block, so the rules are not a usable group boundary. Label adjacency is.
  let above: string | null = null;
  for (const d of drafts) {
    if (d.own) above = d.own;
    else if (!d.row.ref && above) d.row.ref = above;
  }

  return drafts.map((d) => d.row);
}

/** Every mstab in a question body, flattened in document order. */
export function extractMarkScheme(
  body: string,
  columns: 3 | 4 = 3,
  images: ImageMap = {},
): MarkSchemeRow[] {
  return findEnvironments(body, 'mstab').flatMap((env) => parseMstab(env.body, columns, images));
}
