/**
 * LaTeX to placed pieces: where things land, and what prints nothing.
 * Definitions come from the real preambles, lines from the papers named.
 */

import { describe, expect, it } from 'vitest';
import { MacroTable } from '../../src/extract/macros.js';
import { Typesetter } from '../../src/extract/typesetter.js';
import type { Line, Piece, TextPiece } from '../../src/extract/types.js';
import { CHEMISTRY, CHEMISTRY_MCQ, MATHS, PHYSICS, PHYSICS_MCQ } from './preambles.js';

const set = (preamble: string, tex: string): Line => new Typesetter(MacroTable.fromPreamble(preamble)).line(tex);

// Not from helpers.ts, which needs the whole extractor.
const plain = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/** The line as it reads: a gap as wide as a space is a space. */
function reads(line: Line): string {
  const shown = line.pieces.filter((p) => p.kind === 'text' || p.kind === 'math').sort((a, b) => a.x - b.x);
  let out = '';
  let end = -Infinity;
  for (const p of shown) {
    if (end > -Infinity && p.x - end > 0.13 * line.size) out += ' ';
    out += p.kind === 'text' ? p.text : `$${p.tex.replace(/^\$|\$$/g, '')}$`;
    end = p.x + p.width;
  }
  return plain(out);
}

const texts = (line: Line) => line.pieces.filter((p): p is TextPiece => p.kind === 'text' && p.text.trim() !== '');
const find = (line: Line, text: string): TextPiece => {
  const piece = texts(line).find((p) => p.text.trim() === text);
  if (!piece) throw new Error(`no "${text}" in ${JSON.stringify(texts(line).map((p) => p.text))}`);
  return piece;
};

describe('typesetter: kerns', () => {
  it.each([
    // 5054/22/M/J/16 Q4(c), page 5
    ['a kern inside a word', PHYSICS, String.raw`Explain, using ideas about molecules, how e\kern-0.33bp vaporation causes cooling.`, 'Explain, using ideas about molecules, how evaporation causes cooling.'],
    // 5054/41/M/J/17 Q1(a)(ii), page 2
    ['a kern before a full stop', PHYSICS, String.raw`Explain your answer\kern-0.59bp .`, 'Explain your answer.'],
    // 5054/11/M/J/17 Q2, page 2
    ['kerns as the gaps between words', PHYSICS_MCQ, String.raw`A\kern3.73bp car's\kern3.73bp acceleration\kern3.73bp and\kern3.68bp maximum`, "A car's acceleration and maximum"],
    // 4037/22/M/J/20 Q11, page 12
    ['a wide gap and a narrow one', MATHS, String.raw`have\kern3.67bp equal\kern3.66bp radii\kern3.67bp of\kern3.67bp length`, 'have equal radii of length'],
    // 4037/12/M/J/16 Q11(a)(ii), page 14
    ['a capital pulled back', MATHS, String.raw`W\kern-0.46bp rite down the deceleration`, 'Write down the deceleration'],
    // 5054/42/M/J/18 Q3(c), page 7
    ['a kern after every second letter, and control spaces', PHYSICS, String.raw`Use\kern-0.21bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ e\kern-0.21bp\relax q\kern0.41bp\relax ua\kern-0.21bp\relax t\kern0.41bp\relax io\kern0.20bp\relax n`, 'Use the equation'],
    // 5054/22/M/J/16 Q4, page 5
    ['a thin space between sentences', PHYSICS, String.raw`The liquid boils f\kern-0.33bp or a long time.\,There are bubbles`, 'The liquid boils for a long time. There are bubbles'],
  ])('%s', (_, preamble, tex, printed) => expect(reads(set(preamble, tex))).toBe(printed));
});

describe('typesetter: raised, lowered, sized', () => {
  it('a power goes where its paper puts it, in the type its paper sets it in', () => {
    const maths = find(set(MATHS, String.raw`x\pow{2}`), '2');
    expect([maths.y, maths.size]).toEqual([expect.closeTo(5.2, 1), expect.closeTo(8.05, 1)]);
    const physics = find(set(PHYSICS_MCQ, String.raw`x\pow{2}`), '2');
    expect([physics.y, physics.size]).toEqual([expect.closeTo(4.98, 1), expect.closeTo(7.02, 1)]);
  });

  it('an index hangs below the line', () => {
    const line = set(MATHS, String.raw`log\sub{3}`);
    expect(find(line, '3').y).toBeCloseTo(-4.0, 1);
    expect(find(line, 'log').y).toBeCloseTo(0, 5);
  });

  it('what follows a power is back on the line and back at full size', () => {
    // 4037/11/M/J/16 Q7, page 8
    const line = set(MATHS, String.raw`4.5\kern1.42bp ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1} in still water`);
    const after = texts(line).filter((p) => /still/.test(p.text))[0];
    expect(after.y).toBeCloseTo(0, 5);
    expect(after.size).toBeCloseTo(11.5, 1);
    const raised = texts(line).filter((p) => p.y > 3);
    expect(raised.map((p) => p.text).join('').replace(/[–−]/g, '-')).toBe('-1');
    expect(raised.every((p) => Math.abs(p.size - 8.62) < 0.1)).toBe(true);
  });

  it('raises add up', () => {
    // 5070/11/M/J/17 Q4, page 2: \nuc{\raisebox{-0.40bp}{19}}{\raisebox{0.26bp}{9}}, \nuc raising 5.4 and lowering 3
    const line = set(CHEMISTRY_MCQ, String.raw`\nuc{\raisebox{-0.40bp}{19}}{\raisebox{0.26bp}{9}}\kern0.62bp F`);
    expect(find(line, '19').y).toBeCloseTo(5.0, 1);
    expect(find(line, '9').y).toBeCloseTo(-2.74, 1);
    // The two are set one above the other, both ending at the left of the F.
    const end = (t: string) => find(line, t).x + find(line, t).width;
    expect(end('19')).toBeCloseTo(end('9'), 1);
    expect(find(line, 'F').x).toBeGreaterThanOrEqual(end('19') - 0.1);
  });

  it('knows bold from italic from plain', () => {
    // 4037/12/M/J/16 Q3, page 5
    const line = set(MATHS, String.raw`\textbf{a}\kern5.97bp {\itshape y} plain`);
    expect(find(line, 'a')).toMatchObject({ bold: true, italic: false });
    expect(find(line, 'y')).toMatchObject({ bold: false, italic: true });
    expect(find(line, 'plain')).toMatchObject({ bold: false, italic: false });
  });

  it('an underline belongs to the words inside it', () => {
    const line = set(PHYSICS, String.raw`the \underline{force} on it`);
    expect(find(line, 'force').underline).toBe(true);
    expect(texts(line).filter((p) => /the|on/.test(p.text)).some((p) => p.underline)).toBe(false);
  });
});

describe('typesetter: placing', () => {
  it('\\rlap takes no width, and a kern inside it moves only its contents', () => {
    const line = set(PHYSICS, String.raw`\rlap{\kern10bp A}B`);
    expect(find(line, 'A').x).toBeCloseTo(10, 3);
    expect(find(line, 'B').x).toBeCloseTo(0, 3);
  });

  it('\\llap ends where it is written', () => {
    const line = set(PHYSICS, String.raw`\kern50bp\llap{A}\kern20bp B`);
    const a = find(line, 'A');
    expect(a.x + a.width).toBeCloseTo(50, 1);
    expect(find(line, 'B').x).toBeCloseTo(70, 1);
  });

  it('a box has the width it is given, and its contents the place it says', () => {
    const line = set(PHYSICS, String.raw`\makebox[40bp][c]{A}B`);
    expect(find(line, 'B').x).toBeCloseTo(40, 1);
    const a = find(line, 'A');
    expect(a.x + a.width / 2).toBeCloseTo(20, 1);
    const right = set(PHYSICS, String.raw`\makebox[40bp][r]{A}\kern20bp B`);
    expect(find(right, 'A').x + find(right, 'A').width).toBeCloseTo(40, 1);
  });

  it('\\at places absolutely, whatever order the pieces come in', () => {
    // 4037/23/O/N/18 Q1, page 3
    const line = set(MATHS, String.raw`\at{187.03}{0.00}{second}\at{72.29}{-5.75}{first}`);
    const [a, b] = [find(line, 'first'), find(line, 'second')];
    expect(b.x - a.x).toBeCloseTo(187.03 - 72.29, 2);
    expect(a.y - b.y).toBeCloseTo(-5.75, 2);
  });

  it('the pieces of a stacked fraction share one place', () => {
    // 5054/41/M/J/17 Q4(d), page 8
    const line = set(PHYSICS, String.raw`$R$ = \rlap{\kern0.00bp\raisebox{5.80bp}[0pt][0pt]{$V$}}\rlap{\kern1.35bp\raisebox{-7.20bp}[0pt][0pt]{\makebox[4.63bp][c]{\swf{ptm}{12.08}{I}}}}\rlap{\kern0.00bp\raisebox{3.08bp}[0pt][0pt]{\rule{7.34bp}{0.50bp}}}\kern7.34bp \kern2.09bp .`);
    const rule = line.pieces.find((p) => p.kind === 'rule')!;
    const top = line.pieces.find((p) => p.kind === 'math' && p.tex.includes('V'))!;
    expect(rule.width).toBeCloseTo(7.34, 2);
    expect(top.x).toBeCloseTo(rule.x, 2);
    expect(top.y).toBeCloseTo(5.8, 2);
    expect(find(line, 'I').x - rule.x).toBeGreaterThan(0);
    expect(find(line, 'I').y).toBeCloseTo(-7.2, 2);
    expect(find(line, '.').x).toBeGreaterThan(rule.x + rule.width);
  });

  it('a drawn path is in the same measure as the text placed beside it', () => {
    // 4037/23/O/N/18 Q1, page 3: the bars stand just before 5x and just after 3
    const line = set(MATHS, String.raw`\at{72.29}{-0.00}{Solve the equation}\at{166.19}{-0.00}{5{\itshape x}}\at{187.03}{-0.00}{3\kern5.69bp {\itshape =}}\swpath{fill=black}{(113.90,-2.00) rectangle (114.40,9.72)}{}\swpath{fill=black}{(145.12,-2.00) rectangle (145.62,9.72)}{}`);
    const drawn = line.pieces.filter((p): p is Exclude<Piece, TextPiece> => p.kind === 'path' || p.kind === 'rule');
    expect(drawn).toHaveLength(2);
    const [left, right] = drawn.map((p) => p.x).sort((a, b) => a - b);
    expect(left).toBeGreaterThan(find(line, 'Solve the equation').x + 80);
    expect(left).toBeLessThan(find(line, '5').x);
    expect(right).toBeGreaterThan(find(line, '3').x);
    expect(right).toBeLessThan(find(line, '=').x);
  });

  it('the width of Times text is the width the paper prints', () => {
    // 4037/12/M/J/16 Q4, page 6, measured with pdftotext -bbox: "which" from 216.97 to 245.07, "Find" from 72.28 to 93.38
    expect(find(set(MATHS, 'which'), 'which').width).toBeCloseTo(28.1, 1);
    expect(find(set(MATHS, 'Find'), 'Find').width).toBeCloseTo(21.1, 1);
  });
});

describe('typesetter: what prints nothing', () => {
  it.each([
    ['\\parfillskip with no equals sign', PHYSICS, String.raw`better than oil.{\parfillskip0pt\par}`, 'better than oil.'],
    ['\\parfillskip with one', CHEMISTRY, String.raw`aqueous potassium{\parfillskip=0pt\par}`, 'aqueous potassium'],
    ['letter spacing', PHYSICS, String.raw`{\advance\spaceskip-0.11bp\advance\xspaceskip-0.11bp\textls[-10]{T\kern-1.22bp ake it.}}`, 'Take it.'],
    ['positive letter spacing', PHYSICS, String.raw`\textls[+5]{On the grid}`, 'On the grid'],
    ['word spacing', PHYSICS, String.raw`{\spaceskip=2.26bp\xspaceskip=2.26bp\relax At another time}`, 'At another time'],
    ['stretch and shrink', PHYSICS, String.raw`$t$ s after\nobreak\hskip0pt plus-1fil\null`, '$t$ s after'],
    ['shrink at the end', PHYSICS, String.raw`evaporates.\nobreak\hskip0pt minus2.11bp\kern0pt `, 'evaporates.'],
    ['\\vadjust', CHEMISTRY_MCQ, String.raw`sulfate\vadjust{\kern0.35bp}\linebreak`, 'sulfate'],
    ['the depth of a band', MATHS, String.raw`here\swdepth{13.98}`, 'here'],
    ['a strut', PHYSICS, String.raw`\strut here`, 'here'],
    ['a font size', PHYSICS, String.raw`\smash{\fontsize{12.00bp}{12.00bp}\selectfont here}`, 'here'],
    ['a phantom', PHYSICS, String.raw`a\phantom{gone}b`.replace('gone', 'x'), 'a b'],
  ])('%s', (_, preamble, tex, printed) => expect(reads(set(preamble, tex))).toBe(printed));

  it('a slanted symbol is printed once, not once more for the width it reserves', () => {
    // 5054/12/M/J/21 Q12, page 6
    const line = set(PHYSICS_MCQ, String.raw`density \mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{$\rho$}\pdfrestore\phantom{$\rho$}}.`);
    expect(reads(line)).toBe(String.raw`density $\rho$.`);
  });

  it('an undefined command prints neither its name nor its arguments', () => {
    const line = set(PHYSICS, String.raw`State the \mystery{12.5}{34.75bp}[7pt] speed.`);
    expect(reads(line)).not.toMatch(/mystery|12\.5|34\.75|bp|7pt/);
    expect(reads(line)).toMatch(/^State the.*speed\.$/);
  });
});

describe('typesetter: characters by code', () => {
  it.each([
    // Adobe Symbol encoding, as printed at 5070/11/O/N/19 Q17 and 4037/22/O/N/22 Q8
    ['arrow', PHYSICS, String.raw`\swsy{AE}`, '→'],
    ['Delta', PHYSICS, String.raw`\swsy{44}`, 'Δ'],
    ['pi', PHYSICS, String.raw`\swsy{70}`, 'π'],
    ['rho', PHYSICS, String.raw`\swsy{72}`, 'ρ'],
    ['times', PHYSICS, String.raw`\swsy{B4}`, '×'],
    ['divide', PHYSICS, String.raw`\swsy{B8}`, '÷'],
    ['ohm', PHYSICS, String.raw`\ohms`, 'Ω'],
    ['degree, by two routes', PHYSICS, String.raw`\dg`, '°'],
    ['degree, by two routes', CHEMISTRY, String.raw`\dg`, '°'],
    ['degrees Celsius', PHYSICS, String.raw`200\,\degC`, '200 °C'],
    // 5054/21/M/J/18 Q9, page 10
    ['a tick', PHYSICS, String.raw`({\usefont{U}{pzd}{m}{n}\char"33})`, '(✓)'],
    // 5054/11/M/J/23 Q26, page 12
    ['a bullet', PHYSICS_MCQ, String.raw`\swbul{}`, '•'],
    ['a percent sign', PHYSICS, String.raw`5\,\%`, '5 %'],
    ['an en dash', PHYSICS, String.raw`1\textendash{}2`, '1–2'],
  ])('%s', (_, preamble, tex, printed) => {
    const shown = reads(set(preamble, tex)).replace(/[ΔΔ]/g, 'Δ').replace(/[ΩΩ]/g, 'Ω').replace('●', '•');
    // A thin space may be printed as a gap or not; the characters may not vary.
    expect(shown.replace(/ /g, '')).toBe(printed.replace(/ /g, ''));
  });

  it('typed maths is one piece, untouched', () => {
    const tex = String.raw`y = \dfrac{2x - 5}{\sqrt{x}} \leq \begin{pmatrix}n\\1\end{pmatrix}`;
    const line = set(MATHS, String.raw`equation\kern2.24bp $${tex}$.`);
    const typed = line.pieces.filter((p) => p.kind === 'math');
    expect(typed).toHaveLength(1);
    expect((typed[0] as { tex: string }).tex.replace(/^\$|\$$/g, '')).toBe(tex);
  });

  it('a picture of a character keeps the rectangle it is cut from', () => {
    // 5070/11/M/J/16 Q13, page 5
    const line = set(CHEMISTRY_MCQ, String.raw`C\swcut{3.09}{2.64}{5}{227.17bp 602.06bp 364.74bp 227.84bp}`);
    const glyph = line.pieces.find((p) => p.kind === 'glyph')!;
    expect(glyph).toMatchObject({ clip: { page: 5, left: 227.17, bottom: 602.06, right: 364.74, top: 227.84 } });
    expect(glyph.x).toBeCloseTo(find(line, 'C').x + find(line, 'C').width, 1);
    // The page is 595.28 by 841.89 bp.
    expect(glyph.width).toBeCloseTo(3.09, 0);
    expect((glyph as { height: number }).height).toBeCloseTo(11.99, 0);
  });
});
