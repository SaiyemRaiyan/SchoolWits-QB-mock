import { flow } from '../flow.js';
import { isDrawing } from './symbol.js';
import { asBar, unresolved } from './geometry.js';
import type { EquationReader, Line, PassReason, ReadContext, Reading, TextPiece } from '../types.js';

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
    const reason: PassReason = !left.length ? 'ambiguous-layout' : left.every(asBar) ? 'ambiguous-layout' : 'unknown-shape';
    return { ok: false, reason, tex: flow(line).tex };
  }
}

function nearestBaseline(line: Line, x: number, from: number, to: number): number {
  const near = line.pieces
    .filter((p): p is TextPiece => p.kind === 'text' && p.y >= from - 4 && p.y <= to)
    .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  return near?.y ?? from;
}
