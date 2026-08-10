/**
 * A raw LaTeX run -> an ordered list of content Blocks.
 *
 * (This is the module I described as `figures.ts` when sketching the layout;
 * it turned out to own tables and paragraph splitting too, so it's named for
 * what it does.)
 *
 * Figures and tabulars are lifted out as their own blocks; everything
 * between them is split on blank lines into paragraphs and handed to
 * inlineToHtml.
 */

import { findCommand, findEnvironments, splitRows, splitTopLevel } from './scan.js';
import { inlineToHtml } from './inline.js';
import type { Block, ImageMap } from './types.js';

/**
 * Resolve a `\qfig` filename against the supplied image map.
 *
 * Matching is case-insensitive and also tries the basename, because the
 * .tex refers to `fig1.png` while an upload may key the map by a longer
 * path. Returns null when there's no match — a normal outcome, since most
 * figures are simply absent from the source folders.
 */
export function resolveImage(file: string, images: ImageMap): string | null {
  const want = file.trim().toLowerCase();
  if (!want) return null;

  for (const [key, url] of Object.entries(images)) {
    if (key.trim().toLowerCase() === want) return url;
  }
  const base = want.split('/').pop() ?? want;
  for (const [key, url] of Object.entries(images)) {
    const keyBase = key.trim().toLowerCase().split('/').pop() ?? '';
    if (keyBase === base) return url;
  }
  return null;
}

/** Cells that are pure formatting rather than content. */
function cleanCell(cell: string): string {
  return cell
    .replace(/\\multicolumn\{\d+\}\{[^}]*\}/g, '')
    .replace(/\\multirow\{-?\d+\}\{[^}]*\}/g, '')
    .replace(/\\rowcolor\{[^}]*\}/g, '')
    .replace(/\\cellcolor\{[^}]*\}/g, '')
    .replace(/\\columncolor\{[^}]*\}/g, '')
    .replace(/\\makecell/g, '')
    .replace(/\\hline/g, '')
    .replace(/\\cline\{[^}]*\}/g, '')
    .trim();
}

/**
 * A tabular -> an HTML table.
 *
 * Deliberately shallow: no colspan/rowspan reconstruction, no column
 * alignment. These tables are mostly MCQ option grids and small data
 * tables, where getting the cell text out intact is the whole job.
 */
export function tabularToHtml(body: string): string {
  const rows = splitRows(body)
    .map((r) => r.trim())
    .filter((r) => cleanCell(r).length > 0);

  const html = rows
    .map((row) => {
      const cells = splitTopLevel(row, '&').map((c) => inlineToHtml(cleanCell(c)));
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    })
    .join('');

  return `<table>${html}</table>`;
}

interface Span {
  start: number;
  end: number;
  block: Block;
}

/** Split a plain run into paragraph text blocks on blank lines. */
function paragraphs(raw: string): Block[] {
  return raw
    .split(/\n\s*\n/)
    .map((p) => inlineToHtml(p))
    .filter((html) => html.length > 0)
    .map((html) => ({ type: 'text', html }) satisfies Block);
}

/**
 * Convert a raw LaTeX run into blocks.
 *
 * `images` may be empty; figures then carry `src: null`, which is a normal
 * state rather than an error (see types.ts).
 */
export function toBlocks(raw: string, images: ImageMap = {}): Block[] {
  const spans: Span[] = [];

  for (const call of findCommand(raw, 'qfig', 2, true)) {
    const file = call.args[0].trim();
    spans.push({
      start: call.start,
      end: call.end,
      block: {
        type: 'figure',
        file,
        src: resolveImage(file, images),
        caption: inlineToHtml(call.args[1] ?? ''),
        width: call.optional,
      },
    });
  }

  // \includegraphics is the composer's (Quick Add) spelling of the same idea.
  for (const call of findCommand(raw, 'includegraphics', 1, true)) {
    const file = call.args[0].trim();
    spans.push({
      start: call.start,
      end: call.end,
      block: {
        type: 'figure',
        file,
        src: resolveImage(file, images),
        caption: '',
        width: call.optional,
      },
    });
  }

  for (const env of findEnvironments(raw, 'tabular')) {
    // \begin{tabular}{|c|c|} — the column spec is an argument we discard.
    spans.push({
      start: env.start,
      end: env.end,
      block: { type: 'table', html: tabularToHtml(env.body) },
    });
  }

  spans.sort((a, b) => a.start - b.start);

  // Drop spans nested inside an earlier one (a tabular inside a center, say)
  // so content isn't emitted twice.
  const top: Span[] = [];
  let cursor = -1;
  for (const s of spans) {
    if (s.start >= cursor) {
      top.push(s);
      cursor = s.end;
    }
  }

  const out: Block[] = [];
  let pos = 0;
  for (const span of top) {
    out.push(...paragraphs(raw.slice(pos, span.start)));
    out.push(span.block);
    pos = span.end;
  }
  out.push(...paragraphs(raw.slice(pos)));

  return out;
}
