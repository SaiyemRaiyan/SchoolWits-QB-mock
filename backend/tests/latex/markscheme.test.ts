import { describe, expect, it } from 'vitest';
import {
  marksFromCode,
  parseLabelCell,
  parseMstab,
  splitAlternatives,
} from '../../src/latex/markscheme.js';
import { detectMstabColumns } from '../../src/latex/preprocess.js';

describe('parseLabelCell', () => {
  it('reads a plain label', () => {
    expect(parseLabelCell('1(b)')).toBe('1(b)');
  });

  it('reads the label out of a negative \\multirow', () => {
    expect(parseLabelCell('\\multirow{-2}{1.9cm}{1(a)}')).toBe('1(a)');
  });

  it('returns null for a continuation row', () => {
    expect(parseLabelCell('   ')).toBeNull();
    expect(parseLabelCell('')).toBeNull();
  });
});

describe('marksFromCode', () => {
  it('reads the digit out of a mark code', () => {
    expect(marksFromCode('B1')).toBe(1);
    expect(marksFromCode('\\textbf{M2}')).toBe(2);
  });

  it('is 0 when the code carries no number', () => {
    expect(marksFromCode('')).toBe(0);
  });
});

describe('splitAlternatives', () => {
  it('splits on the \\newline or \\newline separator', () => {
    const alts = splitAlternatives('gradient decreases \\newline or \\newline speed increase is less');
    expect(alts).toHaveLength(2);
    expect(alts[0]).toContain('gradient decreases');
  });

  it('does not split a plain line break inside one answer', () => {
    expect(splitAlternatives('first line \\newline second line')).toEqual([]);
  });
});

describe('parseMstab — labels carry upward', () => {
  // Physics 5054/21 Q1, verbatim shape: two 2-row groups and one 1-row.
  const body = `
 & curve upwards with decreasing gradient labelled A & B1 \\\\ \\cline{2-3}
\\multirow{-2}{1.9cm}{1(a)} & horizontal line labelled B & B1 \\\\ \\hline
1(b) & gradient / slope decreases & B1 \\\\ \\hline
 & air resistance increases & B1 \\\\ \\cline{2-3}
\\multirow{-2}{1.9cm}{1(c)(ii)} & air resistance balances weight & B1 \\\\ \\hline
`;

  const rows = parseMstab(body, 3);

  it('produces one row per mark', () => {
    expect(rows).toHaveLength(5);
  });

  it('applies a \\multirow label back over the blank rows above it', () => {
    expect(rows[0].ref).toBe('1(a)');
    expect(rows[1].ref).toBe('1(a)');
  });

  it('keeps an inline single-row label', () => {
    expect(rows[2].ref).toBe('1(b)');
  });

  it('does not leak a label into the next group', () => {
    expect(rows[3].ref).toBe('1(c)(ii)');
    expect(rows[4].ref).toBe('1(c)(ii)');
  });

  it('reads answers and mark codes', () => {
    expect(rows[2].answer).toContain('gradient / slope decreases');
    expect(rows[2].code).toBe('B1');
    expect(rows[2].marks).toBe(1);
  });

  it('leaves guidance null for a 3-column paper', () => {
    expect(rows[0].guidance).toBeNull();
  });
});

describe('parseMstab — labels carry downward too', () => {
  // Add Maths 4037/11 Q3: the label heads its group, either plain or as a
  // POSITIVE \multirow. Opposite direction to Physics' negative form.
  const body = `
3(a) & distance $= \\sqrt{5}$ & \\textbf{B1} & Accept if substituted \\\\ \\hline
\\multirow{2}{*}{3(b)} & first step oe, soi & \\textbf{M1} & Award for the 2 equations \\\\ \\cline{2-4}
 & $(5,\\,-5)$ & \\textbf{A1} & \\\\ \\hline
3(c) & gradient of radius $=-2$ & \\textbf{M1} & \\\\ \\cline{2-4}
 & gradient of tangent & \\textbf{M1} & \\textbf{FT} their $-2$ \\\\ \\cline{2-4}
 & $y+1 = \\frac{1}{2}(x-3)$ oe & \\textbf{A1} & ISW \\\\ \\hline
`;

  const rows = parseMstab(body, 4);

  it('carries a positive \\multirow label down over the rows below', () => {
    expect(rows[1].ref).toBe('3(b)');
    expect(rows[2].ref).toBe('3(b)');
  });

  it('carries a plain label down over its continuation rows', () => {
    expect(rows.slice(3).map((r) => r.ref)).toEqual(['3(c)', '3(c)', '3(c)']);
  });

  it('leaves no row without a ref', () => {
    expect(rows.filter((r) => !r.ref && !r.banner)).toEqual([]);
  });

  it('stops one group\'s label leaking into the next', () => {
    expect(rows[0].ref).toBe('3(a)');
  });
});

describe('parseMstab — \\altrow banners', () => {
  const rows = parseMstab(
    `3(c) & main method & \\textbf{A1} & \\\\ \\hline
\\altrow{q3color}{Alternative}
 & use of differentiation & \\textbf{(M1)} & allow one error \\\\ \\hline`,
    4,
  );

  it('marks the banner row as a heading, not a mark row', () => {
    const banner = rows.find((r) => r.banner);
    expect(banner?.answer).toBe('Alternative');
    expect(banner?.marks).toBe(0);
  });

  it('keeps counting real rows around it', () => {
    expect(rows.filter((r) => !r.banner)).toHaveLength(2);
  });

  it('attaches the alternative method rows to the part they belong to', () => {
    // An "Alternative" block is another route to the SAME part's marks, so
    // its rows must not be orphaned by the banner interrupting the group.
    expect(rows.map((r) => r.ref)).toEqual(['3(c)', '3(c)', '3(c)']);
  });
});

describe('parseMstab — 4-column papers', () => {
  // Add Maths 4037/11 Q2 shape: a fourth guidance column.
  const body = `
2 & $5x^2 - 10x - 15 \\ge 0$ oe & \\textbf{M1} & where $*$ is any inequality sign \\\\ \\cline{2-4}
 & Critical values $-1$ and $3$ & \\textbf{A1} & \\\\ \\hline
`;

  const rows = parseMstab(body, 4);

  it('captures the guidance column', () => {
    expect(rows[0].guidance).toContain('any inequality sign');
  });

  it('keeps math in the answer cell untouched', () => {
    expect(rows[0].answer).toContain('$5x^2 - 10x - 15 \\ge 0$');
  });

  it('still reads the mark code through its \\textbf wrapper', () => {
    expect(rows[0].code).toBe('M1');
    expect(rows[0].marks).toBe(1);
  });
});

describe('detectMstabColumns', () => {
  // The three real preamble shapes. What varies between them is the
  // ARGUMENT count in \newenvironment{mstab}[N] — which says nothing about
  // how many columns the table has. Maths D is the case that proves it:
  // one argument, four columns.
  const preamble = (args: string, header: string) => `
\\newenvironment{mstab}${args}{%
  \\tabularx{\\textwidth}{|>{\\raggedright\\arraybackslash}p{1.9cm}|>{}X|>{\\centering\\arraybackslash}p{1.1cm}|}%
  \\hline
  \\rowcolor{#1!45} ${header} \\\\ \\hline
}{%
  \\endtabularx
}
`;

  it('reads 4 columns from a Maths D preamble that takes ONE argument', () => {
    // The regression: this used to return 3 because of the [1], silently
    // discarding the Partial Marks column on every Maths D row.
    expect(detectMstabColumns(preamble('[1]', 'Question & Answer & Marks & Partial Marks'))).toBe(4);
  });

  it('reads 3 columns from a Physics preamble that also takes one argument', () => {
    expect(detectMstabColumns(preamble('[1]', 'Question & Answer & Marks'))).toBe(3);
  });

  it('reads 4 columns from an Add Maths preamble that takes two', () => {
    expect(detectMstabColumns(preamble('[2][Partial Marks]', 'Question & Answer & Marks & Partial Marks'))).toBe(4);
  });

  it('defaults to 3 when there is no preamble to read', () => {
    expect(detectMstabColumns('')).toBe(3);
  });
});
