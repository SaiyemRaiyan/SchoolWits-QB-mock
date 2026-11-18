/**
 * End-to-end parse of the six real papers.
 *
 * These read the .tex files IN PLACE from `Updated Latex FIles For Web/`
 * rather than from a committed copy, so the suite breaks loudly if the
 * source papers change — which is what we want while the format is still
 * settling.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../../src/latex/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const PAPERS_DIR = join(here, '..', '..', '..', 'Updated Latex FIles For Web');

interface PaperFixture {
  dir: string;
  qp: string;
  qa: string;
  /** Expected question count, from the audit in templates/README.md. */
  questions: number;
  paperId: string;
  mstabColumns: 3 | 4;
}

const PAPERS: PaperFixture[] = [
  {
    dir: 'Physics MJ25 21',
    qp: 'Physics S25QP21.tex',
    qa: 'Physics S25QA21.tex',
    questions: 9,
    paperId: '5054/21/M/J/25',
    mstabColumns: 3,
  },
  {
    dir: 'Physics MJ25 11',
    qp: 'Physics S25QP11.tex',
    qa: 'Physics S25QA11.tex',
    questions: 40,
    paperId: '5054/11/M/J/25',
    mstabColumns: 3,
  },
  {
    dir: 'Add Maths MJ25 11',
    qp: 'Add Maths S25QP11.tex',
    qa: 'Add Maths S25QA11 .tex',
    questions: 12,
    paperId: '4037/11/M/J/25',
    mstabColumns: 4,
  },
  {
    dir: 'Add Maths MJ25 21',
    qp: 'Add Maths S25QP21.tex',
    qa: 'Add Maths S25QA21.tex',
    questions: 11,
    paperId: '4037/21/M/J/25',
    mstabColumns: 4,
  },
  {
    dir: 'Maths D MJ25 12',
    qp: 'Maths D S25QP12.tex',
    qa: 'Maths D S25QA12.tex',
    questions: 23,
    paperId: '4024/12/M/J/25',
    mstabColumns: 4,
  },
  {
    dir: 'Maths D MJ25 22',
    qp: 'Maths D S25QP22.tex',
    qa: 'Maths D S25QA22.tex',
    questions: 24,
    paperId: '4024/22/M/J/25',
    mstabColumns: 4,
  },
];

const read = (dir: string, file: string) => readFileSync(join(PAPERS_DIR, dir, file), 'utf8');

describe.each(PAPERS)('$dir', (fixture) => {
  const qp = parseQuestionPaper(read(fixture.dir, fixture.qp));
  const qa = parseAnswerPaper(read(fixture.dir, fixture.qa));
  const merged = mergePaper(qp, qa);

  it('reads the paper id from the first \\examq', () => {
    expect(qp.paper?.paperId).toBe(fixture.paperId);
  });

  it('finds every question', () => {
    expect(qp.questions).toHaveLength(fixture.questions);
  });

  it('numbers questions 1..n with no gaps', () => {
    expect(qp.questions.map((q) => q.number)).toEqual(
      Array.from({ length: fixture.questions }, (_, i) => i + 1),
    );
  });

  it('gives every question at least one topic and a positive mark total', () => {
    for (const q of qp.questions) {
      expect(q.topics.length, `Q${q.number} topics`).toBeGreaterThan(0);
      expect(q.marks, `Q${q.number} marks`).toBeGreaterThan(0);
    }
  });

  it('gives every question some content', () => {
    for (const q of qp.questions) {
      const hasContent = q.stem.length > 0 || q.parts.length > 0;
      expect(hasContent, `Q${q.number} has no stem and no parts`).toBe(true);
    }
  });

  it('matches every question to an answer', () => {
    const unmatched = merged.warnings.filter((w) => w.code === 'unmatched-question');
    expect(unmatched.map((w) => w.message)).toEqual([]);
  });

  it('attaches every mark-scheme row to a part', () => {
    // The join is the whole point of the structured shape: a row with no
    // ref is a row the UI cannot show against its question part. Two label
    // conventions and math containing `\\` all break this if mishandled.
    const orphans: string[] = [];
    for (const q of merged.questions) {
      for (const row of q.answer?.markScheme ?? []) {
        if (!row.ref) orphans.push(`Q${q.number}: ${row.answer.slice(0, 40)}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('accounts for every mark the question header claims', () => {
    const mismatches = merged.warnings.filter((w) => w.code === 'marks-mismatch');
    expect(mismatches.map((w) => w.message)).toEqual([]);
  });

  it('generates part refs that are unique and well formed', () => {
    for (const q of qp.questions) {
      const refs: string[] = [];
      for (const part of q.parts) {
        refs.push(part.ref);
        for (const sub of part.subparts) refs.push(sub.ref);
      }
      expect(new Set(refs).size, `Q${q.number} duplicate refs`).toBe(refs.length);
      for (const ref of refs) {
        expect(ref, `Q${q.number} malformed ref`).toMatch(/^\d+(\([a-z]+\)){1,2}$/);
      }
    }
  });
});

describe('Physics MJ25 21 — the structured reference paper', () => {
  const fixture = PAPERS[0];
  const qp = parseQuestionPaper(read(fixture.dir, fixture.qp));
  const qa = parseAnswerPaper(read(fixture.dir, fixture.qa));
  const merged = mergePaper(qp, qa);
  const q1 = merged.questions[0];

  it('splits the two topics of Q1', () => {
    expect(q1.topics).toEqual(['Motion or Kinematics', 'Forces or Dynamics']);
    expect(q1.topic).toBe('Motion or Kinematics · Forces or Dynamics');
  });

  it('builds Q1 as four parts with two subparts under (c)', () => {
    expect(q1.parts.map((p) => p.ref)).toEqual(['1(a)', '1(b)', '1(c)', '1(d)']);
    expect(q1.parts[2].subparts.map((p) => p.ref)).toEqual(['1(c)(i)', '1(c)(ii)']);
  });

  it('keeps the stem figure with its caption', () => {
    const fig = q1.stem.find((b) => b.type === 'figure');
    expect(fig).toBeDefined();
    expect(fig).toMatchObject({ file: '5054_21_M_J_25_fig1.png', caption: 'Fig. 1.1' });
  });

  it('leaves src null when no image map is supplied', () => {
    const fig = q1.stem.find((b) => b.type === 'figure');
    expect(fig && 'src' in fig ? fig.src : undefined).toBeNull();
  });

  it('attaches a mark scheme keyed to the generated refs', () => {
    const refs = new Set(q1.answer?.markScheme.map((r) => r.ref));
    expect(refs.has('1(a)')).toBe(true);
    expect(refs.has('1(c)(ii)')).toBe(true);
  });

  it('attaches a worked solution', () => {
    expect(q1.answer?.workedSolution.length).toBeGreaterThan(0);
  });
});

describe('Maths D MJ25 22 — a structured paper containing 1-mark questions', () => {
  const fixture = PAPERS[5];
  const qp = parseQuestionPaper(read(fixture.dir, fixture.qp));

  it('does not mistake a 1-mark diagram question for multiple choice', () => {
    // Q1 and Q5 are one mark, have no parts and carry a figure — the same
    // silhouette as a figure-only MCQ. Only the paper as a whole
    // distinguishes them, which is why classification is a paper-level call.
    expect(qp.questions.every((q) => q.kind === 'structured')).toBe(true);
  });

  it('raises no MCQ warnings on a non-MCQ paper', () => {
    expect(qp.warnings.filter((w) => w.code === 'mcq-options-unparseable')).toEqual([]);
  });
});

describe('Physics MJ25 11 — the MCQ paper', () => {
  const fixture = PAPERS[1];
  const qp = parseQuestionPaper(read(fixture.dir, fixture.qp));

  it('classifies every question as MCQ', () => {
    expect(qp.questions.every((q) => q.kind === 'mcq')).toBe(true);
  });

  it('records which encoding each question used', () => {
    const counts = qp.questions.reduce<Record<string, number>>((acc, q) => {
      const key = q.options?.source ?? 'none';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    // Every question must resolve to one of the four known encodings.
    expect(counts.none ?? 0).toBe(0);
    expect(Object.keys(counts).sort()).toEqual(
      expect.arrayContaining(['choices', 'figure']),
    );
  });

  it('warns about the questions whose options exist only inside the figure', () => {
    const warned = qp.warnings
      .filter((w) => w.code === 'mcq-options-unparseable')
      .map((w) => w.questionNumber);
    // These five are unrecoverable without re-authoring the source.
    expect(warned).toEqual([5, 6, 12, 19, 23]);
  });

  it('extracts four options wherever the choices environment was used', () => {
    const viaChoices = qp.questions.filter((q) => q.options?.source === 'choices');
    expect(viaChoices.length).toBeGreaterThan(10);
    for (const q of viaChoices) {
      expect(q.options?.items, `Q${q.number}`).toHaveLength(4);
    }
  });
});
