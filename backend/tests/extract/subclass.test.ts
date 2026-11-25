/**
 * A subject class changes the extractor only through the steps the base
 * offers (writer-notes.md "Extension points"): symbolReader(), readers(),
 * rules(). These tests subclass the real extractor, override one step, and
 * check the override is used while the template extract() keeps its shape.
 *
 * The line is real: 4037/11/M/J/20 Q1(b), page 3, "Solve f(x) ⩽ 0." [2], where
 * ⩽ is a picture of 7.53 x 8.72 bp, the same box as a ⩾ elsewhere, so the
 * shared table cannot read it (symbols.test.ts) and the base must pass it.
 */

import { describe, expect, it } from 'vitest';
import { MathsExtractor } from '../../src/extract/index.js';
import type { EquationReader, ExtractedPaper, GlyphPiece, Line, Reading, ReadContext, SymbolReader } from '../../src/extract/types.js';
import { content, everything, part, passesOf, question, texOf } from './helpers.js';
import { MATHS } from './preambles.js';

const Q1 = String.raw`\examq{4037/11/M/J/20}{1}{Equations, Inequalities \& Graphs \textperiodcentered\ Factors of Polynomials}{4}
\row{26.49}{94.96}{\lab{22.68}{\textbf{(a)}}Find an expression for\kern3.53bp f\kern1.21bp ($x$)\kern0.67bp .\swmark{[2]}}
\partbreak
\freerow{169.0}{%
  \at{72.28}{0.00}{\textbf{(b)}}%
  \at{94.96}{0.00}{Solve\kern3.53bp f\kern1.21bp ($x$)}%
  \at{145.79}{-0.94}{\swglyph{3}{145.79bp 288.78bp 441.96bp 544.39bp}}%
  \at{156.53}{0.00}{0\kern0.69bp .}%
  \at{531.77}{0.00}{\swmark{[2]}}}`;

const source = { questions: texOf(MATHS, Q1) };

/** Knows one more picture than the shared table: what a subject class might add. */
class OnePicture implements SymbolReader {
  asked = 0;
  constructor(private readonly base: SymbolReader) {}
  read(glyph: GlyphPiece): string | null {
    this.asked++;
    if (Math.abs(glyph.width - 7.53) < 0.05 && Math.abs(glyph.height - 8.72) < 0.05) return '≤';
    return this.base.read(glyph);
  }
}

class WithSymbol extends MathsExtractor {
  reader?: OnePicture;
  protected override symbolReader(): SymbolReader {
    this.reader = new OnePicture(super.symbolReader());
    return this.reader;
  }
}

/** Accepts nothing, only counts: proves readers() is the list the chain runs. */
class Watching implements EquationReader {
  readonly name = 'watching';
  lines = 0;
  read(_line: Line, _context: ReadContext): Reading | null {
    this.lines++;
    return null;
  }
}

class WithReader extends MathsExtractor {
  watching = new Watching();
  protected override readers(): EquationReader[] {
    return [this.watching, ...super.readers()];
  }
}

const shape = (p: ExtractedPaper) => ({
  keys: Object.keys(p).sort(),
  questions: p.questions.map((q) => ({ number: q.number, marks: q.marks, parts: q.parts.map((x) => [x.label, x.marks]) })),
});

describe('subclasses: overriding a step', () => {
  const base = new MathsExtractor(source).extract();

  it('the base passes the same-size picture (the premise)', () => {
    expect(passesOf(base, 1).length).toBeGreaterThan(0);
    expect(everything(question(base, 1))).toContain('Solve');
  });

  it('a subclass symbol reader is used, and reads the picture', () => {
    const ex = new WithSymbol(source);
    const paper = ex.extract();
    expect(ex.reader?.asked ?? 0, 'the overriding reader was asked').toBeGreaterThan(0);
    expect(content(part(question(paper, 1), 'b'))).toMatch(/≤0\.$/);
    expect(passesOf(paper, 1)).toEqual([]);
    expect(shape(paper)).toEqual(shape(base));
  });

  it('a reader added by readers() is run by the chain', () => {
    const ex = new WithReader(source);
    const paper = ex.extract();
    expect(ex.watching.lines, 'the added reader saw lines').toBeGreaterThan(0);
    // It accepts nothing, so the result is the base's.
    expect(paper).toEqual(base);
  });

  it('extract() keeps its shape, subject and paper properties in a subclass', () => {
    const ex = new WithReader(source);
    const paper = ex.extract();
    expect(ex.subject).toBe('Mathematics');
    expect(ex).toBeInstanceOf(MathsExtractor);
    expect(paper.paper).toEqual(base.paper);
    expect(ex.paper).toEqual(base.paper);
    expect(ex.passes).toEqual(paper.passes);
    expect(shape(paper)).toEqual(shape(base));
  });
});
