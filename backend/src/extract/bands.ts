/**
 * A block of placed pieces -> the lines a reader sees in it, top to bottom.
 *
 * A block often holds several lines of text, or a whole question. Wherever
 * nothing is printed across its full width, one line ends and the next begins;
 * a fraction or a tall bracket bridges that gap and stays in one piece.
 */

import { extent } from './equations/geometry.js';
import type { Line, Piece } from './types.js';

export interface Band {
  pieces: Piece[];
  top: number;
  bottom: number;
  /** Where its text stands. */
  y: number;
}

export function bands(line: Line): Band[] {
  const boxes = line.pieces.map((piece) => {
    const e = extent(piece, line.size);
    // A bar holds on to what it divides, which it need not touch.
    const reach = piece.kind === 'rule' || (piece.kind === 'path' && e.top - e.bottom < 1.5) ? 0.5 * line.size : 0;
    return { piece, top: e.top + reach, bottom: e.bottom - reach };
  });
  boxes.sort((a, b) => b.top - a.top);
  const out: Band[] = [];
  for (const b of boxes) {
    const last = out[out.length - 1];
    if (last && b.top > last.bottom) {
      last.pieces.push(b.piece);
      last.bottom = Math.min(last.bottom, b.bottom);
    } else out.push({ pieces: [b.piece], top: b.top, bottom: b.bottom, y: 0 });
  }
  for (const band of out) band.y = baseline(band.pieces);
  return out;
}

function baseline(pieces: Piece[]): number {
  const weight = new Map<number, number>();
  for (const p of pieces) {
    if (p.kind !== 'text' && p.kind !== 'math') continue;
    const key = Math.round(p.y);
    weight.set(key, (weight.get(key) ?? 0) + (p.kind === 'text' ? p.text.length : 4));
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? pieces[0].y;
}
