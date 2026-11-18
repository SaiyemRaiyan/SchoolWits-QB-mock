import { describe, expect, it } from 'vitest';
import { isBlocking, parseQuestionPaper } from '../../src/latex/index.js';
import { parseLayoutQuestion } from '../../src/latex/layout.js';

const text = (blocks: { type: string; html?: string }[]) =>
  blocks.filter((b) => b.type === 'text').map((b) => b.html);

describe('the page-layout reader: multiple choice', () => {
  const MCQ = String.raw`\begin{document}
\examq{5054/11/M/J/16}{2}{Physical Quantities and Measurements}{1}
\mcq{33.04}{\textbf{2 }}{Which set of quantities are all vectors?}
\choice{23.7}{\textbf{A }}{acceleration, displacement, velocity}
\choice{21.6}{\textbf{B }}{chemical energy, mass, power}
\choice{21.6}{\textbf{C }}{extension, force, gravitational potential energy}
\choice{21.7}{\textbf{D }}{weight, kinetic energy, work}
\examq{5054/11/M/J/16}{5}{Forces or Dynamics}{1}
\mcq{38.0}{\textbf{5 }}{A man pulls a sledge with a horizontal force of 60\,N.\linebreak}
A constant force of friction of 20\,N acts on the sledge.
\stem{25.3}{What is the acceleration of the sledge?}
\optrow{23.7}{0.63\,m\,/\,s\pow{2}}{1.6\,m\,/\,s\pow{2}}{2.4\,m\,/\,s\pow{2}}{3.2\,m\,/\,s\pow{2}}
\end{document}`;
  const paper = parseQuestionPaper(MCQ);

  it('is accepted, with the measurements gone', () => {
    expect(paper.warnings.some(isBlocking)).toBe(false);
    expect(text(paper.questions[0].stem)).toEqual(['Which set of quantities are all vectors?']);
  });

  it('reads \\choice lines as options A to D', () => {
    const { options, kind } = paper.questions[0];
    expect(kind).toBe('mcq');
    expect(options?.items.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(options?.items[1].content).toBe('chemical energy, mass, power');
  });

  it('joins a wrapped line back onto its paragraph', () => {
    expect(text(paper.questions[1].stem)[0]).toBe(
      'A man pulls a sledge with a horizontal force of 60 N. A constant force of friction of 20 N acts on the sledge.',
    );
  });

  it('reads an \\optrow as four options', () => {
    expect(paper.questions[1].options?.items[3]).toEqual({ label: 'D', content: '3.2 m / s<sup>2</sup>' });
  });
});

describe('the page-layout reader: structured questions', () => {
  const BODY = String.raw`
\row{0.6}{72.3}{\lab{22.7}{\textbf{2 }}A student hangs masses from a spring and determines the e\kern-0.33bp xtension.}
\qfig{4}{171.66bp 549.61bp 166.20bp 99.83bp}{}{13.6}{0}{171.66}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}The student plots a graph.}
\partbreak
\row{0.6}{117.6}{\lab{21.7}{\textbf{(i) }}State the name of point P\kern-1.98bp .}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[1]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{24.8}{\textbf{(ii) }}Determine the mass X.}
\dotline{91.0}{311.5}{mass =}{[2]}{545.6}
\partbreak
\row{52.0}{94.9}{\lab{22.6}{\textbf{(b)}}Explain the difference.\swmark{[1]}}
\dotline{26.0}{94.9}{}{}{545.0}
\dotline{26.0}{94.9}{}{[2]}{545.6}`;
  const q = parseLayoutQuestion(BODY, 2);

  it('drops the question number and removes kerns from inside words', () => {
    expect(text(q.stem)).toEqual(['A student hangs masses from a spring and determines the extension.']);
  });

  it('reads the written labels into parts and subparts', () => {
    expect(q.parts.map((p) => p.ref)).toEqual(['2(a)', '2(b)']);
    expect(q.parts[0].subparts.map((p) => p.ref)).toEqual(['2(a)(i)', '2(a)(ii)']);
  });

  it('takes marks from answer lines and from \\swmark', () => {
    const [a, b] = q.parts;
    expect(a.subparts.map((p) => p.marks)).toEqual([1, 2]);
    expect(a.marks).toBe(3);
    expect(b.marks).toBe(3);
  });

  it('keeps the kind of answer space', () => {
    expect(q.parts[0].subparts[0].answerSpace).toEqual({ kind: 'lines', lines: 1 });
    expect(q.parts[0].subparts[1].answerSpace).toEqual({ kind: 'value', label: 'mass =', unit: '' });
    expect(q.parts[1].answerSpace).toEqual({ kind: 'lines', lines: 2 });
  });

  it('turns \\qfig into a clip of the source PDF', () => {
    expect(q.stem.find((b) => b.type === 'figure')).toMatchObject({
      file: 'p4-171_66-549_61-166_20-99_83.png',
      clip: { page: 4, left: 171.66, bottom: 549.61, right: 166.2, top: 99.83 },
    });
  });
});

describe('the page-layout reader: positioned lines', () => {
  it('rebuilds an option row of fractions and flags it for review', () => {
    const q = parseLayoutQuestion(
      String.raw`\mcq{38.0}{\textbf{11}}{What is the pressure?}
\freerow{24.7}{%
  \at{193.15}{-0.15}{{\itshape W}}%
  \at{70.89}{-7.60}{\textbf{A}}%
  \at{92.10}{-7.60}{{\itshape W\,A}}%
  \at{170.11}{-7.60}{\textbf{B}}%
  \at{196.30}{-16.84}{{\itshape A}}%
  \ruleat{193.35}{205.99}{-4.60}{0.50}%
  \swdepth{19.21}}`,
      11,
    );
    expect(q.positioned).toBe(true);
    expect(q.unreadable).toBe(false);
    expect(q.options?.items).toEqual([
      { label: 'A', content: '<em>W A</em>' },
      { label: 'B', content: '$\\dfrac{W}{A}$' },
    ]);
  });

  it('treats a picture set in a line as a figure, not as maths', () => {
    const q = parseLayoutQuestion(
      String.raw`\stem{25.3}{One compass appears like this\kern2.24bp \raisebox{-7.81bp}[0pt][0pt]{\swclip{9}{223.55bp 550.19bp 350.33bp 269.25bp}}\kern4.12bp .}`,
      23,
    );
    expect(q.unreadable).toBe(false);
    expect(q.stem.some((b) => b.type === 'figure' && b.clip?.page === 9)).toBe(true);
  });

  it('reports a command it does not know rather than guessing', () => {
    const q = parseLayoutQuestion(String.raw`\row{26.0}{94.9}{Some \mystery{12.5} text.}`, 1);
    expect(q.unknown).toEqual(['mystery']);
  });
});
