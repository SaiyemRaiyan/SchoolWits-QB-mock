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

/**
 * `loose`: for a line that is passed. What was stacked and not understood (the
 * top or bottom of a fraction, a few characters on a row of their own) is read
 * into the line it stands beside, left to right, where a person fixing it
 * expects it.
 */
export function flow(line: Line, loose = false): Flow {
  const pieces = line.pieces.filter((p) => p.kind === 'text' || p.kind === 'math');
  if (!pieces.length) return { tex: '', rebuilt: false, ambiguous: false };
  // A group that is all small print is not small against itself.
  const largest = Math.max(...pieces.map((p) => sizeOf(p, 0)));
  const base = largest > 0 && largest < SMALL * baseSize(pieces, line.size) ? largest : baseSize(pieces, line.size);
  const read = toRows(pieces, base);
  const rows = loose ? foldShortRows(read.rows, base) : read.rows;
  // Lines of full-size type closer than a line apart, one over the other, are
  // set out in two dimensions (molecules stacked round an arrow): not lines.
  const span = (r: Row) => [Math.min(...r.anchors.map((p) => p.x)), Math.max(...r.anchors.map(right))];
  const stacked = read.rows.some((r, i) => {
    const next = read.rows[i + 1];
    if (!next || r.y - next.y >= 0.95 * base) return false;
    const [a, b] = [span(r), span(next)];
    return a[0] < b[1] && b[0] < a[1];
  });
  const unsure = read.ambiguous || stacked;
  const doubt = { ambiguous: unsure };
  const columns = splitColumns(rows, base);
  const parts = columns ?? rows.map((row) => rowTex(row, base, doubt));
  return {
    tex: parts.join(' ').replace(/ {2,}/g, ' ').trim(),
    rebuilt: rows.length > 1 || rows.some((r) => r.small.length > 0 || r.anchors.some(isComposite)),
    ambiguous: doubt.ambiguous,
  };
}

function foldShortRows(rows: Row[], base: number): Row[] {
  const size = (r: Row) => [...r.anchors, ...r.small].reduce((n, p) => n + (p.kind === 'text' ? p.text.trim().length : 4), 0);
  const kept = rows.filter((r) => size(r) > 4);
  for (const r of rows.filter((x) => size(x) <= 4)) {
    // Inside the line it is folded into; a row starting at that line's left edge is the next line.
    const left = (x: Row) => Math.min(...[...x.anchors, ...x.small].map((p) => p.x));
    const host = kept
      .filter((k) => Math.abs(k.y - r.y) < 1.2 * base && left(r) > left(k) + 0.5 * base)
      .sort((a, b) => Math.abs(a.y - r.y) - Math.abs(b.y - r.y))[0];
    if (host) {
      host.anchors.push(...r.anchors);
      host.small.push(...r.small);
    } else kept.push(r);
  }
  return kept.sort((a, b) => b.y - a.y);
}

function toRows(pieces: Piece[], base: number, sameLine = SAME_LINE): { rows: Row[]; ambiguous: boolean } {
  const isSmall = (p: Piece) => sizeOf(p, base) < SMALL * base;
  const rows: Row[] = [];
  // A sign set larger than the text (a bullet) is lowered to centre it: it
  // belongs to the line its middle stands in, not to where its foot is.
  const isSign = (p: Piece) => p.kind === 'text' && !/[\p{L}\p{N}]/u.test(p.text) && p.size > 1.2 * base;
  const anchors = pieces.filter((q) => !isSmall(q));
  // Short typed maths is placed last: raised a little beside a word (ms and a
  // "$-^{1}$" set 4bp up), it is that line's, typed as it stands.
  const typed = (p: Piece) => p.kind === 'math' && !isComposite(p) && p.tex.length <= 12;
  const ordered = anchors.filter((q) => !isSign(q)).sort((a, b) => Number(typed(a)) - Number(typed(b)) || b.y - a.y);
  for (const p of ordered) {
    let row = rows.find((r) => Math.abs(r.y - p.y) <= sameLine * base);
    if (!row && typed(p)) {
      row = rows.find(
        (r) =>
          p.y - r.y > 0.2 * base && p.y - r.y < 0.8 * base &&
          // Straight after something of that line (typed maths is measured only roughly).
          r.anchors.some((a) => p.x > a.x && p.x - right(a) < (a.kind === 'math' ? 1.5 : 0.5) * base),
      );
    }
    if (row) row.anchors.push(p);
    else rows.push({ y: p.y, anchors: [p], small: [] });
  }
  // The baseline of a line is where most of its text stands.
  for (const row of rows) row.y = commonY(row.anchors);
  for (const p of anchors.filter(isSign)) {
    const e = extent(p, base);
    const mid = (e.top + e.bottom) / 2;
    const row = rows.find((r) => mid > r.y - 0.22 * base && mid < r.y + 0.72 * base);
    if (row) row.anchors.push(p);
    else rows.push({ y: p.y, anchors: [p], small: [] });
  }

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
  /** One of a stacked pair of scripts in front of a symbol, as in a nuclide. */
  leads?: boolean;
}

function rowTex(row: Row, base: number, doubt: { ambiguous: boolean } = { ambiguous: false }): string {
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
  // Two scripts stacked one over the other end where the wider one ends.
  tokens.forEach((t, i) => {
    const n = tokens[i + 1];
    if (t.script && n?.script && n.script !== t.script && n.x < t.end && t.x < n.end) {
      t.end = n.end = Math.max(t.end, n.end);
      t.leads = n.leads = true;
    }
  });
  return write(nuclides(tokens, base, doubt), base);
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
    if (prev && needsSpace(prev, token, base, tokens[i + 1])) run += ' ';
    if (token.script) {
      const host = prev?.tex === 'composite' && prev.math !== undefined;
      const inner = token.text ?? '';
      // An index or a charge is maths, as the papers type their own (C$_{2}$H$_{4}$);
      // \textsubscript is kept for words, which maths would set in italics.
      const short = /^[\d+\-−–=()]+$|^[A-Za-z]$/.test(inner.trim());
      const maths = host || short || inner.includes('$') ? toMath(inner) : null;
      // A script straight after another (an index and a charge) joins its maths.
      // So does one straight after typed maths that has no script of that kind
      // at its end (NO$_{3}$ and a charge): two spans must not touch as "$$".
      const mark = token.script === 'sup' ? '^' : '_';
      const close = prev !== undefined && token.x - prev.end < 0.3 * base;
      const joins =
        close &&
        ((prev.script !== undefined && prev.script !== token.script) ||
          (prev.math !== undefined && !prev.script && !prev.math.trimEnd().endsWith('}') && !prev.math.includes(mark)) ||
          (prev.math !== undefined && !prev.script && new RegExp(`[${mark === '^' ? '_' : '^'}]\\{[^{}]*\\}$`).test(prev.math.trim())));
      flush();
      if (maths !== null && (host || joins) && out.endsWith('$')) {
        out = `${out.slice(0, -1)}${mark}{${maths}}$`;
      } else if (maths !== null) out += `${out.endsWith('$') ? ' ' : ''}$${mark}{${maths}}$`;
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

function needsSpace(prev: Token, token: Token, base: number, next?: Token): boolean {
  const before = prev.text ?? '';
  const after = token.text ?? '';
  if (/\s$/.test(before) || /^\s/.test(after)) return false;
  // A script belongs to what it follows, however far the paper set it; but a
  // pair stacked one over the other (a nuclide's mass and proton numbers)
  // leads what comes after it, and keeps the word gap before it.
  const stacked = token.script && next?.script && next.script !== token.script && next.x < token.end && token.x < next.end;
  if (token.script && !stacked) return false;
  // The symbol after a nuclide's numbers is set close to them, not a word away.
  if (prev.leads && !token.script && token.x - prev.end < 0.25 * base) return false;
  const gap = token.x - prev.end;
  // Punctuation closes up to the word before it; a row of answer dots does not.
  if (!token.script && /^(?:[,;)\]]|\.(?!\.))/.test(after) && gap < 0.6 * base) return false;
  if (!prev.script && /[([]$/.test(before) && gap < 0.4 * base) return false;
  // Typed maths is measured roughly: a word that seems to start inside it
  // stands after it.
  if (prev.loose && gap < -0.02 && /^[\p{L}\p{N}=(]/u.test(after)) return true;
  return gap >= WORD_GAP * base;
}

function escape(s: string): string {
  return s.replace(/([%#&_${}])/g, '\\$1');
}

// ---- nuclides -------------------------------------------------------------

const ELEMENT = /^([A-Z][a-z]?)(?![a-z])/;
const NUMBER = /^(?:\d{1,3}|[A-Za-z])$/;

/**
 * A mass number over a proton number, set in front of an element's symbol,
 * is one piece of maths: ${}^{15}_{7}\mathrm{N}$. A charge set straight
 * after the symbol belongs to it too. A stacked pair that is not that (no
 * symbol after it, or not numbers) is not read at all: the line passes.
 */
function nuclides(tokens: Token[], base: number, doubt: { ambiguous: boolean }): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const [a, b, c, d] = [tokens[i], tokens[i + 1], tokens[i + 2], tokens[i + 3]];
    // A pair hanging on what it follows (CO₃²⁻: an index and a charge) is not in front of anything.
    const prev = tokens[i - 1];
    const attached = prev !== undefined && !/\s$/.test(prev.text ?? '') && a.x - prev.end < WORD_GAP * base;
    if (!a.leads || !b?.leads || attached) {
      out.push(a);
      continue;
    }
    const top = (a.script === 'sup' ? a : b).text?.trim() ?? '';
    const bottom = (a.script === 'sup' ? b : a).text?.trim() ?? '';
    const symbol = c && !c.script && c.text !== undefined && c.x - a.end < 0.25 * base ? ELEMENT.exec(c.text) : null;
    if (!symbol || !NUMBER.test(top) || !NUMBER.test(bottom)) {
      doubt.ambiguous = true;
      out.push(a);
      continue;
    }
    let tex = `{}^{${top}}_{${bottom}}\\mathrm{${symbol[1]}}`;
    const rest = c.text!.slice(symbol[1].length);
    // A charge straight after the symbol: "F−", "Na+", "S2−".
    const charge = !rest && d?.script === 'sup' && d.x - c.end < 0.25 * base ? chargeOf(d.text ?? '') : null;
    if (charge) tex += `^{${charge}}`;
    out.push({ x: a.x, end: charge ? d.end : c.end, math: tex, tex: 'nuclide' });
    if (rest) out.push({ ...c, x: c.end - 0.01, text: rest });
    i += charge ? 3 : 2;
  }
  return out;
}

function chargeOf(text: string): string | null {
  const m = /^(\d?)([+−–-])$/.exec(text.trim());
  return m ? `${m[1]}${m[2] === '+' ? '+' : '-'}` : null;
}
