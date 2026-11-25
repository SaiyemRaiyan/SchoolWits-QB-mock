import { SymbolTable } from '../symbols.js';
import { extent, isText, without } from './geometry.js';
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
      gone.push(p);
      put.push({
        kind: 'text', text: char, x: p.x, width: p.width, size,
        // Cut to its ink, a picture's foot is only near the baseline.
        y: host && host.size >= 0.8 * size && Math.abs(host.y - y) < 0.2 * size ? host.y : y,
        bold: false, italic: known?.italic ?? false, underline: false,
      });
    }
    return gone.length ? context.read(without(line, gone, put)) : null;
  }
}
