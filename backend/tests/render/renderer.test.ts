/**
 * Tests for the browser renderer in js/render/.
 *
 * Those files are plain JS loaded via <script> tags (the frontend has no
 * build step), so they are evaluated here in a vm context with a fake
 * `window` — the same trick the old tests/latex-parser.test.js used. This
 * keeps the renderer under the same `npm test` as the parser despite living
 * outside backend/ and being untyped.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../../src/latex/index.js';
import type { ParsedPaper, Question } from '../../src/latex/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..');

// Load order matters — escape defines helpers the others use, and the
// facade composes them, so it must come last.
const FILES = [
  'escape.js',
  'block-renderer.js',
  'part-renderer.js',
  'options-renderer.js',
  'mark-scheme-renderer.js',
  'solution-renderer.js',
  'question-renderer.js',
];

/* eslint-disable @typescript-eslint/no-explicit-any */
let SWRender: any;
let physics: ParsedPaper;
let mcq: ParsedPaper;

function loadPaper(dir: string, qp: string, qa: string): ParsedPaper {
  const base = join(REPO, 'Updated Latex FIles For Web', dir);
  return mergePaper(
    parseQuestionPaper(readFileSync(join(base, qp), 'utf8')),
    parseAnswerPaper(readFileSync(join(base, qa), 'utf8')),
  );
}

beforeAll(() => {
  const sandbox: Record<string, unknown> = { window: {} };
  vm.createContext(sandbox);
  for (const file of FILES) {
    vm.runInContext(readFileSync(join(REPO, 'js', 'render', file), 'utf8'), sandbox, {
      filename: file,
    });
  }
  SWRender = (sandbox.window as any).SWRender;

  physics = loadPaper('Physics MJ25 21', 'Physics S25QP21.tex', 'Physics S25QA21.tex');
  mcq = loadPaper('Physics MJ25 11', 'Physics S25QP11.tex', 'Physics S25QA11.tex');
});

const q1 = () => physics.questions[0];
const renderer = (opts?: unknown) => new SWRender.QuestionRenderer(opts ?? {});

describe('the renderer loads as the browser would', () => {
  it('exposes every class on one namespace', () => {
    for (const name of [
      'BlockRenderer',
      'PartRenderer',
      'OptionsRenderer',
      'MarkSchemeRenderer',
      'SolutionRenderer',
      'QuestionRenderer',
    ]) {
      expect(typeof SWRender[name], name).toBe('function');
    }
  });
});

describe('toQuestionHtml', () => {
  it('emits the part/subpart classes the stylesheet already targets', () => {
    const html = renderer().toQuestionHtml(q1());
    // css/style.css styles .qpart, .qpart--sub and .pmark — changing these
    // would silently restyle the page.
    expect(html).toContain('<div class="qpart">');
    expect(html).toContain('<div class="qpart qpart--sub">');
    expect(html).toContain('<span class="pmark">(a)</span>');
    expect(html).toContain('<span class="pmark">(i)</span>');
  });

  it('nests subparts inside their parent, not beside it', () => {
    const html = renderer().toQuestionHtml(q1());
    const parentStart = html.indexOf('<span class="pmark">(c)</span>');
    const subStart = html.indexOf('<span class="pmark">(i)</span>');
    const nextTopLevel = html.indexOf('<span class="pmark">(d)</span>');
    expect(parentStart).toBeGreaterThan(-1);
    expect(subStart).toBeGreaterThan(parentStart);
    expect(subStart).toBeLessThan(nextTopLevel);
  });

  it('marks a figure with no image so the stylesheet can dim it', () => {
    const html = renderer().toQuestionHtml(q1());
    expect(html).toContain('<figure class="qfig" data-missing="1"');
    expect(html).toContain('Image not uploaded: 5054_21_M_J_25_fig1.png');
  });

  it('leaves math untouched for KaTeX', () => {
    // Must pick a question whose STEM or PARTS carry math — plenty of
    // questions have math only in their mark scheme.
    const r = renderer();
    const withMath = physics.questions
      .map((q) => r.toQuestionHtml(q))
      .find((html: string) => /\$[^$]+\$/.test(html));
    expect(withMath, 'no question rendered any math').toBeDefined();
    // The raw delimiters must survive — KaTeX runs after insertion.
    expect(withMath).toMatch(/\$[^$]+\$/);
  });

  it('does not print a marks badge on a part that only groups subparts', () => {
    // 1(c) carries the sum of (i)+(ii); showing it too would double-count.
    const html = renderer().toQuestionHtml(q1());
    const partC = html.slice(html.indexOf('(c)</span>'), html.indexOf('(d)</span>'));
    const badges = partC.match(/class="markbadge"/g) || [];
    expect(badges).toHaveLength(2); // one per subpart, none for (c) itself
  });

  it('falls back to a message rather than empty markup', () => {
    expect(renderer().toQuestionHtml(null)).toContain('No question text');
  });
});

describe('toMarkSchemeRows', () => {
  it('produces the legacy row shape app.js already draws', () => {
    const rows = renderer().toMarkSchemeRows(q1());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['answer', 'isBanner', 'marks', 'part']);
      expect(typeof row.marks).toBe('string');
    }
  });

  it('keys each row to its generated part ref', () => {
    const refs = renderer().toMarkSchemeRows(q1()).map((r: { part: string }) => r.part);
    expect(refs).toContain('1(a)');
    expect(refs).toContain('1(c)(ii)');
  });

  it('does not duplicate alternatives that the answer cell already contains', () => {
    // `answer` is the whole authored cell ("X or Y") and `alternatives` is a
    // split of it, so rendering both printed Y twice.
    const row = renderer()
      .toMarkSchemeRows(q1())
      .find((r: { part: string }) => r.part === '1(b)');
    expect(row.answer).not.toContain('ms-alternatives');
  });

  it('can still show alternatives when a view opts in', () => {
    const row = renderer({ showAlternatives: true })
      .toMarkSchemeRows(q1())
      .find((r: { part: string }) => r.part === '1(b)');
    expect(row.answer).toContain('ms-alternatives');
  });
});

describe('toExemplarHtml', () => {
  it('labels each segment with its ref', () => {
    const html = renderer().toExemplarHtml(q1());
    expect(html).toContain('1(a)');
    expect(html).toContain('exemplar-part');
  });

  it('leads with the letter for a multiple-choice question', () => {
    const q = mcq.questions.find((x: Question) => x.answer?.correct)!;
    expect(renderer().toExemplarHtml(q)).toContain('Answer: ' + q.answer!.correct);
  });

  it('says so when there is no exemplar', () => {
    expect(renderer().toExemplarHtml({ answer: null } as never)).toContain('No exemplar');
  });
});

describe('multiple-choice options', () => {
  it('renders lettered options', () => {
    const q = mcq.questions.find((x: Question) => x.options?.source === 'choices')!;
    const html = renderer().toQuestionHtml(q);
    expect(html).toContain('qpart--choice');
    expect(html).toContain('<span class="pmark">A</span>');
  });

  it('explains rather than showing an empty list when options live in the figure', () => {
    const q = mcq.questions.find((x: Question) => x.options?.source === 'figure')!;
    const html = renderer().toQuestionHtml(q);
    expect(html).toContain('part of the figure');
    expect(html).not.toContain('mcq-options');
  });
});

describe('every question in both papers renders', () => {
  it('produces non-empty markup with no undefined leaking in', () => {
    const r = renderer();
    for (const paper of [physics, mcq]) {
      for (const q of paper.questions) {
        const html = r.toQuestionHtml(q);
        expect(html.length, `Q${q.number} empty`).toBeGreaterThan(0);
        expect(html, `Q${q.number} leaked undefined`).not.toContain('undefined');
        expect(r.toExemplarHtml(q), `Q${q.number} exemplar`).not.toContain('undefined');
      }
    }
  });
});
