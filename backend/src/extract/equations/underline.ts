import { asBar, isText, middle, right, unresolved, without } from './geometry.js';
import type { EquationReader, Line, ReadContext, Reading, TextPiece } from '../types.js';

/** A line drawn just under words, with nothing below it: an underline. */
export class Underline implements EquationReader {
  readonly name = 'underline';

  read(line: Line, context: ReadContext): Reading | null {
    for (const p of line.pieces) {
      const bar = unresolved(p) ? asBar(p) : null;
      if (!bar) continue;
      const over = line.pieces
        .filter(isText)
        .filter((t) => t.y - bar.y > 0.4 && t.y - bar.y < 0.22 * t.size && right(t) > bar.x1 + 1 && t.x < bar.x2 - 1);
      if (!over.length) continue;
      const from = Math.min(...over.map((t) => t.x));
      const to = Math.max(...over.map(right));
      if (Math.abs(from - bar.x1) > 2 || Math.abs(to - bar.x2) > 2) continue;
      const under = line.pieces.some((q) => q !== p && q.y < bar.y && bar.y - q.y < 13 && middle(q) > bar.x1 && middle(q) < bar.x2);
      if (under) continue;
      const put: TextPiece[] = over.map((t) => ({ ...t, underline: true }));
      return context.read(without(line, [p, ...over], put));
    }
    return null;
  }
}
