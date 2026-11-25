/**
 * Tests for the renderer in lib/render/.
 *
 * It lives in the Next app rather than in backend/, but it is the other half
 * of one pipeline: the parser here emits JSON, the renderer there turns it
 * into HTML. Testing them together is the only way to catch a change on one
 * side that breaks the other, so the import reaches across.
 *
 * The renderer used to be plain <script>-tag JS evaluated in a vm sandbox.
 * It is TypeScript modules now, so it is imported directly.
 */

import { describe, expect, it } from 'vitest';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../../src/latex/index.js';
import type { ParsedPaper, Question } from '../../src/latex/types.js';
import {
  renderQuestionHtml,
  renderWorkedSolution,
  toMarkSchemeRows,
} from '../../../lib/render/index.js';
import { renderBlocks } from '../../../lib/render/blocks.js';

// Small papers written here rather than real ones: no question paper lives in
// the repo, and these hold one of each thing the renderer has to draw.
const PHYSICS_QP = String.raw`\begin{document}
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{6}
Fig. 1.1 shows a skydiver.

\qfig[0.42\linewidth]{5054_21_M_J_25_fig1.png}{Fig. 1.1}

\begin{parts}
  \item Sketch the speed--time graph. \markright{[2]}
  \item Explain how the graph shows that $a = \dfrac{v}{t}$ decreases. \Alines{3}{[1]}
  \item There is a resultant force downwards.
  \begin{subparts}
    \item State the name of the other vertical force. \Alines{1}{[1]}
    \item Explain why the resultant force becomes zero. \Alines{4}{[1]}
  \end{subparts}
  \item State the final acceleration. \Alines{1}{[1]}
\end{parts}
\total
\end{document}`;

const PHYSICS_QA = String.raw`\begin{document}
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{6}
\begin{mstab}{q1color}
 & curve upwards labelled A & B1 \\ \cline{2-3}
\multirow{-2}{1.9cm}{1(a)} & horizontal line labelled B & B1 \\ \hline
1(b) & gradient decreases \newline or \newline speed increase less at later times & B1 \\ \hline
1(c)(i) & air resistance & B1 \\ \hline
1(c)(ii) & forces balance & B1 \\ \hline
1(d) & zero & B1 \\ \hline
\end{mstab}
\begin{ansbox}{q1color}
(a) Speed--Time Graph\\[4pt]
Draw a curve that starts at the origin.

(b) Gradient\\[4pt]
The gradient falls.
\end{ansbox}
\end{document}`;

const choices = (n: number) => String.raw`
\examq{5054/11/M/J/25}{${n}}{Momentum (Dynamics)}{1}
Which is a unit for momentum?
\begin{choices}
  \item kg
  \item N\,s
  \item N\,m
  \item J
\end{choices}`;
const MCQ_QP = String.raw`\begin{document}${[1, 2, 3].map(choices).join('')}
\examq{5054/11/M/J/25}{4}{Momentum (Dynamics)}{1}
Which graph is correct?
\qfig[0.5\linewidth]{fig4.png}{}
\end{document}`;
const MCQ_QA = String.raw`\begin{document}
\examq{5054/11/M/J/25}{1}{Momentum (Dynamics)}{1}
\begin{ansbox}{q1color}
\textbf{Answer: B} Momentum is force times time.
\end{ansbox}
\end{document}`;

const physics: ParsedPaper = mergePaper(parseQuestionPaper(PHYSICS_QP), parseAnswerPaper(PHYSICS_QA));
const mcq: ParsedPaper = mergePaper(parseQuestionPaper(MCQ_QP), parseAnswerPaper(MCQ_QA));

const q1 = () => physics.questions[0];
/* eslint-disable @typescript-eslint/no-explicit-any */
const renderer = (opts: { showGuidance?: boolean; showAlternatives?: boolean } = {}) => ({
  toQuestionHtml: (q: any) => renderQuestionHtml(q),
  toMarkSchemeRows: (q: any) => toMarkSchemeRows(q, opts),
  toWorkedSolutionHtml: (q: any) => renderWorkedSolution(q),
});

describe('toQuestionHtml', () => {
  it('emits the part/subpart classes the stylesheet already targets', () => {
    const html = renderer().toQuestionHtml(q1());
    // css/style.css styles .qpart, .qpart--sub and .pmark — changing these
    // would silently restyle the page. Matched on the class attribute only:
    // each part also carries an inline style="--paccent:#..." for its accent
    // colour, and pinning the whole tag made this test fail on any change to
    // that attribute rather than to the classes it is actually guarding.
    expect(html).toMatch(/<div class="qpart"[ >]/);
    expect(html).toMatch(/<div class="qpart qpart--sub"[ >]/);
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
    // Students see plain wording; the file name is only a tooltip for admins.
    expect(html).toContain('Figure not available');
    expect(html).toContain('title="5054_21_M_J_25_fig1.png"');
    expect(html).not.toContain('Image not uploaded');
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
    const badges = partC.match(/class="marktag"/g) || [];
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
      .find((r: { part: string }) => r.part === '1(b)')!;
    expect(row.answer).not.toContain('ms-alternatives');
  });

  it('can still show alternatives when a view opts in', () => {
    const row = renderer({ showAlternatives: true })
      .toMarkSchemeRows(q1())
      .find((r: { part: string }) => r.part === '1(b)')!;
    expect(row.answer).toContain('ms-alternatives');
  });
});

describe('toWorkedSolutionHtml', () => {
  it('labels each segment with its ref', () => {
    const html = renderer().toWorkedSolutionHtml(q1());
    expect(html).toContain('1(a)');
    expect(html).toContain('worked-solution-part');
  });

  it('leads with the letter for a multiple-choice question', () => {
    const q = mcq.questions.find((x: Question) => x.answer?.correct)!;
    expect(renderer().toWorkedSolutionHtml(q)).toContain('Answer: ' + q.answer!.correct);
  });

  it('says so when there is no worked solution', () => {
    expect(renderer().toWorkedSolutionHtml({ answer: null } as never)).toContain('No worked solution');
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
        expect(r.toWorkedSolutionHtml(q), `Q${q.number} worked solution`).not.toContain('undefined');
      }
    }
  });
});

describe('figure labels and solution structure', () => {
  const figure = { type: 'figure', file: 'a.png', src: 'https://x/a.png', caption: '' } as never;

  it('folds a following "Fig. x.y" paragraph into the figure caption', () => {
    const html = renderBlocks([figure, { type: 'text', html: '<strong>Fig. 2.2</strong>' }] as never);
    expect(html).toContain('<figcaption><strong>Fig. 2.2</strong></figcaption>');
    expect(html).not.toContain('<p><strong>Fig. 2.2</strong></p>');
  });

  it('centres a lone figure label and leaves ordinary text as a paragraph', () => {
    const html = renderBlocks([
      { type: 'text', html: 'Fig. 1.1 (not to scale)' },
      { type: 'text', html: 'Fig. 1.1 shows a skydiver.' },
    ] as never);
    expect(html).toContain('<p class="fig-label">Fig. 1.1 (not to scale)</p>');
    expect(html).toContain('<p>Fig. 1.1 shows a skydiver.</p>');
  });

  it('groups solution segments by part and splits paragraphs', () => {
    const html = renderWorkedSolution({
      answer: {
        workedSolution: [
          { ref: '3(a)(i)', html: 'one\n\ntwo' },
          { ref: '3(a)(i)', html: 'three' },
          { ref: '3(b)', html: 'four' },
        ],
      },
    } as never);
    expect(html.match(/worked-solution-part"/g)).toHaveLength(2);
    expect(html).toContain('<span class="ws-ref">(a)(i)</span>');
    expect(html).toContain('<p>one</p><p>two</p><p>three</p>');
  });
});

describe('figure alt text and solution casing', () => {
  it('keeps markup out of a figure\'s alt text', () => {
    const html = renderBlocks([
      { type: 'figure', file: 'a.png', src: 'https://x/a.png', caption: '' },
      { type: 'text', html: '<strong>Fig. 1.1</strong>' },
    ] as never);
    expect(html).toContain('alt="Fig. 1.1"');
  });

  it('raises the first letter for an ordinary word but not for a unit or symbol', () => {
    const word = renderWorkedSolution({ answer: { workedSolution: [{ ref: '1(a)', html: 'the force is 6 N' }] } } as never);
    const unit = renderWorkedSolution({ answer: { workedSolution: [{ ref: '1(a)', html: 'mg is the weight' }] } } as never);
    const symbol = renderWorkedSolution({ answer: { workedSolution: [{ ref: '1(a)', html: 'g is the field strength' }] } } as never);
    expect(word).toContain('ws-body ws-cap');
    expect(unit).not.toContain('ws-cap');
    expect(symbol).not.toContain('ws-cap');
  });
});
