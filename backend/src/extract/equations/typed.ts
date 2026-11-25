import { isComposite } from './geometry.js';
import type { EquationReader, Line, Reading } from '../types.js';

/** A line that is nothing but maths the author typed: as it stands. */
export class TypedMaths implements EquationReader {
  readonly name = 'typed';

  read(line: Line): Reading | null {
    const [only, ...more] = line.pieces;
    if (!only || more.length || only.kind !== 'math' || isComposite(only)) return null;
    return { ok: true, tex: `$${only.tex}$`, rebuilt: false };
  }
}
