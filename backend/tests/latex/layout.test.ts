import { describe, expect, it } from 'vitest';
import { isSerious, parseQuestionPaper } from '../../src/latex/index.js';
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
    expect(paper.warnings.some(isSerious)).toBe(false);
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

describe('the page-layout reader: typed maths', () => {
  it('keeps $...$ exactly as written and does not call its commands unknown', () => {
    const maths = String.raw`$y = \dfrac{2x - 5}{\sqrt{x}} \leq \begin{pmatrix}n\\1\end{pmatrix}$`;
    const q = parseLayoutQuestion(`\\row{26.0}{94.9}{A curve has equation\\kern2.24bp ${maths}.}`, 1);
    expect(q.unknown).toEqual([]);
    expect(text(q.stem)).toEqual([`A curve has equation ${maths}.`]);
  });
});

describe('the page-layout reader: typesetting that must not print', () => {
  const stemOf = (line: string) => text(parseLayoutQuestion(String.raw`\row{0}{72}{${line}}`, 1).stem)[0];

  it.each([
    ['end-of-line spacing', String.raw`better than oil.{\parfillskip0pt\par}`, 'better than oil.'],
    ['stretch after a word', String.raw`$t$ s after\nobreak\hskip0pt plus-1fil\null`, '$t$ s after'],
    ['word spacing', String.raw`{\advance\spaceskip-0.11bp\advance\xspaceskip-0.11bp\textls[-10]{Take it.}}`, 'Take it.'],
    ['a sized bullet', String.raw`\lab{22.6}{\smash{\fontsize{12.00bp}{12.00bp}\selectfont •}}The student`, '• The student'],
    ['a list label', String.raw`\plab{21.3}{P}the force on the Moon`, 'P the force on the Moon'],
    ['a list bullet', String.raw`\plab{21.3}{\swbul{}}in space`, '• in space'],
    ['a tick', String.raw`a tick ({\usefont{U}{pzd}{m}{n}\char"33})`, 'a tick (✓)'],
    [
      'a slanted symbol',
      String.raw`density \mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{$\rho$}\pdfrestore\phantom{$\rho$}}.`,
      String.raw`density $\rho$.`,
    ],
    ['answer dots', String.raw`measures {\font\swell=uhvr8r at 11.00bp\swell\char"85}`, 'measures …'],
  ])('%s', (_, source, expected) => {
    expect(stemOf(source)).toBe(expected);
  });

  it('reads a fraction stacked inside a line', () => {
    const line = String.raw`$R$ = \rlap{\kern0.00bp\raisebox{5.80bp}[0pt][0pt]{$V$}}\rlap{\kern1.35bp\raisebox{-7.20bp}[0pt][0pt]{\makebox[4.63bp][c]{\swf{ptm}{12.08}{I}}}}\rlap{\kern0.00bp\raisebox{3.08bp}[0pt][0pt]{\rule{7.34bp}{0.50bp}}}\kern7.34bp`;
    expect(stemOf(line)).toBe(String.raw`$R$ = $\dfrac{V}{I}$`);
  });

  it('reads the lines of a multi-line block in order', () => {
    const { stem } = parseLayoutQuestion(
      String.raw`\freerow{0}{%
  \at{70}{0.00}{The speed is $v$}%
  \at{150}{0.00}{at first and then}%
  \at{70}{-13.00}{the object slows down}%
  \at{70}{-26.00}{and comes to rest.}}`,
      1,
    );
    expect(text(stem)).toEqual(['The speed is $v$ at first and then the object slows down and comes to rest.']);
  });
});

describe('the page-layout reader: options set as a column', () => {
  const options = (body: string) =>
    parseLayoutQuestion(String.raw`\mcq{0}{\textbf{2 }}{Which?}` + body, 2).options?.items.map((o) => `${o.label} ${o.content}`);

  it('gives each option the line it sits on', () => {
    expect(
      options(String.raw`\freerow{24.3}{%
  \at{70.86}{-7.04}{\textbf{A}}%
  \at{92.09}{-7.04}{speed $= \dfrac{d}{t}$}%
  \at{70.86}{-41.06}{\textbf{B}}%
  \at{92.09}{-41.06}{density $= \dfrac{m}{V}$}}
\choice{38}{\textbf{C }}{volume}
\freerow{22.4}{%
  \at{70.92}{-7.00}{\textbf{D}}%
  \at{92.09}{-7.00}{mass}}`),
    ).toEqual([String.raw`A speed $= \dfrac{d}{t}$`, String.raw`B density $= \dfrac{m}{V}$`, 'C volume', 'D mass']);
  });

  it('rebuilds fractions drawn piece by piece, with their small numbers', () => {
    expect(
      options(String.raw`\freerow{24.7}{%
  \at{95.41}{-0.02}{{\itshape p}}%
  \at{101.99}{-1.12}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{70.90}{-7.53}{\textbf{A}}%
  \at{93.57}{-16.91}{{\itshape V}}%
  \at{102.16}{-18.05}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{94}{-40.98}{height × weight}%
  \at{70.90}{-48.53}{\textbf{B}}%
  \at{100}{-57.91}{time}%
  \ruleat{93}{108}{-4.7}{0.5}%
  \ruleat{93}{168}{-45.7}{0.5}}`),
    ).toEqual([
      String.raw`A $\dfrac{p_{1}}{V_{1}}$`,
      String.raw`B $\dfrac{\mathrm{height}\,×\,\mathrm{weight}}{\mathrm{time}}$`,
    ]);
  });

  it('puts a drawn minus in the gap left for it, and reports one with no gap', () => {
    const body = (kern: string) => String.raw`\freerow{0}{%
  \at{220.3}{-0.04}{\_}%
  \at{94.4}{-4.54}{full${kern} empty}%
  \at{70.9}{-4.54}{\textbf{A}}}`;
    expect(options(body(String.raw`\kern11.04bp`))).toEqual(['A full − empty']);
    expect(parseLayoutQuestion(body(''), 1).unreadable).toBe(true);
  });

  it('does not take a bold letter in a structured question for an option', () => {
    const q = parseLayoutQuestion(String.raw`\freerow{0}{\at{70}{0}{\textbf{A}}\at{80}{0}{is a point.}}`, 1);
    expect(q.options).toBeNull();
  });
});
