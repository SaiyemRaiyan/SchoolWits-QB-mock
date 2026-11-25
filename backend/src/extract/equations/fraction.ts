import { toMath } from '../to-math.js';
import { barsOf, baseSize, extent, middle, right, sizeOf, sub, unresolved, without, type Composite } from './geometry.js';
import type { EquationReader, Line, Piece, ReadContext, Reading } from '../types.js';

/**
 * A bar with something above it and something below it.
 *
 * Narrowest bar first, so a fraction inside a fraction is read before the one
 * around it. What stands half over a bar is not surely part of it: pass.
 */
export class Fractions implements EquationReader {
  readonly name = 'fractions';

  read(line: Line, context: ReadContext): Reading | null {
    for (const bar of barsOf(line)) {
      const near = line.pieces.filter((p) => p !== bar.piece && middle(p) > bar.x1 - 1 && middle(p) < bar.x2 + 1);
      const beside = near.filter((p) => !unresolved(p)).sort((a, b) => gap(a, bar.y, line) - gap(b, bar.y, line))[0];
      if (!beside) continue;
      const s = sizeOf(beside, line.size);
      const reach = (p: Piece) => gap(p, bar.y, line) < 0.65 * s;
      const top = withScripts(near.filter((p) => centre(p, line) > bar.y && reach(p)), near, bar.y, true, line);
      const bottom = withScripts(near.filter((p) => centre(p, line) < bar.y && reach(p)), near, bar.y, false, line);
      if (!top.length || !bottom.length) continue;
      if ([...top, ...bottom].some((p) => unresolved(p) || p.x < bar.x1 - 3 || right(p) > bar.x2 + 3)) continue;

      const [over, under] = [context.read(sub(line, top)), context.read(sub(line, bottom))];
      const [n, d] = [toMath(over.tex), toMath(under.tex)];
      if (!n || !d) continue;
      const size = baseSize([...top, ...bottom], s);
      const failed = !over.ok ? over.reason : !under.ok ? under.reason : null;
      const made: Composite = {
        kind: 'math',
        tex: `\\${size >= 9.4 ? 'dfrac' : 'frac'}{${n}}{${d}}`,
        x: bar.x1,
        width: bar.x2 - bar.x1,
        // A bar sits on the maths axis, 0.3 of the size above the baseline.
        y: bar.y - 0.3 * size,
        size,
        top: Math.max(...top.map((p) => extent(p, size).top)),
        bottom: Math.min(...bottom.map((p) => extent(p, size).bottom)),
        ...(failed === 'unknown-symbol' || failed === 'unknown-shape' || failed === 'ambiguous-layout' ? { failed: { reason: failed } } : null),
      };
      return rebuilt(context.read(without(line, [bar.piece, ...top, ...bottom], [made])));
    }
    return null;
  }
}

/**
 * What stands on the same line as a piece of the top (or bottom) belongs to
 * it too: the index of V in V₁ can sit further from the bar than V does.
 */
function withScripts(group: Piece[], near: Piece[], y: number, above: boolean, line: Line): Piece[] {
  const out = [...group];
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of near) {
      if (out.includes(p) || p.kind === 'rule' || (centre(p, line) > y) !== above) continue;
      const e = extent(p, line.size);
      const touches = out.some((q) => {
        const f = extent(q, line.size);
        return e.top > f.bottom && e.bottom < f.top && (p.x - right(q) < 0.4 * line.size && q.x - right(p) < 0.4 * line.size);
      });
      if (touches) {
        out.push(p);
        grew = true;
      }
    }
  }
  return out;
}

const centre = (p: Piece, line: Line): number => {
  const e = extent(p, line.size);
  return (e.top + e.bottom) / 2;
};

const gap = (p: Piece, y: number, line: Line): number => {
  const e = extent(p, line.size);
  return Math.max(0, e.bottom - y, y - e.top);
};

export const rebuilt = (reading: Reading): Reading => (reading.ok ? { ...reading, rebuilt: true } : reading);
