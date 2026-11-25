/**
 * The extractor as a whole: which class reads a paper, what it returns, and
 * how it behaves with commands and papers nobody has seen before.
 */

import { describe, expect, it } from 'vitest';
import { createExtractor, extractPaper } from '../../src/extract/index.js';
import * as api from '../../src/extract/index.js';
import { parseQuestionPaper } from '../../src/latex/index.js';
import { asQuestion, canon, content, correct, everything, options, paperOf, part, passesOf, question, stem, texOf } from './helpers.js';
import { CHEMISTRY_MCQ, MATHS, PHYSICS, PHYSICS_MCQ } from './preambles.js';

// 5070/11/M/J/16 Q13, page 5
const CHLORINE = String.raw`\examq{5070/11/M/J/16}{13}{Atomic Structure \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{1}
\mcq{38.0}{\textbf{13}}{Two isotopes of chlorine are $^{35}$C\swcut{3.09}{2.64}{5}{227.17bp 602.06bp 364.74bp 227.84bp} and $^{37}$C\swcut{3.09}{2.64}{5}{270.42bp 602.06bp 321.48bp 227.84bp}\,.}
\stem{25.5}{Using these isotopes, how many different relative molecular masses are possible for the\linebreak}
compound with molecular formula C$_{2}$H$_{3}$C\swcut{3.09}{2.64}{5}{269.97bp 563.85bp 321.94bp 266.05bp}\,$_{3}$?
\optrow{23.9}{2}{3}{4}{5}`;
// 5054/11/M/J/19 Q5, page 3
const FORCES = String.raw`\examq{5054/11/M/J/19}{5}{Forces or Dynamics}{1}
\mcq{37.9}{\textbf{5 }}{Four of the gravitational forces that act between bodies in the Solar System are listed below.}
\prow{25.3}{134.7}{\plab{21.3}{P}the force on the Moon due to the Earth}
\prow{21.6}{134.7}{\plab{21.3}{Q}the force on the Earth due to the Sun}
\prow{21.7}{134.7}{\plab{21.3}{R}the force on the Earth due to the Moon}
\prow{21.6}{134.7}{\plab{21.3}{S}the force on the Moon due to the Sun}
\stem{25.4}{Which two forces are a Newton's third law pair (action and reaction)?}
\optrow{23.6}{P and Q}{P and R}{Q and S}{R and S}`;
// 4037/23/O/N/18 Q1, page 3
const MODULUS = String.raw`\examq{4037/23/O/N/18}{1}{Equations, Inequalities \& Graphs}{3}
\freerow{2.84}{%
  \at{49.61}{-0.00}{\textbf{1}}%
  \at{72.29}{-0.00}{Solve the equation}%
  \at{166.19}{-0.00}{5{\itshape x}}%
  \at{178.78}{0.48}{\swsy{2D}}%
  \at{187.03}{-0.00}{3\kern5.69bp {\itshape =}}%
  \at{207.41}{0.48}{\swsy{2D}}%
  \at{215.16}{-0.00}{3{\itshape x}\kern1.48bp {\itshape +}\kern1.50bp 13\kern0.18bp .}%
  \swpath{fill=black}{(113.90,-2.00) rectangle (114.40,9.72)}{}%
  \swpath{fill=black}{(145.12,-2.00) rectangle (145.62,9.72)}{}%
  \at{532.85}{-0.00}{\swmark{[3]}}}`;

const withCode = (code: string, tex: string) => tex.replace(/\\examq\{\d{4}/g, `\\examq{${code}`);

describe('extractor: the factory reads the subject off the paper code', () => {
  const classOf = (code: string) =>
    createExtractor({ questions: withCode(code, texOf(PHYSICS_MCQ, FORCES)) }).constructor.name;

  it.each([
    ['5054', 'PhysicsExtractor'],
    ['5070', 'ChemistryExtractor'],
    ['4037', 'MathsExtractor'],
    ['4024', 'MathsExtractor'],
    ['2210', 'GenericExtractor'],
  ])('%s is read by %s', (code, name) => expect(classOf(code)).toBe(name));

  it('takes the code from the questions, not from the preamble', () => {
    // Every real preamble describes \examq{<paper id>}{...} in a comment, and
    // says "the class would reset both at \begin{document}" before it begins.
    const preamble = String.raw`% Every question carries \examq{5054/99/M/J/99}{7}{topics}{marks}.
% both at \begin{document}, so \normalsize itself is pinned
${MATHS}`;
    const paper = extractPaper({ questions: texOf(preamble, MODULUS) });
    expect(paper.questions.map((q) => q.number)).toEqual([98, 1]);
    expect(createExtractor({ questions: withCode('4037', texOf(preamble, MODULUS)) }).constructor.name).toBe('MathsExtractor');
  });

  it('keeps what it knows about itself', () => {
    const extractor = createExtractor({ questions: withCode('5070', texOf(CHEMISTRY_MCQ, CHLORINE)) });
    expect(extractor.subject).toMatch(/chem/i);
    const paper = extractor.extract();
    expect(extractor.paper).toEqual(paper.paper);
    expect(extractor.passes).toEqual(paper.passes);
    expect(extractor.warnings).toEqual(paper.warnings);
  });
});

describe('extractor: shape of the result', () => {
  const paper = extractPaper({ questions: withCode('5054', texOf(PHYSICS_MCQ, FORCES)) });

  it('is a ParsedPaper with passes', () => {
    expect(paper.paper).toEqual({
      paperId: '5054/11/M/J/16', subjectCode: '5054', paper: '1', variant: '1', session: 'M/J', year: '2016',
    });
    expect(paper.questions).toHaveLength(2);
    expect(Array.isArray(paper.warnings)).toBe(true);
    expect(paper.passes).toEqual([]);
  });

  it('carries the header of each question', () => {
    expect(question(paper, 5)).toMatchObject({
      number: 5, kind: 'mcq', marks: 1, topics: ['Forces or Dynamics'], topic: 'Forces or Dynamics', parts: [], answer: null,
    });
  });

  it('can be stored: nothing in it is lost by JSON', () => {
    expect(JSON.parse(JSON.stringify(paper))).toEqual(paper);
  });

  it('gives the same result every time it is asked', () => {
    const extractor = createExtractor({ questions: texOf(CHEMISTRY_MCQ, CHLORINE) });
    const first = JSON.stringify(extractor.extract());
    expect(JSON.stringify(extractor.extract())).toBe(first);
  });

  it('names the PDF the figures are cut from, and resolves them through the image map', () => {
    const figure = String.raw`\qfig{12}{208.38bp 643.44bp 207.38bp 85.92bp}{}{13.42}{0}{208.38}`;
    const tex = texOf(PHYSICS_MCQ, `${FORCES}\n${figure}`);
    const key = 'p12-208_38-643_44-207_38-85_92.png';
    const result = extractPaper({ questions: tex, images: { [key]: 'https://x/fig.png' } });
    expect(result.sourcePdf).toBe('5054_s18_qp_11.pdf');
    const block = question(result, 5).stem.find((b) => b.type === 'figure');
    expect(block).toMatchObject({ file: key, src: 'https://x/fig.png', clip: { page: 12, left: 208.38 } });
  });
});

describe('extractor: answers', () => {
  // 5070/11/M/J/16, the answers file, Q13
  const ANSWERS = String.raw`\newenvironment{mstab}[1]{%
  {\color{#1!75!black}\nobreak Mark Scheme}\par\nopagebreak\smallskip
  \hline\rowcolor{#1!45} Question & Answer & Marks \\ \hline}{%
  \endtabularx\arrayrulecolor{black}\par\medskip}
\begin{document}
\examq{5070/11/M/J/16}{13}{Atomic Structure \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{1}
\begin{mstab}{q4color}
13 & C & 1 \\ \hline
\end{mstab}
\begin{ansbox}{q4color}
The molecule contains three chlorine atoms. The number of $^{37}\mathrm{Cl}$ atoms among them can be 0, 1, 2 or 3, so four different relative molecular masses are possible.
\end{ansbox}
\end{document}`;

  it('attaches the answer letter', () => {
    const paper = extractPaper({ questions: texOf(CHEMISTRY_MCQ, CHLORINE), answers: ANSWERS });
    expect(question(paper, 13).answer?.correct).toBe('C');
    expect(question(paper, 13).answer?.markScheme[0]).toMatchObject({ ref: '13', answer: 'C', marks: 1 });
    expect(question(paper, 13).answer?.workedSolution[0].html).toContain('three chlorine atoms');
  });

  it('reads a paper whose answers are missing, whichever way that is said', () => {
    for (const answers of [undefined, null, '']) {
      const paper = extractPaper({ questions: texOf(CHEMISTRY_MCQ, CHLORINE), answers });
      expect(question(paper, 13).answer).toBeNull();
      expect(options(question(paper, 13))).toHaveLength(4);
    }
  });

  it('says so when the answers file answers other questions', () => {
    const other = ANSWERS.replace('{13}', '{14}');
    const paper = extractPaper({ questions: texOf(CHEMISTRY_MCQ, CHLORINE), answers: other });
    expect(question(paper, 13).answer).toBeNull();
    expect(paper.warnings.some((w) => w.code === 'unmatched-question' && w.questionNumber === 13)).toBe(true);
  });
});

describe('extractor: a paper in the documented format keeps its own reader', () => {
  // templates/question-paper.template.tex
  const DOCUMENTED = String.raw`\documentclass[11pt,a4paper]{article}
\newcommand{\ohms}{\ensuremath{\Omega}}
\begin{document}
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{3}
Fig. 1.1 shows a skydiver falling vertically through the air.

\qfig[0.42\linewidth]{5054_21_M_J_25_fig1.png}{Fig. 1.1}

\begin{parts}
  \item Explain how the graph shows that the acceleration decreases as the speed increases.
  \Alines{3}{[1]}

  \item At one instant, the vertical force on the skydiver is 400\,N downwards.

  Determine the resultant force.
  \ansval{resultant $=$}{N}{[2]}
\end{parts}
\total

\examq{5054/11/M/J/25}{2}{Momentum (Dynamics)}{1}
What is a unit for momentum?

\begin{choices}
  \item kg\,m\,/\,s
  \item kg\,m\,/\,s\pow{2}
  \item N\,m
  \item N\,/\,m\pow{2}
\end{choices}
\end{document}`;

  it('gives what that reader gives', () => {
    const paper = extractPaper({ questions: DOCUMENTED });
    const { questions, warnings, paper: meta } = parseQuestionPaper(DOCUMENTED);
    expect(paper.questions).toEqual(questions);
    expect(paper.paper).toEqual(meta);
    expect(paper.warnings).toEqual(warnings);
    expect(paper.passes).toEqual([]);
  });

  it('and it is the question that is written there', () => {
    const q = question(extractPaper({ questions: DOCUMENTED }), 1);
    expect(q.parts.map((p) => [p.ref, p.marks])).toEqual([['1(a)', 1], ['1(b)', 2]]);
    expect(part(q, 'b').answerSpace).toEqual({ kind: 'value', label: 'resultant $=$', unit: 'N' });
  });
});

describe('extractor: commands nobody has seen before', () => {
  it('a new text command that its own preamble defines just works', () => {
    const preamble = MATHS.replace('\\makeatother\n\\makeatletter', String.raw`\makeatother
\makeatletter
\newcommand{\raised}[2]{\raisebox{#1bp}[0pt][0pt]{\fontsize{8bp}{8bp}\selectfont #2}}
\newcommand{\squared}[1]{{\itshape #1}\raised{5.2}{2}}`);
    expect(preamble).not.toBe(MATHS);
    const paper = paperOf(preamble, asQuestion('4037/12/M/J/16', 3, 2, String.raw`\row{0}{72.3}{Find the area \squared{x} of the square.\swmark{[2]}}`));
    correct(paper, 3, stem(question(paper, 3)), 'Find the area $x^2$ of the square.');
  });

  it('a new wrapper around a placed fraction just works', () => {
    const preamble = MATHS.replace('\\makeatother\n\\makeatletter', String.raw`\makeatother
\makeatletter
\newcommand{\over@}[3]{\rlap{\kern1bp\raisebox{5.80bp}[0pt][0pt]{#1}}\rlap{\kern1bp\raisebox{-7.20bp}[0pt][0pt]{#2}}\rlap{\raisebox{3.08bp}[0pt][0pt]{\rule{#3bp}{0.50bp}}}\kern#3bp }
\newcommand{\vover}[2]{\over@{{\itshape #1}}{{\itshape #2}}{8}}`);
    const paper = paperOf(preamble, asQuestion('5054/41/M/J/17', 3, 2, String.raw`\row{0}{72.3}{Use the equation {\itshape R} = \vover{V}{t} here.}`));
    correct(paper, 3, stem(question(paper, 3)), String.raw`Use the equation $R=\frac Vt$ here.`);
  });

  it('an element with a different number of arguments is read by its own definition', () => {
    // A file that gives \stem a third, unused measurement.
    const preamble = PHYSICS_MCQ.replace('\\newcommand{\\stem}[2]{\\swat{#1}#2}', '\\newcommand{\\stem}[3]{\\swat{#1}#3}');
    expect(preamble).not.toBe(PHYSICS_MCQ);
    const paper = paperOf(preamble, FORCES.replace('\\stem{25.4}', '\\stem{25.4}{12.5}'));
    expect(everything(question(paper, 5))).toContain('Which two forces are a Newton');
    expect(everything(question(paper, 5))).not.toContain('12.5');
  });

  it('a command defined nowhere is flagged, and its arguments are not printed', () => {
    const paper = paperOf(PHYSICS, asQuestion('5054/21/M/J/16', 3, 1, String.raw`\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State the \mystery{12.5}{34.75bp} speed of the car.}
\dotline{26.0}{94.9}{}{[1]}{545.6}`));
    expect(passesOf(paper, 3).map((p) => p.reason)).toContain('unknown-command');
    expect(passesOf(paper, 3).some((p) => p.detail.includes('mystery'))).toBe(true);
    const printed = everything(question(paper, 3));
    expect(printed).not.toMatch(/mystery|12\.5|34\.75|bp/);
    expect(canon(printed)).toContain(canon('State the'));
    expect(canon(printed)).toContain(canon('speed of the car.'));
  });

  it('only the question that uses it is flagged', () => {
    const paper = paperOf(
      PHYSICS,
      asQuestion('5054/21/M/J/16', 3, 1, String.raw`\row{26.0}{72.3}{State the \mystery{12.5} speed.}`),
      asQuestion('5054/21/M/J/16', 4, 1, String.raw`\row{26.0}{72.3}{State the mass.}`),
    );
    expect(passesOf(paper, 3)).not.toEqual([]);
    expect(passesOf(paper, 4)).toEqual([]);
  });

  it('every pass reaches the person saving the paper as a warning', () => {
    const paper = paperOf(PHYSICS, asQuestion('5054/21/M/J/16', 3, 1, String.raw`\row{26.0}{72.3}{State the \mystery{12.5} speed.}`));
    expect(paper.warnings.some((w) => w.questionNumber === 3 || /Q3\b/.test(w.message))).toBe(true);
  });

  it('a symbol no table knows is flagged, never printed as something else', () => {
    // \swsy with a code the Symbol font leaves empty
    const paper = paperOf(PHYSICS, asQuestion('5054/21/M/J/16', 3, 1, String.raw`\row{26.0}{72.3}{State the speed \swsy{FF} of the car.}`));
    expect(passesOf(paper, 3).map((p) => p.reason)).toContain('unknown-symbol');
    expect(everything(question(paper, 3))).not.toContain('FF');
  });

  it('a picture of a size no table knows is flagged', () => {
    const paper = paperOf(MATHS, asQuestion('4037/12/M/J/16', 3, 1, String.raw`\freerow{0.0}{%
  \at{72.28}{0.00}{Find the value of}%
  \at{170.00}{-2.00}{\swglyph{4}{170.00bp 700.00bp 400.00bp 120.00bp}}%
  \at{200.00}{0.00}{{\itshape x}.}}`));
    expect(passesOf(paper, 3)).not.toEqual([]);
  });
});

describe('extractor: a subject nobody has written a class for', () => {
  // Any other paper in this format reads with the shared rules alone.
  const paper = extractPaper({ questions: withCode('2210', texOf(PHYSICS_MCQ, FORCES)) });

  it('is read all the same', () => {
    expect(paper.paper).toMatchObject({ subjectCode: '2210' });
    expect(options(question(paper, 5))).toEqual(['A: P and Q', 'B: P and R', 'C: Q and S', 'D: R and S']);
    expect(paper.passes).toEqual([]);
  });

  it('including a fraction, which is no subject\'s own', () => {
    // 4037/11/M/J/18 Q10(a), page 13
    const tex = withCode('2210', texOf(MATHS, String.raw`\examq{4037/11/M/J/18}{10}{Indices \& Surds}{9}
\freerow{19.96}{%
  \at{148.37}{-0.00}{5\kern2.38bp {\itshape +}\kern2.36bp 6}%
  \at{181.59}{-0.00}{5}%
  \at{72.28}{-6.04}{\textbf{(a)}}%
  \at{94.96}{-6.04}{Simplify}%
  \at{189.00}{-6.04}{.}%
  \at{151.84}{-14.20}{6\kern2.38bp {\itshape +}}%
  \at{178.12}{-14.20}{5}%
  \ruleat{147.81}{187.90}{-2.57}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(121.25,-10.15)--(122.09,-9.66)--(124.74,-14.41)}{\clip (124.04,-4.51)--(124.04,-8.10)--(120.99,-9.90)--(121.25,-10.16)--(122.09,-9.66)--(124.74,-14.41)--(127.87,-5.01)--(134.27,-5.01)--(134.27,-4.51)--(124.04,-4.51);}%
  \swpath{draw=black,line width=1.00bp}{(124.74,-14.41)--(127.87,-5.01)--(134.27,-5.01)}{\clip (124.04,-4.51)--(124.04,-8.10)--(120.99,-9.90)--(121.25,-10.16)--(122.09,-9.66)--(124.74,-14.41)--(127.87,-5.01)--(134.27,-5.01)--(134.27,-4.51)--(124.04,-4.51);}%
  \swpath{draw=black,line width=1.80bp}{(124.72,4.03)--(125.56,4.53)--(128.21,-0.23)}{\clip (127.51,9.68)--(127.51,6.09)--(124.46,4.29)--(124.72,4.03)--(125.56,4.53)--(128.21,-0.23)--(131.33,9.18)--(137.74,9.18)--(137.74,9.68)--(127.51,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(128.21,-0.23)--(131.33,9.18)--(137.74,9.18)}{\clip (127.51,9.68)--(127.51,6.09)--(124.46,4.29)--(124.72,4.03)--(125.56,4.53)--(128.21,-0.23)--(131.33,9.18)--(137.74,9.18)--(137.74,9.68)--(127.51,9.68);}%
  \at{532.26}{-6.04}{\swmark{[3]}}%
  \swdepth{16.50}}`));
    const result = extractPaper({ questions: tex });
    correct(result, 10, content(part(question(result, 10), 'a')), String.raw`Simplify $\frac{5+6\sqrt5}{6+\sqrt5}$.`);
  });
});

describe('extractor: broken files', () => {
  it('says there are no questions rather than throwing', () => {
    for (const tex of ['', 'hello', String.raw`\begin{document}\end{document}`]) {
      const paper = extractPaper({ questions: tex });
      expect(paper.questions).toEqual([]);
      expect(paper.warnings.map((w) => w.code)).toContain('no-examq');
    }
  });

  it('survives a brace that is never closed', () => {
    const tex = texOf(PHYSICS_MCQ, FORCES).replace('due to the Sun}', 'due to the Sun');
    expect(() => extractPaper({ questions: tex })).not.toThrow();
  });

  it('survives a macro that calls itself', () => {
    const preamble = `${PHYSICS}\n\\newcommand{\\loopy}[1]{\\loopy{#1}}`;
    const started = Date.now();
    const paper = paperOf(preamble, asQuestion('5054/21/M/J/16', 3, 1, String.raw`\row{26.0}{72.3}{State \loopy{1} the speed.}`));
    expect(Date.now() - started).toBeLessThan(2000);
    expect(passesOf(paper, 3)).not.toEqual([]);
  });

  it('flags a bad paper id', () => {
    const paper = extractPaper({ questions: texOf(PHYSICS_MCQ, FORCES).replace(/\\examq\{[^}]*\}/g, '\\examq{Physics}') });
    expect(paper.paper).toBeNull();
    expect(paper.warnings.map((w) => w.code)).toContain('bad-paper-id');
  });
});

describe('extractor: the public names', () => {
  it('exports the classes a new subject would extend', () => {
    expect(Object.keys(api)).toEqual(expect.arrayContaining(['createExtractor', 'extractPaper', 'PaperExtractor', 'GenericExtractor']));
  });
});
