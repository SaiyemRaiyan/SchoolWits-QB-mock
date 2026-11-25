import { SymbolTable } from '../symbols.js';
import { extent, isText, right, without } from './geometry.js';
import type { EquationReader, GlyphPiece, Line, Piece, ReadContext, Reading } from '../types.js';

/** A picture this big is a drawing set in the line, not a character. */
export const isDrawing = (g: GlyphPiece): boolean => g.width >= 18 && g.height >= 14;

/** Pictures of known characters become the characters. */
export class SymbolPictures implements EquationReader {
  readonly name = 'symbols';

  read(line: Line, context: ReadContext): Reading | null {
    const gone: Piece[] = [];
    const put: Piece[] = [];
    for (const p of line.pieces) {
      if (p.kind !== 'glyph') continue;
      const char = context.symbols.read(p);
      if (char === null) continue;
      const known = context.symbols instanceof SymbolTable ? context.symbols.find(p) : null;
      const size = known?.size ?? line.size;
      const host = line.pieces
        .filter(isText)
        .filter((t) => Math.abs(t.x - p.x) < 60 && t.y > extent(p, size).bottom - 2 && t.y < p.y + p.height)
        .sort((a, b) => Math.abs(a.x + a.width - p.x) - Math.abs(b.x + b.width - p.x))[0];
      const y = p.y + (known?.drop ?? 0);
      const touching = line.pieces
        .filter(isText)
        .filter((t) => /\p{L}/u.test(t.text) && Math.abs(t.y - y) < 0.3 * size && (Math.abs(right(t) - p.x) < 0.3 * size || Math.abs(t.x - right(p)) < 0.3 * size));
      gone.push(p);
      put.push({
        kind: 'text', text: char, x: p.x, width: p.width, size,
        // Cut to its ink, a picture's foot is only near the baseline.
        y: host && host.size >= 0.8 * size && Math.abs(host.y - y) < 0.2 * size ? host.y : y,
        // Set in the same weight as the letters it is set against (Cl in a bold heading).
        bold: touching.length > 0 && touching.every((t) => t.bold), italic: known?.italic ?? false, underline: false,
        // A Latin letter stands in for part of a word; a Greek one is a symbol of its own.
        ...(/^[A-Za-z]$/.test(char) ? { pictured: true } : null),
      });
    }
    return gone.length ? context.read(without(line, gone, put)) : null;
  }
}
