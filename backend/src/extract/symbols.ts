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
// An empty character is a box that more than one character prints in.
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
  // Cap and cup: the same box as each other, and within the page slack of
  // Delta's. Known, but not nameable: it makes Delta's box uncertain too.
  ['', 8.48, 0.5, 11.5, 7.48],
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
    if (!best || best.char === '') return null;
    const rival = reach.some((k) => k.char !== best.char && off(k) < off(best) + 0.2);
    return rival ? null : best;
  }
}

/**
 * Boxes that only ever hold a round bracket, either side: every picture of
 * these sizes in the papers was looked at (4037, 1,231 tall pictures), and
 * a size that also held anything else (a bracket piece, a brace) is left out,
 * as is any size within reach of one. Which side a bracket is, the box cannot
 * say: equations/brackets.ts reads that from the line.
 */
const BRACKET_BOXES: [number, ...number[]][] = [
  [11.6, 2.97, 3.44], [11.84, 3.44, 3.68], [12.08, 3.68], [12.32, 3.44, 3.68], [12.56, 3.44, 3.68, 5.12],
  [12.8, 3.44], [13.04, 3.44, 3.69], [14.0, 4.64, 4.88], [15.92, 3.68, 3.92], [16.4, 3.93], [16.64, 3.68, 3.92],
  [17.84, 3.92], [21.44, 4.16], [21.68, 4.16], [22.16, 4.16], [22.4, 4.16], [22.88, 4.16], [23.12, 4.16],
  [23.36, 4.16, 4.4], [26.72, 4.4], [26.96, 4.41], [27.92, 3.44, 3.68, 4.4], [28.16, 4.4], [29.36, 3.68, 3.92],
  [31.04, 3.92], [32.48, 3.68, 3.92], [33.44, 4.4], [40.16, 3.68], [40.4, 3.68], [40.88, 3.68], [41.36, 4.16],
  [41.84, 4.17], [55.28, 4.4],
];

/** A picture whose box only ever holds a round bracket. */
export function isRoundBracket(glyph: GlyphPiece): boolean {
  return BRACKET_BOXES.some(
    ([height, ...widths]) =>
      Math.abs(glyph.height - height) <= CLOSE + 0.02 &&
      widths.some((w) => glyph.width - w >= -CLOSE && glyph.width - w <= PAGE_SLACK),
  );
}

/**
 * The integral sign's boxes. No picture of either size in the papers is
 * anything else, and no other box is within reach (4037, 54 pictures).
 */
const INTEGRAL_BOXES: [number, number][] = [[21.68, 7.76], [24.08, 8.72]];

export function isIntegral(glyph: GlyphPiece): boolean {
  return INTEGRAL_BOXES.some(
    ([height, width]) => Math.abs(glyph.height - height) <= CLOSE + 0.02 && glyph.width - width >= -CLOSE && glyph.width - width <= PAGE_SLACK,
  );
}

/**
 * Pieces of a tall round bracket (the hook and its straight run, either side),
 * which the papers draw with the rest of the bracket at the same place. Every
 * picture of these sizes was one (4037, 120 pictures).
 */
const BRACKET_PIECE_BOXES: [number, number][] = [[29.84, 3.68], [30.08, 3.68], [33.2, 3.68]];

export function isRoundBracketPiece(glyph: GlyphPiece): boolean {
  return BRACKET_PIECE_BOXES.some(
    ([height, width]) => Math.abs(glyph.height - height) <= CLOSE + 0.02 && glyph.width - width >= -CLOSE && glyph.width - width <= PAGE_SLACK,
  );
}
