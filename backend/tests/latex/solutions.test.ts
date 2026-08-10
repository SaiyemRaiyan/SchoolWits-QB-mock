import { describe, expect, it } from 'vitest';
import { parseAnsbox, parseCorrectOption } from '../../src/latex/solutions.js';

describe('parseAnsbox', () => {
  const body = `
(a) Speed--Time Graph\\\\[4pt]
Draw a curve that starts at the origin and levels off.

\\vspace{4pt}
(c)(i) The Other Vertical Force\\\\[4pt]
Air resistance (drag).

\\vspace{4pt}
(c)(ii) Why It Becomes Zero\\\\[4pt]
The air resistance grows until it balances her weight.
\\[ R = \\sqrt{400^{2} + 100^{2}} = \\boxed{410\\ \\text{N}} \\]
`;

  const segments = parseAnsbox(body, 1);

  it('splits on the leading part marker', () => {
    expect(segments).toHaveLength(3);
  });

  it('qualifies refs with the question number so they match the mark scheme', () => {
    expect(segments.map((s) => s.ref)).toEqual(['1(a)', '1(c)(i)', '1(c)(ii)']);
  });

  it('separates the heading from the body', () => {
    expect(segments[0].heading).toBe('Speed–Time Graph');
    expect(segments[0].html).toContain('starts at the origin');
    expect(segments[0].html).not.toContain('Speed–Time Graph');
  });

  it('keeps display math intact for KaTeX', () => {
    expect(segments[2].html).toContain('\\[ R = \\sqrt{400^{2} + 100^{2}} = \\boxed{410\\ \\text{N}} \\]');
  });

  it('does not split on a marker that appears mid-sentence', () => {
    const one = parseAnsbox('From (a) we know the gradient falls.', 3);
    expect(one).toHaveLength(1);
    expect(one[0].ref).toBeNull();
  });
});

describe('parseCorrectOption', () => {
  it('reads the letter out of MCQ prose', () => {
    expect(parseCorrectOption('\\textbf{Answer: A}\\\\[4pt] Momentum is mass times velocity.')).toBe('A');
  });

  it('handles a bare form', () => {
    expect(parseCorrectOption('Answer B is correct')).toBe('B');
  });

  it('returns null when no letter is recorded', () => {
    expect(parseCorrectOption('The gradient decreases.')).toBeNull();
  });
});
