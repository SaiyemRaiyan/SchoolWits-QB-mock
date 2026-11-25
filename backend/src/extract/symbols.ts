/**
 * Pictures of characters -> the characters.
 *
 * Some characters have no free font, so the .tex cuts them out of the source
 * PDF: nothing says what they are, but the cut's measurements do, because the
 * same character in the same font at the same size always has the same box.
 *
 * Every entry was looked at (scripts/symbol-sheets.py draws the sheets) and
 * every picture of that size showed the same character. A size that shows
 * more than one thing is left out, and passes: "<=" and ">=" have the same
 * box, and guessing between them would be wrong half the time.
 */

import type { GlyphPiece, SymbolReader } from './types.js';

export interface KnownSymbol {
  char: string;
  width: number;
  height: number;
  /** How far the picture's foot sits below the character's baseline. */
  drop: number;
  /** The type size it belongs to. */
  size: number;
  italic?: boolean;
}

// [character, height, drop, type size, widths...]
const BOXES: [string, number, number, number, ...number[]][] = [
  // Chemistry: a letter whose font has no l or I distinct enough to set again.
  ['l', 12.04, 2.64, 11, 3.08, 4.18],
  ['I', 12.04, 2.64, 11, 4.63, 6.0],
  ['I', 13.08, 2.88, 12, 3.99],
  ['V', 13.08, 2.88, 12, 8.65],
  ['•', 12.1, 2.64, 11, 6.64],
  ['●', 11.96, 2.63, 11, 6.93],
  ['○', 11.96, 2.63, 11, 7.96],
  ['✓', 12.04, 2.64, 11, 8.3],
  ['✓', 13.2, 2.88, 12, 9.06],
  ['⇌', 11.99, 2.64, 11, 10.85],
  ['−', 9.08, 1.98, 8.25, 5.24],
  // MathType's own signs, cut to their ink, at 11.5 and 8.
  ['−', 1.5, -2.2, 11.5, 7.5],
  ['−', 1.3, -1.6, 8, 5.4, 5.6],
  ['−', 1.8, -1.0, 8, 3.7],
  ['θ', 8.7, 0.6, 11.5, 6.1, 6.3],
  ['θ', 8.5, 0.6, 11.5, 5.8, 6.1],
  ['θ', 9.0, 0.6, 11.5, 5.8],
  ['π', 5.8, 0.6, 11.5, 5.8, 6.1, 6.3],
  ['π', 4.6, 0.4, 8, 4.6],
  ['∞', 3.9, -0.9, 11.5, 6.8, 6.3],
  ['≠', 9.9, 1.2, 11.5, 7.5, 7.8],
  ['Δ', 8.5, 0.5, 11.5, 7.5],
  ['′', 3.7, -4.6, 11.5, 2.2, 2.5],
  ['μ', 9.0, 2.9, 11.5, 8.0],
  ['α', 6.6, 0.6, 11.5, 7.3],
  ['λ', 9.2, 0.6, 11.5, 7.0],
  ['λ', 9.4, 0.8, 11.5, 7.0],
  ['φ', 11.6, 2.9, 11.5, 7.0, 7.3],
  ['±', 7.8, 0.5, 11.5, 7.0],
  ['∈', 7.0, 1.0, 11.5, 7.8],
  ['ℝ', 9.4, 1.0, 11.5, 8.7, 9.0],
  ['ℝ', 9.0, 1.0, 11.5, 8.5],
  ['ℰ', 9.0, 0.5, 11.5, 7.5],
  ['↦', 4.2, -0.5, 11.5, 10.2],
  ['°', 3.4, -5.1, 11.5, 3.0],
  ['°', 3.2, -5.1, 11.5, 3.2],
];

const ITALIC = new Set(['θ', 'α', 'λ', 'μ', 'φ']);

/**
 * A page is 595 or 595.28 wide depending on the paper, so a width measured
 * from both edges can come out 0.28 too wide, never too narrow.
 */
const PAGE_SLACK = 0.3;
const CLOSE = 0.08;

export class SymbolTable implements SymbolReader {
  private readonly known: KnownSymbol[];

  constructor(boxes = BOXES) {
    this.known = boxes.flatMap(([char, height, drop, size, ...widths]) =>
      widths.map((width) => ({ char, width, height, drop, size, ...(ITALIC.has(char) ? { italic: true } : null) })),
    );
  }

  read(glyph: GlyphPiece): string | null {
    return this.find(glyph)?.char ?? null;
  }

  /** The nearest entry, if no entry for another character is in reach too. */
  find(glyph: GlyphPiece): KnownSymbol | null {
    const reach = this.known.filter((k) => {
      const dw = glyph.width - k.width;
      return Math.abs(glyph.height - k.height) <= CLOSE + 0.02 && dw >= -CLOSE && dw <= PAGE_SLACK;
    });
    const off = (k: KnownSymbol) => Math.abs(glyph.width - k.width) + Math.abs(glyph.height - k.height);
    const best = [...reach].sort((a, b) => off(a) - off(b))[0];
    if (!best) return null;
    const rival = reach.some((k) => k.char !== best.char && off(k) < off(best) + 0.2);
    return rival ? null : best;
  }
}
