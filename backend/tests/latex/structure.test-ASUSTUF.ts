import { describe, expect, it } from 'vitest';
import { extractAnswerSpace, parseStructure, splitItems } from '../../src/latex/structure.js';

describe('splitItems', () => {
  it('splits a flat list', () => {
    expect(splitItems('\\item one \\item two').map((s) => s.trim())).toEqual(['one', 'two']);
  });

  it('does not let a nested list shatter the outer one', () => {
    const body = `
\\item outer a
\\begin{subparts}
  \\item inner one
  \\item inner two
\\end{subparts}
\\item outer b
`;
    const items = splitItems(body);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('inner one');
    expect(items[1]).toContain('outer b');
  });
});

describe('extractAnswerSpace', () => {
  it('reads \\Alines lines and marks, and removes the macro', () => {
    const { answerSpace, marks, rest } = extractAnswerSpace('Explain why. \\Alines{3}{[1]}');
    expect(answerSpace).toEqual({ kind: 'lines', lines: 3 });
    expect(marks).toBe(1);
    expect(rest.trim()).toBe('Explain why.');
  });

  it('reads \\ansval label and unit', () => {
    const { answerSpace, marks } = extractAnswerSpace('\\ansval{resultant $=$}{N}{[3]}');
    expect(answerSpace).toEqual({ kind: 'value', label: 'resultant $=$', unit: 'N' });
    expect(marks).toBe(3);
  });

  it('reads \\markright', () => {
    const { answerSpace, marks } = extractAnswerSpace('Sketch it. \\markright{[2]}');
    expect(answerSpace).toEqual({ kind: 'markright' });
    expect(marks).toBe(2);
  });

  it('sums marks when a part carries several answer lines', () => {
    const { marks } = extractAnswerSpace('\\ansval{x}{}{[1]} and \\ansval{y}{}{[2]}');
    expect(marks).toBe(3);
  });

  it('reports no marks when there is no answer space', () => {
    expect(extractAnswerSpace('just prose').marks).toBeNull();
  });

  it('recovers marks from a hand-rolled \\mbox mark tag', () => {
    // Maths D writes some answer lines out of \makebox/\dotfill by hand,
    // leaving the marks in a bare \mbox rather than a macro argument.
    const raw = '\\makebox[3cm]{\\dotfill} : \\makebox[3cm]{\\dotfill}\\hspace{0.6em}\\mbox{[2]}';
    const { marks, answerSpace } = extractAnswerSpace(raw);
    expect(marks).toBe(2);
    expect(answerSpace).toEqual({ kind: 'markright' });
  });

  it('ignores an \\mbox that holds ordinary text', () => {
    expect(extractAnswerSpace('\\mbox{Total: 5} of prose').marks).toBeNull();
  });
});

describe('parseStructure — generated refs', () => {
  // Mirrors Physics 5054/21 Q1: four parts, the third holding two subparts.
  const body = `
Fig. 1.1 shows a skydiver.

\\begin{parts}
  \\item Sketch the graph.
  \\markright{[2]}

  \\item Explain the decrease.
  \\Alines{3}{[1]}

  \\item There is a resultant force.
  \\begin{subparts}
    \\item Name the other force.
    \\Alines{1}{[1]}
    \\item Explain why it becomes zero.
    \\Alines{4}{[2]}
  \\end{subparts}

  \\item Determine the resultant.
  \\ansval{resultant $=$}{N}{[3]}
\\end{parts}
`;

  const { stem, parts } = parseStructure(body, 1);

  it('keeps pre-parts content as the stem', () => {
    expect(stem).toHaveLength(1);
    expect(stem[0]).toMatchObject({ type: 'text' });
  });

  it('letters the top-level parts from position', () => {
    expect(parts.map((p) => p.label)).toEqual(['a', 'b', 'c', 'd']);
    expect(parts.map((p) => p.ref)).toEqual(['1(a)', '1(b)', '1(c)', '1(d)']);
  });

  it('numbers subparts in roman and nests their refs', () => {
    expect(parts[2].subparts.map((s) => s.ref)).toEqual(['1(c)(i)', '1(c)(ii)']);
  });

  it('gives a grouping part the sum of its subparts', () => {
    expect(parts[2].marks).toBe(3);
  });

  it('reads each part\'s own marks', () => {
    expect(parts.map((p) => p.marks)).toEqual([2, 1, 3, 3]);
  });

  it('does not treat subparts as top-level parts', () => {
    expect(parts).toHaveLength(4);
  });

  it('returns an empty parts list for a question with none', () => {
    const mcq = parseStructure('What is a unit for momentum?', 7);
    expect(mcq.parts).toEqual([]);
    expect(mcq.stem.length).toBeGreaterThan(0);
  });
});
