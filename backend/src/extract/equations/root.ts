import { toMath } from '../to-math.js';
import { asRoot, baseSize, extent, isComposite, isText, middle, right, sub, unresolved, without, type Composite } from './geometry.js';
import { rebuilt } from './fraction.js';
import { advance } from '../metrics.js';
import type { EquationReader, Line, Piece, ReadContext, Reading } from '../types.js';

/** A drawn root sign and what stands under its bar. */
export class Roots implements EquationReader {
  readonly name = 'roots';

  read(line: Line, context: ReadContext): Reading | null {
    const signs = line.pieces.map(asRoot).filter((r) => r !== null).sort((a, b) => a.end - a.x - (b.end - b.x));
    // Punctuation set in one run with the last figure under a bar ("3.") stands outside it.
    const cut = cutPunctuation(line, signs.map((r) => r.end));
    if (cut !== line) return this.read(cut, context);
    for (const r of signs) {
      // The tick that leads into the sign is part of it.
      const tick = line.pieces.filter((p) => p.kind === 'path' && p !== r.piece && Math.abs(right(p) - r.x) < 0.6 && p.width < 8);
      const within = line.pieces.filter((p) => {
        if (p === r.piece || tick.includes(p)) return false;
        const e = extent(p, line.size);
        // A bar below the sign's foot that runs past it (a fraction under the root) is not under it.
        if (unresolved(p) && e.top <= r.foot + 1 && (p.x < r.rise - 1.5 || right(p) > r.end + 2.5)) return false;
        return middle(p) > r.rise - 1 && middle(p) < r.end + 0.5 && (e.top + e.bottom) / 2 < r.top && e.bottom > r.foot - 4;
      });
      if (!within.length || within.some((p) => unresolved(p) || right(p) > r.end + 2.5)) continue;
      const index = line.pieces.filter(
        // Within the sign's own height: small print above it belongs to the line above.
        (p) => isText(p) && p.size < 0.75 * line.size && p.x > r.x - 8 && right(p) < r.rise + 1 && p.y > r.foot + 4 &&
          p.y + 0.72 * p.size <= r.top + 1,
      );
      const inner = context.read(sub(line, within));
      const tex = toMath(inner.tex);
      const n = index.length ? toMath(context.read(sub(line, index)).tex) : '';
      if (!tex || n === null || !/^\w*$/.test(n)) continue;
      const size = baseSize(within, line.size);
      const main = within.filter((p) => !isText(p) || p.size >= 0.86 * size).sort((a, b) => a.x - b.x)[0] ?? within[0];
      const left = Math.min(r.x, ...tick.map((p) => p.x));
      const made: Composite = {
        kind: 'math', tex: `\\sqrt${n ? `[${n}]` : ''}{${tex}}`,
        x: left, width: r.end - left, y: main.y, size, top: r.top, bottom: Math.min(r.foot, ...within.map((p) => extent(p, size).bottom)),
        ...(!inner.ok || within.some((p) => isComposite(p) && p.failed) ? { failed: { reason: 'unknown-symbol' } } : null),
      };
      return rebuilt(context.read(without(line, [r.piece, ...tick, ...index, ...within], [made])));
    }
    return null;
  }
}

/** A text run that crosses one of the given ends, cut where its trailing punctuation starts. */
function cutPunctuation(line: Line, ends: number[]): Line {
  let changed = false;
  const pieces = line.pieces.flatMap((p): Piece[] => {
    if (!isText(p)) return [p];
    const m = /^(.*?[^\s.,;:])([.,;:]+)$/.exec(p.text);
    const end = ends.find((x) => p.x < x && right(p) > x + 1);
    if (!m || end === undefined) return [p];
    const family = p.serif ? 'times' : 'helvetica';
    const w = (s: string) => [...s].reduce((n, ch) => n + advance(ch, p.size, family, p.bold, p.italic), 0);
    const scale = p.width / Math.max(0.01, w(p.text));
    const head = w(m[1]) * scale;
    // Only where the cut lands at the bar's end: otherwise it is not this case.
    if (Math.abs(p.x + head - end) > 2.5) return [p];
    changed = true;
    return [
      { ...p, text: m[1], width: head },
      { ...p, text: m[2], x: right(p) - (p.width - head), width: p.width - head },
    ];
  });
  return changed ? { ...line, pieces } : line;
}
