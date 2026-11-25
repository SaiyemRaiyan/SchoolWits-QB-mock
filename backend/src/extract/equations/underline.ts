import { advance } from '../metrics.js';
import { asBar, extent, isText, middle, right, unresolved, without } from './geometry.js';
import type { EquationReader, Line, ReadContext, Reading, TextPiece } from '../types.js';

/** A line drawn just under words, with nothing below it: an underline. */
export class Underline implements EquationReader {
  readonly name = 'underline';

  read(line: Line, context: ReadContext): Reading | null {
    const split = splitUnderBars(line);
    if (split !== line) return this.read(split, context) ?? null;
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
      // A fraction's bottom stands close under its bar; the next line of text does not.
      const under = line.pieces.some(
        (q) => q !== p && q.y < bar.y && extent(q, line.size).top > bar.y - 0.25 * line.size && middle(q) > bar.x1 && middle(q) < bar.x2,
      );
      if (under) continue;
      const put: TextPiece[] = over.map((t) => ({ ...t, underline: true }));
      return context.read(without(line, [p, ...over], put));
    }
    return null;
  }
}

/**
 * A bar that starts or ends inside a run of words underlines some of them:
 * the run is cut into its words, placed by the font's own widths scaled to
 * the run, so the bar can be matched to whole words. A cut that does not
 * land on a word boundary leaves the run as it was (and the line passes).
 */
function splitUnderBars(line: Line): Line {
  const bars = line.pieces.filter(unresolved).map(asBar).filter((b) => b !== null);
  if (!bars.length) return line;
  let changed = false;
  const pieces = line.pieces.flatMap((p) => {
    if (!isText(p) || !p.text.includes(' ')) return [p];
    const cuts = bars.filter((b) => p.y - b.y > 0.4 && p.y - b.y < 0.3 * p.size && (inside(b.x1, p) || inside(b.x2, p)));
    if (!cuts.length) return [p];
    const words = wordsOf(p);
    const ends = cuts.flatMap((b) => [b.x1, b.x2]).filter((x) => inside(x, p));
    const fits = ends.every((x) => words.some((w) => Math.abs(w.x - x) < 1.5 || Math.abs(right(w) - x) < 1.5));
    if (!fits) return [p];
    changed = true;
    return words;
  });
  return changed ? { ...line, pieces } : line;
}

const inside = (x: number, p: TextPiece): boolean => x > p.x + 1 && x < right(p) - 1;

function wordsOf(p: TextPiece): TextPiece[] {
  const family = p.serif ? 'times' : 'helvetica';
  const widths = [...p.text].map((ch) => advance(ch, p.size, family, p.bold, p.italic));
  const scale = p.width / Math.max(0.01, widths.reduce((a, b) => a + b, 0));
  const out: TextPiece[] = [];
  let x = p.x;
  let i = 0;
  for (const word of p.text.split(/(?<= )/)) {
    const w = widths.slice(i, i + word.length).reduce((a, b) => a + b, 0) * scale;
    const text = word.trimEnd();
    const ink = widths.slice(i, i + text.length).reduce((a, b) => a + b, 0) * scale;
    if (text) out.push({ ...p, text: out.length ? text : text, x, width: ink });
    x += w;
    i += word.length;
  }
  return out;
}
