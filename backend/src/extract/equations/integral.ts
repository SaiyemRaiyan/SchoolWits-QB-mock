import { isIntegral } from '../symbols.js';
import { toMath } from '../to-math.js';
import { extent, isComposite, right, sizeOf, sub, unresolved, without, type Composite } from './geometry.js';
import { rebuilt } from './fraction.js';
import type { EquationReader, GlyphPiece, Line, Piece, ReadContext, Reading } from '../types.js';

/**
 * An integral sign (a picture whose box only ever holds one) and its limits:
 * small print at its right, level with its top and with its foot. Both
 * limits or neither; one alone, or a limit not yet understood, is not read.
 */
export class Integrals implements EquationReader {
  readonly name = 'integrals';

  read(line: Line, context: ReadContext): Reading | null {
    const signs = line.pieces.filter((p): p is GlyphPiece => p.kind === 'glyph' && isIntegral(p));
    for (const g of signs) {
      const size = line.size;
      const small = (p: Piece) => p !== g && sizeOf(p, size) < 0.86 * size;
      const near = line.pieces.filter((p) => p !== g && p.x >= g.x + 0.25 * g.width && p.x <= right(g) + 0.8 * size);
      const upper = near.filter((p) => small(p) && extent(p, size).bottom >= g.y + 0.5 * g.height);
      const lower = near.filter((p) => small(p) && extent(p, size).top <= g.y + 0.5 * g.height);
      // Anything not yet understood level with its top or foot (a pictured π, a bar): wait for it.
      const zone = (p: Piece) => extent(p, size).bottom >= g.y + 0.5 * g.height || extent(p, size).top <= g.y + 0.5 * g.height;
      if (near.some((p) => unresolved(p) && zone(p)) || [...upper, ...lower].some(unresolved)) continue;
      if (!upper.length !== !lower.length) continue;
      let tex = '\\int';
      let ok = true;
      if (upper.length) {
        const [up, lo] = [context.read(sub(line, upper)), context.read(sub(line, lower))];
        const [u, l] = [toMath(up.tex), toMath(lo.tex)];
        if (!u || !l) continue;
        ok = up.ok && lo.ok;
        tex = `\\int_{${l}}^{${u}}`;
      }
      const used = [...upper, ...lower];
      const made: Composite = {
        kind: 'math', tex, x: g.x, width: Math.max(right(g), ...used.map(right)) - g.x,
        // The sign is centred on the maths axis, a quarter of the size above the baseline.
        y: g.y + g.height / 2 - 0.25 * size, size, top: g.y + g.height, bottom: g.y,
        ...(!ok || used.some((p) => isComposite(p) && p.failed) ? { failed: { reason: 'unknown-symbol' } } : null),
      };
      return rebuilt(context.read(without(line, [g, ...used], [made])));
    }
    return null;
  }
}
