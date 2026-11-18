import { describe, expect, it } from 'vitest';
import { parseMarkTag, parsePaperId, splitQuestions, splitTopics } from '../../src/latex/blocks.js';

describe('parsePaperId', () => {
  it('splits the packed paper/variant digits', () => {
    expect(parsePaperId('5054/21/M/J/25')).toEqual({
      paperId: '5054/21/M/J/25',
      subjectCode: '5054',
      paper: '2',
      variant: '1',
      session: 'M/J',
      year: '2025',
    });
  });

  it('handles a single-digit paper with no variant', () => {
    expect(parsePaperId('4024/2/M/J/25')?.paper).toBe('2');
    expect(parsePaperId('4024/2/M/J/25')?.variant).toBe('');
  });

  it('returns null rather than a half-filled record for junk', () => {
    expect(parsePaperId('not a paper id')).toBeNull();
    expect(parsePaperId('5054')).toBeNull();
  });
});

describe('splitTopics', () => {
  it('splits on \\textperiodcentered', () => {
    expect(splitTopics('Motion or Kinematics \\textperiodcentered\\ Forces or Dynamics')).toEqual([
      'Motion or Kinematics',
      'Forces or Dynamics',
    ]);
  });

  it('normalises the thin-space variant so the QP/QA join survives', () => {
    // Maths D 4024/22 Q18 writes these two forms in the two files for the
    // same question — templates/README.md, issue 4.
    const qp = splitTopics('Averages \\& Range \\textperiodcentered\\ Histograms');
    const qa = splitTopics('Averages \\& Range \\,\\textperiodcentered\\, Histograms');
    expect(qp).toEqual(qa);
    expect(qp).toEqual(['Averages & Range', 'Histograms']);
  });

  it('returns a single topic unchanged', () => {
    expect(splitTopics('Quadratic Functions')).toEqual(['Quadratic Functions']);
  });
});

describe('parseMarkTag', () => {
  it('reads the number out of a bracketed tag', () => {
    expect(parseMarkTag('[2]')).toBe(2);
    expect(parseMarkTag('[ 11 ]')).toBe(11);
  });

  it('returns null when there is no tag', () => {
    expect(parseMarkTag('')).toBeNull();
    expect(parseMarkTag('N')).toBeNull();
  });
});

describe('splitQuestions', () => {
  const body = `
\\examq{5054/21/M/J/25}{1}{Motion}{9}
First question body.
\\examq{5054/21/M/J/25}{2}{Forces}{8}
Second question body.
`;

  it('splits on \\examq and keeps each body', () => {
    const blocks = splitQuestions(body);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].number).toBe(1);
    expect(blocks[0].marksRaw).toBe('9');
    expect(blocks[0].body).toContain('First question body.');
    expect(blocks[0].body).not.toContain('Second question body.');
    expect(blocks[1].number).toBe(2);
  });

  it('finds nothing in a file that does not use the format', () => {
    expect(splitQuestions('\\section{Q1} some text')).toHaveLength(0);
  });
});
