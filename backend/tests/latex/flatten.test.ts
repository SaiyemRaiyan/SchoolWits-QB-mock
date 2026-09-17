import { describe, expect, it } from 'vitest';
import { flattenQuestion } from '../../src/latex/flatten.js';

/**
 * These pin the behaviour that questions.search_vector depends on. The
 * function was duplicated in two places before being consolidated here, so
 * the point of most of these is that the contract is now written down once
 * rather than inferred from two implementations that happened to agree.
 */
describe('flattenQuestion', () => {
  it('walks stem, parts and subparts in document order', () => {
    const out = flattenQuestion({
      stem: [{ type: 'text', html: 'A skydiver falls.' }],
      parts: [
        {
          content: [{ type: 'text', html: 'Sketch the graph.' }],
          subparts: [{ content: [{ type: 'text', html: 'Name the force.' }], subparts: [] }],
        },
      ],
    });
    expect(out).toBe('A skydiver falls. Sketch the graph. Name the force.');
  });

  it('indexes a figure by its caption only', () => {
    // There is no text inside the image to index, and src is a bucket URL —
    // indexing it would make every question in a paper match its neighbours.
    const out = flattenQuestion({
      stem: [
        { type: 'figure', caption: 'Fig. 1.1', src: 'https://example.test/a.png', file: 'a.png' },
      ],
    });
    expect(out).toBe('Fig. 1.1');
  });

  it('drops math in both TeX conventions', () => {
    const out = flattenQuestion({
      stem: [{ type: 'text', html: 'Find $x^2$ and \\(y\\) and \\[z\\] and $$w$$ now.' }],
    });
    expect(out).toBe('Find and and and now.');
  });

  it('strips tags and entities left by the inline formatter', () => {
    const out = flattenQuestion({
      stem: [{ type: 'text', html: 'Mark <strong>one</strong> point&nbsp;here.' }],
    });
    expect(out).toBe('Mark one point here.');
  });

  it('includes mark scheme answers and worked solution headings', () => {
    const out = flattenQuestion({
      answer: {
        markScheme: [{ answer: 'air resistance / drag' }],
        workedSolution: [{ heading: 'The Other Force', html: 'Air resistance.' }],
      },
    });
    expect(out).toBe('air resistance / drag The Other Force Air resistance.');
  });

  it('includes MCQ option text', () => {
    const out = flattenQuestion({
      options: { items: [{ content: 'newton' }, { content: 'joule' }] },
    });
    expect(out).toBe('newton joule');
  });

  it('tolerates a half-built question', () => {
    // Real state: the QP file is uploaded and the QA file is not yet, so
    // `answer` is null. This must not throw.
    expect(flattenQuestion({ stem: [], parts: [], options: null, answer: null })).toBe('');
    expect(flattenQuestion({})).toBe('');
    expect(flattenQuestion(null)).toBe('');
  });

  it('accepts a worked solution segment with no heading', () => {
    const out = flattenQuestion({
      answer: { markScheme: [], workedSolution: [{ heading: null, html: 'Just the body.' }] },
    });
    expect(out).toBe('Just the body.');
  });

  it('truncates at 8000 characters', () => {
    const out = flattenQuestion({
      stem: [{ type: 'text', html: 'word '.repeat(4000) }],
    });
    expect(out).toHaveLength(8000);
  });
});
