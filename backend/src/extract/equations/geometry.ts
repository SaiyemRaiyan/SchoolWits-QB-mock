/** Where pieces sit and what stands over, under or inside what. */

import type { Line, MathPiece, PathPiece, Piece, TextPiece } from '../types.js';

/**
 * Maths put together from pieces. It stands in the line for what it was made
 * of, and remembers how tall that was and whether any of it was passed over.
 */
export interface Composite extends MathPiece {
  top: number;
  bottom: number;
  size: number;
  failed?: { reason: 'unknown-symbol' | 'unknown-shape' | 'ambiguous-layout' };
}

export const isComposite = (p: Piece): p is Composite => p.kind === 'math' && 'top' in p;

export const right = (p: Piece): number => p.x + p.width;
export const middle = (p: Piece): number => p.x + p.width / 2;

export function sizeOf(p: Piece, fallback: number): number {
  return p.kind === 'text' ? p.size : p.kind === 'math' ? (p.size ?? fallback) : fallback;
}

export function extent(p: Piece, size: number): { top: number; bottom: number } {
  if (isComposite(p)) return { top: p.top, bottom: p.bottom };
  if (p.kind === 'text') return { top: p.y + 0.72 * p.size, bottom: p.y - 0.22 * p.size };
  if (p.kind === 'math') {
    const s = p.size ?? size;
    const tall = /\\d?frac|\\begin\{|\\int|\\sum|\\left/.test(p.tex);
    return tall ? { top: p.y + 1.3 * s, bottom: p.y - 0.9 * s } : { top: p.y + 0.72 * s, bottom: p.y - 0.22 * s };
  }
  if (p.kind === 'glyph') return { top: p.y + p.height, bottom: p.y };
  if (p.kind === 'rule') return { top: p.y + p.thickness / 2, bottom: p.y - p.thickness / 2 };
  const ys = p.points.map((q) => q.y);
  return { top: Math.max(...ys), bottom: Math.min(...ys) };
}

export interface Bar {
  piece: Piece;
  x1: number;
  x2: number;
  y: number;
}

/** A horizontal line, whether it was ruled, stroked or filled. */
export function asBar(p: Piece): Bar | null {
  if (p.kind === 'rule') return { piece: p, x1: p.x, x2: right(p), y: p.y };
  if (p.kind !== 'path' || p.points.length > 4) return null;
  const { top, bottom } = extent(p, 11);
  if (top - bottom > 1.3 || p.width < 2) return null;
  return { piece: p, x1: p.x, x2: right(p), y: (top + bottom) / 2 };
}

export function barsOf(line: Line): Bar[] {
  return line.pieces.map(asBar).filter((b): b is Bar => b !== null).sort((a, b) => a.x2 - a.x1 - (b.x2 - b.x1));
}

/** A root sign: the long stroke that rises and then runs on as the bar. */
export function asRoot(p: Piece): { x: number; rise: number; end: number; top: number; foot: number; piece: PathPiece } | null {
  if (p.kind !== 'path' || p.points.length !== 3) return null;
  const [a, b, c] = p.points;
  if (Math.abs(b.y - c.y) > 0.3 || c.x - b.x < 3 || b.y - a.y < 4 || b.x < a.x) return null;
  return { x: a.x, rise: b.x, end: c.x, top: b.y, foot: a.y, piece: p };
}

/** Not yet understood: it has to be read before anything around it. */
export const unresolved = (p: Piece): boolean => p.kind === 'rule' || p.kind === 'path' || p.kind === 'glyph';

export const without = (line: Line, gone: Piece[], put: Piece[] = []): Line => ({
  ...line,
  pieces: [...line.pieces.filter((p) => !gone.includes(p)), ...put],
});

export const sub = (line: Line, pieces: Piece[]): Line => ({ pieces, size: line.size });

/** The size set largest, which is what small print is small against. */
export function baseSize(pieces: Piece[], fallback: number): number {
  const sizes = pieces.flatMap((p) =>
    p.kind === 'text' && /[\p{L}\p{N}]/u.test(p.text) ? [p.size] : p.kind === 'math' && p.size ? [p.size] : [],
  );
  return sizes.length ? Math.max(...sizes) : fallback;
}

export const isText = (p: Piece): p is TextPiece => p.kind === 'text';
