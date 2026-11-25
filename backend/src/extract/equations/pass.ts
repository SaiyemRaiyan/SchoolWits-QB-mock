import { flow } from '../flow.js';
import { isDrawing } from './symbol.js';
import { asBar, extent, right, unresolved } from './geometry.js';
import type { EquationReader, Line, PassReason, Piece, ReadContext, Reading, TextPiece } from '../types.js';

/** Stands where something was printed that could not be read. */
export const UNREAD = '□';

/**
 * The end of the chain: say what was not understood, and show the rest.
 *
 * A picture that could not be named still took its place in the line, so a
 * box is shown there: a gap that looks like nothing was printed would be the
 * confident wrong answer.
 */
export class PassOver implements EquationReader {
  readonly name = 'pass';

  read(line: Line, context: ReadContext): Reading {
    const pictures = line.pieces.filter((p) => p.kind === 'glyph');
    if (pictures.length) {
      const boxes = pictures.filter((p) => !isDrawing(p)).map(
        (p): TextPiece => ({
          kind: 'text', text: UNREAD, x: p.x, width: p.width, size: line.size, bold: false, italic: false, underline: false,
          y: nearestBaseline(line, p.x, p.y, p.y + p.height),
        }),
      );
      const rest = context.read({ ...line, pieces: [...line.pieces.filter((p) => p.kind !== 'glyph'), ...boxes] });
      return { ok: false, reason: 'unknown-symbol', tex: rest.tex };
    }
    const left = line.pieces.filter(unresolved);
    const reason: PassReason = !left.length
      ? 'ambiguous-layout'
      : left.every((p) => underWords(line, p))
        ? 'lost-underline'
        : left.every(asBar)
          ? 'ambiguous-layout'
          : 'unknown-shape';
    return { ok: false, reason, tex: flow(line).tex };
  }
}

/** A bar just below the baseline of words it runs under, with nothing under it: an underline. */
function underWords(line: Line, p: Piece): boolean {
  const bar = asBar(p);
  if (!bar) return false;
  const over = line.pieces.filter(
    (t): t is TextPiece => t.kind === 'text' && t.y - bar.y > 0.4 && t.y - bar.y < 0.3 * t.size && right(t) > bar.x1 && t.x < bar.x2,
  );
  const under = line.pieces.some(
    (q) => q !== p && q.y < bar.y && extent(q, line.size).top > bar.y - 0.25 * line.size && q.x < bar.x2 && right(q) > bar.x1,
  );
  return over.length > 0 && !under;
}

function nearestBaseline(line: Line, x: number, from: number, to: number): number {
  const near = line.pieces
    .filter((p): p is TextPiece => p.kind === 'text' && p.y >= from - 4 && p.y <= to)
    .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  return near?.y ?? from;
}
