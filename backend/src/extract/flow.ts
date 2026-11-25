/**
 * Placed pieces -> lines of inline LaTeX.
 *
 * Once nothing but text and maths is left, reading is a matter of position:
 * pieces on one baseline are a line, small print above or below it is a script
 * of what it stands next to, and a gap is a word space. Lines read top to
 * bottom; a line set in two columns keeps each column together.
 */

import { extent, baseSize, isComposite, right, sizeOf } from './equations/geometry.js';
import { toMath } from './to-math.js';
import { WORD_GAP } from './typesetter.js';
import type { Line, Piece, TextPiece } from './types.js';

export interface Flow {
  tex: string;
  /** Put together from positions rather than simply run on. */
  rebuilt: boolean;
  /** Some small print could belong to either of two lines. */
  ambiguous: boolean;
}

interface Row {
  y: number;
  anchors: Piece[];
  small: Piece[];
}

const SMALL = 0.86;
/** Baselines closer than this (in type sizes) are one line. */
const SAME_LINE = 0.26;

export function flow(line: Line): Flow {
  const pieces = line.pieces.filter((p) => p.kind === 'text' || p.kind === 'math');
  if (!pieces.length) return { tex: '', rebuilt: false, ambiguous: false };
  // A group that is all small print is not small against itself.
  const largest = Math.max(...pieces.map((p) => sizeOf(p, 0)));
  const base = largest > 0 && largest < SMALL * baseSize(pieces, line.size) ? largest : baseSize(pieces, line.size);
  const { rows, ambiguous } = toRows(pieces, base);
  const columns = splitColumns(rows, base);
  const parts = columns ?? rows.map((row) => rowTex(row, base));
  return {
    tex: parts.join(' ').replace(/ {2,}/g, ' ').trim(),
    rebuilt: rows.length > 1 || rows.some((r) => r.small.length > 0 || r.anchors.some(isComposite)),
    ambiguous,
  };
}

function toRows(pieces: Piece[], base: number): { rows: Row[]; ambiguous: boolean } {
  const isSmall = (p: Piece) => sizeOf(p, base) < SMALL * base;
  const rows: Row[] = [];
  for (const p of pieces.filter((q) => !isSmall(q)).sort((a, b) => b.y - a.y)) {
    const row = rows.find((r) => Math.abs(r.y - p.y) <= SAME_LINE * base);
    if (row) row.anchors.push(p);
    else rows.push({ y: p.y, anchors: [p], small: [] });
  }
  // The baseline of a line is where most of its text stands.
  for (const row of rows) row.y = commonY(row.anchors);

  let ambiguous = false;
  for (const p of pieces.filter(isSmall)) {
    const fits = rows.filter((r) => {
      const dy = p.y - r.y;
      const host = r.anchors.find((a) => isComposite(a) && p.x >= a.x - 1 && p.x - right(a) < 4);
      const up = host ? Math.max(0.95 * base, extent(host, base).top - r.y + 0.2 * base) : 0.95 * base;
      return dy > -0.75 * base && dy < up;
    });
    // Its own line leaves room for it; the line above or below does not.
    const clear = fits.filter((r) => !r.anchors.some((a) => overlap(a, p) > 0.4 * p.width));
    const from = clear.length ? clear : fits.length ? fits : rows;
    const off = (r: Row) => Math.min(Math.abs(p.y - r.y - 0.42 * base), Math.abs(p.y - r.y + 0.2 * base));
    const [best, next] = [...from].sort((a, b) => off(a) - off(b));
    if (next && clear.length !== 1 && Math.abs(off(best) - off(next)) < 0.06 * base) ambiguous = true;
    best.small.push(p);
  }
  return { rows: rows.sort((a, b) => b.y - a.y), ambiguous };
}

function commonY(list: Piece[]): number {
  const weight = new Map<number, number>();
  for (const p of list) {
    const key = Math.round(p.y * 10) / 10;
    weight.set(key, (weight.get(key) ?? 0) + (p.kind === 'text' ? p.text.length : 2));
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0][0];
}

function overlap(a: Piece, b: Piece): number {
  return Math.min(right(a), right(b)) - Math.max(a.x, b.x);
}

/**
 * "experiment 1 | wrapped text": the entries of a narrow left column, each
 * with a right column that runs over several lines. Only worth doing when the
 * left column wraps too; otherwise top to bottom is already right.
 */
function splitColumns(rows: Row[], base: number): string[] | null {
  if (rows.length < 2) return null;
  const all = rows.flatMap((r) => [...r.anchors, ...r.small]);
  const edges = [...new Set(all.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const left = edges[0];
  const gutter = edges.find((x) => x > left + base && all.every((p) => right(p) <= x - 0.9 * base || p.x >= x - 1));
  if (gutter === undefined) return null;
  const inLeft = (p: Piece) => p.x < gutter - 1;
  const starts = rows.filter((r) => r.anchors.some(inLeft));
  // Every row has both columns: an ordinary table or list, read across.
  if (starts.length === rows.length) {
    const bothWrap = rows.length === 2 && rows[0].y - rows[1].y < 1.4 * base && rows[0].anchors.filter(inLeft).length === 1;
    if (!bothWrap || !/[a-z]$/.test(textOf(rows[0].anchors.filter(inLeft)))) return null;
    if (!/^[a-z]/.test(textOf(rows[1].anchors.filter(inLeft)).trim())) return null;
    return [inLeft, (p: Piece) => !inLeft(p)].map((side) =>
      rows.map((r) => rowTex({ y: r.y, anchors: r.anchors.filter(side), small: r.small.filter(side) }, base)).join(' '),
    );
  }
  return null;
}

const textOf = (list: Piece[]) => list.map((p) => (p.kind === 'text' ? p.text : '')).join('');

// ---- one line -----------------------------------------------------------

interface Token {
  x: number;
  end: number;
  /** A run of plain text, whose neighbours in the same style join it. */
  text?: string;
  style?: string;
  /** Already LaTeX. */
  tex?: string;
  math?: string;
  script?: 'sup' | 'sub';
  /** The end is only an estimate: typed maths has been set since. */
  loose?: boolean;
}

function rowTex(row: Row, base: number): string {
  const items = [
    ...row.anchors.map((p) => ({ p, script: null as 'sup' | 'sub' | null })),
    ...row.small.map((p) => {
      const dy = p.y - row.y;
      return { p, script: dy > 0.2 * base ? ('sup' as const) : dy < -0.07 * base ? ('sub' as const) : null };
    }),
  ].sort((a, b) => a.p.x - b.p.x || (a.script === 'sup' ? -1 : 1));

  const tokens: Token[] = [];
  let loose = false;
  for (let i = 0; i < items.length; i++) {
    const { p, script } = items[i];
    if (script === null) {
      if (p.kind === 'text') tokens.push({ x: p.x, end: right(p), text: p.text, style: styleOf(p), loose });
      else if (p.kind === 'math') {
        loose ||= !isComposite(p);
        tokens.push({ x: p.x, end: right(p), math: p.tex, loose: !isComposite(p) });
        if (isComposite(p)) tokens[tokens.length - 1].tex = 'composite';
      }
      continue;
    }
    // Neighbouring small print on the same side is one script; anything
    // smaller still inside it is a script of the script.
    const group = [p];
    while (
      items[i + 1]?.script === script &&
      items[i + 1].p.x - right(group[group.length - 1]) < 0.45 * base &&
      !(items[i + 1].p.x < group[0].x - 1)
    ) group.push(items[++i].p);
    const inner = flow({ pieces: group, size: baseSize(group, base) }).tex;
    tokens.push({ x: p.x, end: Math.max(...group.map(right)), script, text: inner, loose });
  }
  return write(tokens, base);
}

function styleOf(p: TextPiece): string {
  const letters = /\p{L}/u.test(p.text);
  return `${p.bold ? 'b' : ''}${p.italic && letters ? 'i' : ''}${p.underline ? 'u' : ''}`;
}

function write(tokens: Token[], base: number): string {
  let out = '';
  // Text not yet written out, so neighbours in one style come out as one.
  let run = '';
  let style = '';
  const flush = () => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(run)!;
    if (m[2]) {
      let t = escape(m[2]);
      if (style.includes('i')) t = `\\textit{${t}}`;
      if (style.includes('b')) t = `\\textbf{${t}}`;
      if (style.includes('u')) t = `\\underline{${t}}`;
      out += m[1] + t + m[3];
    } else out += run;
    run = '';
  };

  tokens.forEach((token, i) => {
    const prev = tokens[i - 1];
    if (prev && needsSpace(prev, token, base)) run += ' ';
    if (token.script) {
      const host = prev?.tex === 'composite' && prev.math !== undefined;
      const inner = token.text ?? '';
      const maths = host || inner.includes('$') ? toMath(inner) : null;
      flush();
      if (maths !== null && host && out.endsWith('$')) {
        out = `${out.slice(0, -1)}${token.script === 'sup' ? '^' : '_'}{${maths}}$`;
      } else if (maths !== null) out += `$${token.script === 'sup' ? '^' : '_'}{${maths}}$`;
      else out += `\\text${token.script === 'sup' ? 'superscript' : 'subscript'}{${inner}}`;
      style = '';
    } else if (token.math !== undefined) {
      flush();
      // Two formulas side by side must not read as one $$ display.
      if (out.endsWith('$')) out += ' ';
      out += `$${token.math}$`;
      style = '';
    } else {
      const next = token.style ?? '';
      // Signs and digits look the same upright, so they do not end a run of
      // bold or italic words; a space never does.
      if (next !== style && run.trim() !== '') flush();
      else if (run.trim() === '' && next !== style) flush();
      style = next;
      run += token.text ?? '';
    }
  });
  flush();
  return out;
}

function needsSpace(prev: Token, token: Token, base: number): boolean {
  const before = prev.text ?? '';
  const after = token.text ?? '';
  if (/\s$/.test(before) || /^\s/.test(after)) return false;
  const gap = token.x - prev.end;
  if (!token.script && /^[,.;)\]]/.test(after) && gap < 0.6 * base) return false;
  if (!prev.script && /[([]$/.test(before) && gap < 0.4 * base) return false;
  // Typed maths is measured roughly: a word that seems to start inside it
  // stands after it.
  if (prev.loose && gap < -0.02 && /^[\p{L}\p{N}=]/u.test(after)) return true;
  return gap >= WORD_GAP * base;
}

function escape(s: string): string {
  return s.replace(/([%#&_${}])/g, '\\$1');
}
