import { isRoundBracket } from '../symbols.js';
import { toMath } from '../to-math.js';
import { baseSize, extent, isComposite, isText, middle, right, unresolved, without, type Composite } from './geometry.js';
import { rebuilt } from './fraction.js';
import type { EquationReader, GlyphPiece, Line, Piece, ReadContext, Reading, TextPiece } from '../types.js';

/**
 * Round brackets cut from the PDF as pictures. A picture's box says it is a
 * round bracket (symbols.ts) but not which side, since both sides have one
 * size. The line says it: brackets of one size on one line that are exactly
 * two are a pair, the left one opening. More than two of a size (nested or in
 * a row: "((a)b)" and "(a)(b)" look alike) or one alone are not read.
 *
 * A pair as tall as a line of text becomes the characters. A taller pair
 * holds a fraction, \left( ... \right), or rows: a matrix, read only where
 * every row has the same number of entries and they stand in columns.
 */
export class Brackets implements EquationReader {
  readonly name = 'brackets';

  read(line: Line, context: ReadContext): Reading | null {
    const all = line.pieces.filter((p): p is GlyphPiece => p.kind === 'glyph' && isRoundBracket(p));
    if (!all.length) return null;
    const sides = sidesOf(line, all);
    if (!sides) return null;
    // As tall as the type: the characters, standing on the line they belong to.
    const short = all.filter((g) => g.height < 1.6 * line.size);
    if (short.length) {
      const put = short.map((g): TextPiece => ({
        kind: 'text', text: sides.get(g)!, x: g.x, y: baselineNear(line, g), width: g.width, size: line.size,
        bold: false, italic: false, underline: false,
      }));
      return rebuilt(context.read(without(line, short, put)));
    }
    // Taller: a pair of pictures round a fraction, or round rows (a matrix).
    for (const open of all.filter((g) => sides.get(g) === '(')) {
      const close = partner(line, all, sides, open);
      if (!close) continue;
      const inside = line.pieces.filter(
        (p) => p !== open && p !== close && middle(p) > right(open) && middle(p) < close.x && within(p, open, line.size),
      );
      if (!inside.length || inside.some(unresolved)) continue;
      const size = baseSize(inside, line.size);
      const tex = matrix(inside, size, context) ?? single(inside, context);
      if (!tex) continue;
      const failed = inside.some((p) => isComposite(p) && p.failed);
      const made: Composite = {
        kind: 'math', tex: tex.tex, x: open.x, width: right(close) - open.x, y: tex.y, size,
        top: Math.max(open.y + open.height, close.y + close.height), bottom: Math.min(open.y, close.y),
        ...(failed || !tex.ok ? { failed: { reason: 'unknown-symbol' } } : null),
      };
      return rebuilt(context.read(without(line, [open, close, ...inside], [made])));
    }
    return null;
  }
}

type Mark = { x: number; glyph: GlyphPiece | null; side: '(' | ')' | null };

/** The brackets standing level with these pictures, typed ones known and pictures not, left to right. */
function sequence(line: Line, glyphs: GlyphPiece[]): Mark[] | null {
  const bottom = Math.min(...glyphs.map((g) => g.y));
  const top = Math.max(...glyphs.map((g) => g.y + g.height));
  const marks: Mark[] = glyphs.map((g) => ({ x: middle(g), glyph: g, side: null }));
  for (const p of line.pieces) {
    if (p.kind !== 'text' && p.kind !== 'math') continue;
    const e = extent(p, line.size);
    if (e.top < bottom || e.bottom > top) continue;
    const text = p.kind === 'text' ? p.text : p.tex.replace(/\\[a-zA-Z]+/g, (m) => ' '.repeat(m.length));
    const at = [...text].flatMap((ch, i) => (ch === '(' || ch === ')' ? [{ ch, i }] : []));
    if (!at.length) continue;
    // Typed maths is measured only roughly: a picture inside its width is out of order.
    if (p.kind === 'math' && glyphs.some((g) => middle(g) > p.x && middle(g) < right(p))) return null;
    for (const { ch, i } of at) marks.push({ x: p.x + (p.width * (i + 0.5)) / text.length, glyph: null, side: ch as '(' | ')' });
  }
  return marks.sort((a, b) => a.x - b.x);
}

/** The one choice of sides for the pictures that balances the line, or null when none or several do. */
function sidesOf(line: Line, glyphs: GlyphPiece[]): Map<GlyphPiece, '(' | ')'> | null {
  if (glyphs.length > 10) return null;
  const marks = sequence(line, glyphs);
  if (!marks) return null;
  const unknown = marks.filter((m) => m.glyph);
  let found: Map<GlyphPiece, '(' | ')'> | null = null;
  for (let bits = 0; bits < 1 << unknown.length; bits++) {
    const side = (m: Mark) => (m.glyph ? ((bits >> unknown.indexOf(m)) & 1 ? ')' : '(') : m.side);
    let depth = 0;
    let ok = true;
    for (const m of marks) {
      depth += side(m) === '(' ? 1 : -1;
      if (depth < 0) ok = false;
    }
    if (!ok || depth !== 0) continue;
    if (found) return null;
    found = new Map(unknown.map((m) => [m.glyph!, side(m) as '(' | ')']));
  }
  return found;
}

/** The picture that closes an opening one, when its partner is a picture too. */
function partner(line: Line, glyphs: GlyphPiece[], sides: Map<GlyphPiece, '(' | ')'>, open: GlyphPiece): GlyphPiece | null {
  const marks = sequence(line, glyphs) ?? [];
  const from = marks.findIndex((m) => m.glyph === open);
  let depth = 0;
  for (const m of marks.slice(from)) {
    depth += (m.glyph ? sides.get(m.glyph) : m.side) === '(' ? 1 : -1;
    if (depth === 0) return m.glyph;
  }
  return null;
}

/** The baseline of the full-size type a short bracket stands beside. */
function baselineNear(line: Line, g: GlyphPiece): number {
  const level = line.pieces
    .filter((p) => (p.kind === 'text' && p.size >= 0.86 * line.size) || (p.kind === 'math' && !isComposite(p)))
    .filter((p) => p.y >= g.y - 1 && p.y <= g.y + 0.5 * g.height)
    .sort((a, b) => Math.abs(middle(a) - middle(g)) - Math.abs(middle(b) - middle(g)));
  return level[0]?.y ?? g.y + 0.22 * line.size;
}

function within(p: Piece, bracket: GlyphPiece, size: number): boolean {
  const e = extent(p, size);
  return e.bottom >= bracket.y - 1 && e.top <= bracket.y + bracket.height + 1;
}

/** One row of maths (a fraction, a root) inside tall brackets. */
function single(inside: Piece[], context: ReadContext): { tex: string; y: number; ok: boolean } | null {
  const rows = rowsOf(inside, baseSize(inside, 11));
  if (rows.length !== 1) return null;
  const reading = context.read({ pieces: inside, size: baseSize(inside, 11) });
  const tex = toMath(reading.tex);
  return tex ? { tex: `\\left(${tex}\\right)`, y: rows[0].y, ok: reading.ok } : null;
}

interface Row {
  y: number;
  pieces: Piece[];
}

/** Pieces in rows: the baselines of full-size type, a type size or more apart. */
function rowsOf(pieces: Piece[], size: number): Row[] {
  const rows: Row[] = [];
  const full = pieces.filter((p) => !(isText(p) && p.size < 0.86 * size));
  for (const p of [...full].sort((a, b) => b.y - a.y)) {
    const row = rows.find((r) => Math.abs(r.y - p.y) < 0.5 * size);
    if (row) row.pieces.push(p);
    else rows.push({ y: p.y, pieces: [p] });
  }
  // Small print goes with the row it stands nearest.
  for (const p of pieces.filter((q) => !full.includes(q))) {
    const row = [...rows].sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y))[0];
    row?.pieces.push(p);
  }
  return rows;
}

/** Rows of entries in columns: \begin{pmatrix} .. \end{pmatrix}, or null when not plainly that. */
function matrix(inside: Piece[], size: number, context: ReadContext): { tex: string; y: number; ok: boolean } | null {
  const rows = rowsOf(inside, size);
  if (rows.length < 2) return null;
  // Entries: runs separated by at least an em.
  const entries = rows.map((r) => {
    const sorted = [...r.pieces].sort((a, b) => a.x - b.x);
    const out: Piece[][] = [];
    for (const p of sorted) {
      const last = out[out.length - 1];
      if (last && p.x - Math.max(...last.map(right)) < size) last.push(p);
      else out.push([p]);
    }
    return out;
  });
  const cols = entries[0].length;
  if (entries.some((e) => e.length !== cols)) return null;
  // Columns line up: each entry's middle is nearer its own column's than any other's.
  const mid = (e: Piece[]) => (Math.min(...e.map((p) => p.x)) + Math.max(...e.map(right))) / 2;
  for (let c = 0; c < cols; c++) {
    const xs = entries.map((e) => mid(e[c]));
    const spread = Math.max(...xs) - Math.min(...xs);
    if (c + 1 < cols && spread > 0.5 * (mid(entries[0][c + 1]) - mid(entries[0][c]))) return null;
  }
  let ok = true;
  const body = entries.map((row) =>
    row.map((e) => {
      const reading = context.read({ pieces: e, size });
      ok &&= reading.ok;
      return toMath(reading.tex);
    }),
  );
  if (body.some((row) => row.some((t) => t === null))) return null;
  const tex = `\\begin{pmatrix}${body.map((row) => row.join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;
  // It stands on the maths axis, between its rows.
  return { tex, y: (rows[0].y + rows[rows.length - 1].y) / 2 - 0.3 * size, ok };
}

