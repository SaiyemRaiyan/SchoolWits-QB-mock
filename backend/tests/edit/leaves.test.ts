import { describe, expect, it } from 'vitest';
import { applyEdits, collectLeaves, EditError } from '../../src/edit/leaves.js';

/** A miniature of the real shape: stem, a part with a subpart, and answers. */
function question() {
  return {
    kind: 'structured',
    number: 1,
    marks: 3,
    topics: ['Forces'],
    stem: [
      { type: 'text', html: 'A skydiver falls.' },
      { type: 'figure', file: 'f.png', src: 'https://x/f.png', caption: 'Fig. 1.1', width: null },
      { type: 'table', html: '<table><tr><td>x</td></tr></table>' },
    ],
    parts: [
      {
        ref: '1(a)',
        label: 'a',
        marks: 3,
        content: [{ type: 'text', html: 'Sketch the graph.' }],
        subparts: [
          {
            ref: '1(a)(i)',
            label: 'i',
            marks: 1,
            content: [{ type: 'text', html: 'Name the force.' }],
            subparts: [],
          },
        ],
      },
    ],
    options: null,
    answer: {
      correct: null,
      markScheme: [
        { ref: '1(a)', code: 'B1', marks: 1, answer: 'drag', guidance: null, alternatives: [] },
      ],
      workedSolution: [{ ref: '1(a)', heading: 'Forces', html: 'Air resistance.' }],
    },
  };
}

const pathOf = (leaves: ReturnType<typeof collectLeaves>, label: string) =>
  leaves.find((l) => l.label === label)!.path;

describe('collectLeaves', () => {
  it('finds stem text, figure captions, parts and subparts', () => {
    const labels = collectLeaves(question()).map((l) => l.label);
    expect(labels).toContain('Stem · text');
    expect(labels).toContain('Stem · figure caption');
    expect(labels).toContain('1(a) · text');
    expect(labels).toContain('1(a)(i) · text');
  });

  it('exposes mark scheme answer, code and guidance, and solution fields', () => {
    const labels = collectLeaves(question()).map((l) => l.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        '1(a) · mark scheme',
        '1(a) · code',
        '1(a) · guidance',
        '1(a) · solution heading',
        '1(a) · worked solution',
      ]),
    );
  });

  it('offers a null guidance as an empty editable field', () => {
    const leaf = collectLeaves(question()).find((l) => l.label === '1(a) · guidance')!;
    expect(leaf.value).toBe('');
  });

  it('does not expose a table block', () => {
    // Pre-rendered HTML with structure inside it — re-upload territory.
    const paths = collectLeaves(question()).map((l) => l.path.join('.'));
    expect(paths).not.toContain('stem.2.html');
  });

  it('does not expose marks, kind, topics, refs or image src', () => {
    const paths = collectLeaves(question()).map((l) => l.path.join('.'));
    for (const forbidden of ['marks', 'kind', 'topics', 'parts.0.marks', 'parts.0.ref', 'stem.1.src']) {
      expect(paths).not.toContain(forbidden);
    }
  });

  it('exposes MCQ option text', () => {
    const mcq = { kind: 'mcq', options: { items: [{ label: 'A', content: 'newton' }] } };
    expect(collectLeaves(mcq)).toEqual([
      { path: ['options', 'items', 0, 'content'], label: 'Option A', kind: 'option', value: 'newton' },
    ]);
  });

  it('returns nothing for junk instead of throwing', () => {
    expect(collectLeaves(null)).toEqual([]);
    expect(collectLeaves('nope')).toEqual([]);
    expect(collectLeaves({})).toEqual([]);
  });
});

describe('applyEdits', () => {
  it('changes the targeted leaf and nothing else', () => {
    const before = question();
    const leaves = collectLeaves(before);
    const { content, applied } = applyEdits(before, [
      { path: pathOf(leaves, '1(a)(i) · text'), value: 'State the force.' },
    ]);
    const after = content as any;
    expect(applied).toBe(1);
    expect(after.parts[0].subparts[0].content[0].html).toBe('State the force.');
    expect(after.stem[0].html).toBe('A skydiver falls.');
    expect(after.marks).toBe(3);
  });

  it('does not mutate the input', () => {
    const before = question();
    const leaves = collectLeaves(before);
    applyEdits(before, [{ path: pathOf(leaves, 'Stem · text'), value: 'changed' }]);
    expect(before.stem[0].html).toBe('A skydiver falls.');
  });

  it('ignores a value that did not change', () => {
    const before = question();
    const leaves = collectLeaves(before);
    const { applied } = applyEdits(before, [
      { path: pathOf(leaves, 'Stem · text'), value: 'A skydiver falls.' },
    ]);
    expect(applied).toBe(0);
  });

  it('writes a cleared guidance back as null, not empty string', () => {
    const before = question();
    (before.answer.markScheme[0] as { guidance: string | null }).guidance = 'was set';
    const leaves = collectLeaves(before);
    const { content } = applyEdits(before, [
      { path: pathOf(leaves, '1(a) · guidance'), value: '   ' },
    ]);
    expect((content as any).answer.markScheme[0].guidance).toBeNull();
  });

  it('rejects a path that is not an editable leaf', () => {
    for (const path of [['marks'], ['kind'], ['parts', 0, 'marks'], ['stem', 1, 'src'], ['stem', 2, 'html']]) {
      expect(() => applyEdits(question(), [{ path, value: 'x' }])).toThrow(EditError);
    }
  });

  it('cannot create structure by inventing a path', () => {
    // The whole point: a path is only accepted if it ALREADY resolves to a
    // leaf in the stored document, so this cannot grow the tree.
    expect(() => applyEdits(question(), [{ path: ['parts', 9, 'content', 0, 'html'], value: 'x' }]))
      .toThrow(EditError);
    expect(() => applyEdits(question(), [{ path: ['evil'], value: 'x' }])).toThrow(EditError);
  });

  it('rejects prototype-pollution shaped paths', () => {
    expect(() => applyEdits(question(), [{ path: ['__proto__', 'polluted'], value: 'x' }]))
      .toThrow(EditError);
    expect(() => applyEdits(question(), [{ path: ['constructor', 'prototype', 'x'], value: 'y' }]))
      .toThrow(EditError);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('rejects non-string values and malformed edits', () => {
    const leaves = collectLeaves(question());
    const good = pathOf(leaves, 'Stem · text');
    expect(() => applyEdits(question(), [{ path: good, value: 42 }])).toThrow(EditError);
    expect(() => applyEdits(question(), [{ path: good }])).toThrow(EditError);
    expect(() => applyEdits(question(), [{ value: 'x' }])).toThrow(EditError);
    expect(() => applyEdits(question(), 'nope')).toThrow(EditError);
    expect(() => applyEdits(question(), [])).toThrow(EditError);
  });

  it('rejects an over-long value', () => {
    const leaves = collectLeaves(question());
    expect(() =>
      applyEdits(question(), [{ path: pathOf(leaves, 'Stem · text'), value: 'x'.repeat(20001) }]),
    ).toThrow(EditError);
  });

  it('applies several edits at once', () => {
    const before = question();
    const leaves = collectLeaves(before);
    const { content, applied } = applyEdits(before, [
      { path: pathOf(leaves, 'Stem · text'), value: 'One.' },
      { path: pathOf(leaves, '1(a) · mark scheme'), value: 'air resistance' },
      { path: pathOf(leaves, '1(a) · code'), value: 'M1' },
    ]);
    const after = content as any;
    expect(applied).toBe(3);
    expect(after.stem[0].html).toBe('One.');
    expect(after.answer.markScheme[0].answer).toBe('air resistance');
    expect(after.answer.markScheme[0].code).toBe('M1');
  });
});
