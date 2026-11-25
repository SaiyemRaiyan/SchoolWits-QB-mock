/**
 * The readers, in order. The first to accept a line wins; each structural
 * reader (a fraction, a root) replaces what it read by one piece of maths and
 * hands the rest back, so nesting needs no special case.
 */

import { Fractions } from './fraction.js';
import { PassOver } from './pass.js';
import { Roots } from './root.js';
import { TextAndScripts } from './script.js';
import { SymbolPictures } from './symbol.js';
import { TypedMaths } from './typed.js';
import { Underline } from './underline.js';
import type { EquationReader, Line, ReadContext, Reading, SymbolReader } from '../types.js';

export const STANDARD_READERS: readonly EquationReader[] = [
  new TypedMaths(),
  new SymbolPictures(),
  new Underline(),
  new Roots(),
  new Fractions(),
  new TextAndScripts(),
  new PassOver(),
];

export class EquationChain implements ReadContext {
  constructor(
    readonly symbols: SymbolReader,
    private readonly readers: readonly EquationReader[] = STANDARD_READERS,
  ) {}

  read(line: Line): Reading {
    for (const reader of this.readers) {
      const reading = reader.read(line, this);
      if (reading) return reading;
    }
    return { ok: false, reason: 'ambiguous-layout', tex: '' };
  }
}
