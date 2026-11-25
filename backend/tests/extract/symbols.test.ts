/**
 * SymbolTable: a picture of a character -> the character, or null.
 *
 * Every picture here is a real \swcut / \swglyph from the paper named beside
 * it, set by the real Typesetter with that paper family's own definitions, so
 * the box the table is asked about is the box the extractor will measure. The
 * character expected is the one printed on that PDF page, looked at (renders
 * in the session scratchpad, tester/png/g_*.png).
 *
 * Two contracts, as for whole questions:
 *   reads       a picture whose size only one character has: it must be read
 *   rightOrNull a picture whose size another character shares (or one the
 *               table does not know): the right character, or null. Never a
 *               different character, which is the wrong-and-not-flagged case.
 */

import { describe, expect, it } from 'vitest';
import { MacroTable } from '../../src/extract/macros.js';
import { SymbolTable } from '../../src/extract/symbols.js';
import { Typesetter } from '../../src/extract/typesetter.js';
import type { GlyphPiece } from '../../src/extract/types.js';
import { CHEMISTRY, CHEMISTRY_MCQ, MATHS } from './preambles.js';

/** Every picture on a line, left to right. */
function glyphs(preamble: string, tex: string): GlyphPiece[] {
  const line = new Typesetter(MacroTable.fromPreamble(preamble)).line(tex);
  return line.pieces.filter((p): p is GlyphPiece => p.kind === 'glyph').sort((a, b) => a.x - b.x);
}

function glyph(preamble: string, tex: string): GlyphPiece {
  const all = glyphs(preamble, tex);
  expect(all, 'one picture on the line').toHaveLength(1);
  return all[0];
}

const table = new SymbolTable();
const size = (g: GlyphPiece) => `${g.width.toFixed(2)} x ${g.height.toFixed(2)}`;

function reads(g: GlyphPiece, printed: string): void {
  expect(table.read(g), `picture ${size(g)} is printed as ${printed}`).toBe(printed);
}

function rightOrNull(g: GlyphPiece, ...printed: string[]): void {
  const got = table.read(g);
  expect([...printed, null], `picture ${size(g)} is printed as ${printed[0]}; got ${got}`).toContain(got);
}

describe('SymbolTable: pictures only one character has the size of', () => {
  it('the l of Cl, on a page 595 wide', () => {
    // 5070/11/M/J/16 Q13, page 5: "Two isotopes of chlorine are 35Cl and 37Cl." and C2H3Cl3
    const line = String.raw`Two isotopes of chlorine are $^{35}$C\swcut{3.09}{2.64}{5}{227.17bp 602.06bp 364.74bp 227.84bp} and $^{37}$C\swcut{3.09}{2.64}{5}{270.42bp 602.06bp 321.48bp 227.84bp}\,.`;
    const [a, b] = glyphs(CHEMISTRY_MCQ, line);
    reads(a, 'l');
    reads(b, 'l');
    reads(glyph(CHEMISTRY_MCQ, String.raw`C$_{2}$H$_{3}$C\swcut{3.09}{2.64}{5}{269.97bp 563.85bp 321.94bp 266.05bp}\,$_{3}$?`), 'l');
  });

  it('the I of KI and of an iodide ion, with the minus of its charge', () => {
    // 5070/21/M/J/24 Q4, page 7: "Potassium iodide, KI, is an ionic solid ..."
    reads(glyph(CHEMISTRY, String.raw`Potassium iodide, K\swcut{4.63}{2.64}{7}{169.50bp 766.21bp 421.15bp 63.58bp}, is an ionic solid composed of a lattice of potassium ions and iodide ions.`), 'I');
    // 5070/21/M/J/24 Q7, page 11: 126/53 I with a minus up beside it
    const [i, minus] = glyphs(CHEMISTRY, String.raw`${'$'}{}^{126}_{53}$\swcut{4.63}{2.64}{11}{299.16bp 389.61bp 291.49bp 440.18bp}\pow{\swcut{5.24}{1.98}{11}{303.63bp 394.12bp 286.40bp 438.69bp}}`);
    reads(i, 'I');
    reads(minus, '−');
  });

  it('a tick at 11 bp, on pages 595.22 and 595 wide', () => {
    // 5070/41/M/J/16 rubric, page 5: "place a tick (✓) in the box against the correct answer"
    reads(glyph(CHEMISTRY, String.raw`In questions \textbf{3 }to \textbf{6 }inclusive, place a tick (\swcut{8.30}{2.64}{5}{251.91bp 766.15bp 335.01bp 63.75bp}) in the bo\kern-0.33bp x against the correct ans\kern-0.33bp wer\kern-0.55bp .`), '✓');
    // 5070/41/M/J/17 Q4, page 7: "Tick (✓) the best titration results."
    reads(glyph(CHEMISTRY, String.raw`T\kern-0.40bp ick (\swcut{8.30}{2.64}{7}{121.44bp 316.15bp 465.53bp 513.64bp}) the best titration results.`), '✓');
  });

  it('a tick at 12 bp', () => {
    // 5070/41/O/N/16 Q7, page 8
    reads(glyph(CHEMISTRY, String.raw`T\kern-0.40bp ick (\swcut{9.06}{2.88}{8}{98.76bp 272.53bp 487.45bp 556.16bp}) the best titration results.`), '✓');
  });

  it('theta and a minus sign in Add Maths', () => {
    // 4037/12/M/J/21 Q9(c), page 13: "1, sin θ, sin²θ, ... for −π/2 < θ < π/2, where θ is in radians"
    reads(glyph(MATHS, String.raw`\swglyph{13}{321.97bp 443.47bp 267.23bp 389.70bp}`), 'θ');
    reads(glyph(MATHS, String.raw`\swglyph{13}{514.76bp 443.47bp 74.19bp 389.70bp}`), 'θ');
    reads(glyph(MATHS, String.raw`\swglyph{13}{412.13bp 446.71bp 175.63bp 393.66bp}`), '−');
    // 4037/22/M/J/20 Q10(a), page 10: "4  −2  1  −0.5  0.25"
    reads(glyph(MATHS, String.raw`\swglyph{10}{235.39bp 745.95bp 352.37bp 94.42bp}`), '−');
    reads(glyph(MATHS, String.raw`\swglyph{10}{323.07bp 745.95bp 264.69bp 94.42bp}`), '−');
  });

  it('pi and the universal set sign', () => {
    // 4037/12/M/J/16 Q1(a), page 3: "The universal set ℰ ...", "Z = {π, √2, e}."
    reads(glyph(MATHS, String.raw`\swglyph{3}{176.05bp 767.96bp 411.70bp 64.97bp}`), 'ℰ');
    reads(glyph(MATHS, String.raw`\swglyph{3}{142.77bp 689.85bp 446.19bp 146.20bp}`), 'π');
  });
});

describe('SymbolTable: pictures whose size does not say what they are', () => {
  it('a less-or-equal and a greater-or-equal cut to the same box both pass', () => {
    // 4037/11/M/J/20 Q(b), page 3: "Solve f(x) ⩽ 0."
    const le = glyph(MATHS, String.raw`\swglyph{3}{145.79bp 288.78bp 441.96bp 544.39bp}`);
    // 4037/21/M/J/19 Q1, page 3: "Find the values of x for which x(6x + 7) ⩾ 20."
    const ge = glyph(MATHS, String.raw`\swglyph{3}{256.46bp 766.78bp 331.29bp 66.39bp}`);
    expect(size(le), 'the two pictures really are the same size').toBe(size(ge));
    rightOrNull(le, '≤', '⩽');
    rightOrNull(ge, '≥', '⩾');
  });

  it('a less-or-equal of another width', () => {
    // 4037/21/M/J/17 Q?(ii), page 11: "for 0° ⩽ x ⩽ 360°"
    rightOrNull(glyph(MATHS, String.raw`\swglyph{11}{355.80bp 385.96bp 231.96bp 447.21bp}`), '≤', '⩽');
    rightOrNull(glyph(MATHS, String.raw`\swglyph{11}{374.92bp 385.96bp 212.60bp 447.21bp}`), '≤', '⩽');
  });

  it('less-than signs', () => {
    // 4037/12/M/J/21 Q9(c), page 13: "−π/2 < θ < π/2"
    rightOrNull(glyph(MATHS, String.raw`\swglyph{13}{432.64bp 443.82bp 154.64bp 389.83bp}`), '<');
    rightOrNull(glyph(MATHS, String.raw`\swglyph{13}{454.39bp 443.82bp 132.65bp 389.59bp}`), '<');
  });

  it('an intersection sign is not a Delta', () => {
    // 4037/21/M/J/17, page 7: "P′∩Q∩R" (two pictures)
    rightOrNull(glyph(MATHS, String.raw`\swglyph{7}{390.33bp 739.48bp 197.19bp 93.93bp}`), '∩');
    rightOrNull(glyph(MATHS, String.raw`\swglyph{7}{410.32bp 739.48bp 177.19bp 93.93bp}`), '∩');
    // 4037/12/M/J/16 Q1(a), page 3: "Y ∩ Z = ..."
    rightOrNull(glyph(MATHS, String.raw`\swglyph{3}{265.39bp 637.96bp 321.88bp 195.69bp}`), '∩');
  });

  it('a cap and a cup cut to the same box on one page', () => {
    // 4037/22/O/N/19 Q1, page 3: caption "(A′∩B)∪(A∩B′)"; the ∩ and the ∪ are both 6.57 x 7.28 bp
    const cap = glyph(MATHS, String.raw`\swglyph{3}{274.48bp 600.55bp 314.23bp 234.06bp}`);
    const cup = glyph(MATHS, String.raw`\swglyph{3}{294.39bp 600.55bp 294.32bp 234.06bp}`);
    expect(size(cap), 'the two pictures really are the same size').toBe(size(cup));
    rightOrNull(cap, '∩');
    rightOrNull(cup, '∪');
  });

  it('brackets, which come in pictures of one size', () => {
    // 4037/21/M/J/16 Q5(b), page 6: "28 + p√3 = (q + 2√3)²"
    rightOrNull(glyph(MATHS, String.raw`\swglyph{6}{211.22bp 507.15bp 380.37bp 322.90bp}`), '(');
    rightOrNull(glyph(MATHS, String.raw`\swglyph{6}{254.25bp 506.91bp 337.34bp 322.66bp}`), ')');
  });

  it('an equals sign the table has no entry for', () => {
    // 4037/12/M/J/21 Q5(c), page 7: "4 log_y 2 + log_2 y = 4."
    rightOrNull(glyph(MATHS, String.raw`\swglyph{7}{273.45bp 378.91bp 315.50bp 459.78bp}`), '=');
  });

  it('an open and a filled circle', () => {
    // 5070/12/M/J/20 Q7, page 6: "two particles, ○ and ●, present in atoms and ions"
    rightOrNull(glyph(CHEMISTRY_MCQ, String.raw`\swcut{7.96}{2.63}{6}{450.86bp 597.97bp 136.18bp 231.96bp}`), '○', '◦');
    rightOrNull(glyph(CHEMISTRY_MCQ, String.raw`\swcut{6.93}{2.63}{6}{483.86bp 597.97bp 104.21bp 231.96bp}`), '●', '•');
  });
});

// ---- rules, not pages: a table built for the test ---------------------------

describe('SymbolTable: rules (synthetic boxes)', () => {
  const at = (width: number, height: number): GlyphPiece => ({
    kind: 'glyph', x: 0, y: 0, width, height,
    clip: { page: 1, left: 0, bottom: 0, right: 0, top: 0 } as GlyphPiece['clip'],
  });

  it('reads an exact size, and nothing far from it', () => {
    const t = new SymbolTable([['x', 10, 0, 11, 5]]);
    expect(t.read(at(5, 10))).toBe('x');
    expect(t.read(at(7, 10))).toBeNull();
    expect(t.read(at(5, 12))).toBeNull();
  });

  it('two characters with one box: neither is read', () => {
    const t = new SymbolTable([['≤', 8.72, 0, 11.5, 7.52], ['≥', 8.72, 0, 11.5, 7.52]]);
    expect(t.read(at(7.52, 8.72))).toBeNull();
  });

  it('an empty table reads nothing', () => {
    expect(new SymbolTable([]).read(at(3.09, 12.04))).toBeNull();
  });
});
