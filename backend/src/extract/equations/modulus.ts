import { toMath } from '../to-math.js';
import { baseSize, extent, isComposite, isText, middle, sub, without, type Composite } from './geometry.js';
import { rebuilt } from './fraction.js';
import type { EquationReader, Line, Piece, ReadContext, Reading } from '../types.js';

interface Post {
  piece: Piece;
  x: number;
  top: number;
  bottom: number;
}

/**
 * A thin upright stroke, ruled, stroked or filled, at least most of a line
 * high: one side of a modulus.
 */
export function asPost(p: Piece, size: number): Post | null {
  if (p.kind !== 'path' && p.kind !== 'rule') return null;
  const e = extent(p, size);
  const tall = e.top - e.bottom;
  if (p.width > 1.2 || tall < 0.7 * size || tall > 3 * size) return null;
  if (p.kind === 'path') {
    const xs = p.points.map((q) => q.x);
    if (Math.max(...xs) - Math.min(...xs) > 1.2) return null;
  }
  return { piece: p, x: p.x + p.width / 2, top: e.top, bottom: e.bottom };
}

/**
 * Modulus bars: upright strokes of one height on one line, taken in pairs
 * from the left. Sure only where the pairing is: an even number of posts,
 * each pair with something inside, and something between one pair and the
 * next (|a| = |b|, not |a|b|c|). Otherwise it is left to the pass.
 */
export class Modulus implements EquationReader {
  readonly name = 'modulus';

  read(line: Line, context: ReadContext): Reading | null {
    const posts = line.pieces.map((p) => asPost(p, line.size)).filter((p): p is Post => p !== null);
    if (!posts.length) return null;
    // Posts of one line: they overlap one another in height.
    const first = posts.sort((a, b) => a.x - b.x)[0];
    const row = posts.filter((p) => p.bottom < first.top && p.top > first.bottom && Math.abs(p.top - p.bottom - (first.top - first.bottom)) < 1.5);
    if (row.length % 2 !== 0) return null;
    const inside = (a: Post, b: Post) =>
      line.pieces.filter((p) => !posts.some((q) => q.piece === p) && middle(p) > a.x && middle(p) < b.x && overlaps(p, a, line.size));
    for (let i = 0; i + 1 < row.length; i += 2) {
      if (!inside(row[i], row[i + 1]).length) return null;
      if (i + 2 < row.length && !inside(row[i + 1], row[i + 2]).length) return null;
    }
    // The innermost first is the leftmost pair; each read hands the rest back.
    const [a, b] = row;
    const within = inside(a, b);
    const reading = context.read(sub(line, within));
    const tex = toMath(reading.tex);
    if (!tex) return null;
    // Words between upright strokes are the cells of a table, not a modulus.
    const words = reading.tex.replace(/\\[a-zA-Z]+/g, ' ').match(/[A-Za-z]{4,}/g) ?? [];
    if (words.some((w) => !FUNCTIONS.test(w))) return null;
    const size = baseSize(within, line.size);
    const main = within.filter((p) => isText(p) && p.size >= 0.86 * size)[0] ?? within[0];
    const made: Composite = {
      kind: 'math', tex: `\\left|${tex}\\right|`, x: a.piece.x, width: b.piece.x + b.piece.width - a.piece.x,
      y: main.y, size, top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom),
      ...(!reading.ok || within.some((p) => isComposite(p) && p.failed) ? { failed: { reason: 'unknown-symbol' } } : null),
    };
    return rebuilt(context.read(without(line, [a.piece, b.piece, ...within], [made])));
  }
}

/** Stands within the height of the post, as what the bars enclose does. */
function overlaps(p: Piece, post: Post, size: number): boolean {
  const e = extent(p, size);
  return e.bottom < post.top && e.top > post.bottom;
}

/** Names that stand inside maths as words do. */
const FUNCTIONS = /^(?:cosec|sinh|cosh|tanh|arcsin|arccos|arctan)$/;
