/**
 * Words: paragraphs, labels, marks, options, lists, and what is not question
 * text at all. Expected values were typed from the printed PDF page named
 * beside each one.
 */

import { describe, expect, it } from 'vitest';
import { canon, content, correct, everything, figures, options, paperOf, part, passesOf, question, sentences, stem } from './helpers.js';
import { CHEMISTRY, CHEMISTRY_MCQ, CHEMISTRY_MCQ_26, MATHS, PHYSICS, PHYSICS_MCQ } from './preambles.js';

describe('text: parts, subparts and marks', () => {
  // 5070/21/M/J/24 Q8, pages 12 and 13
  const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/24}{8}{Carboxylic Acids \textperiodcentered\ Alcohols}{9}
\row{0.0}{72.3}{\lab{22.7}{\textbf{8 }}Fig. 8.1 is a flow diagram showing information about some organic chemical reactions.}
\qfig{12}{54.66bp 463.35bp 54.66bp 90.94bp}{}{18.3}{0}{54.66}
\row{28.8}{278.7}{\textbf{Fig. 8.1}}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(a)}}Compound \textbf{A }is one of the structural isomers of alcohols with molecular formula C$_{3}$H$_{8}$O.}
\partbreak
\row{26.0}{117.6}{\lab{21.7}{\textbf{(i) }}State the name of compound \textbf{A}.}
\dotgrid{119.90}{523.55}{3.0580}
\dotline{26.0}{119.9}{}{[1]}{545.4}
\partbreak
\row{26.0}{117.6}{\lab{24.7}{\textbf{(ii) }}Draw the displayed formula of the \textbf{other }structural isomer of C$_{3}$H$_{8}$O that is an alcohol.}
\qmark{104.0}{[1]}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(b)}}Draw the displayed formula of ester \textbf{B}.}
\qmark{104.0}{[1]}
\newpage
\pagestart
\partbreak
\row{0.0}{95.0}{\lab{22.7}{\textbf{(c)}}Draw the structural formula of propanoic acid.}
\qmark{91.0}{[1]}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(d)}}State the name and formula of compound \textbf{D}.}
\dotgrid{126.01}{541.83}{3.0575}
\dotline{26.0}{95.0}{name}{}{544.9}
\dotgrid{135.18}{541.82}{3.0575}
\dotline{26.1}{95.0}{formula}{}{544.9}
\qmark{13.0}{[2]}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(e)}}State the name of gas \textbf{E }and of gas \textbf{F}.}
\dotgrid{107.68}{541.84}{3.0575}
\dotline{26.0}{95.0}{\textbf{E }}{}{544.9}
\dotgrid{107.68}{541.84}{3.0575}
\dotline{26.0}{95.0}{\textbf{F }}{}{544.9}
\qmark{13.0}{[2]}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(f) }}State the name of ester \textbf{G}.}
\dotgrid{95.44}{523.49}{3.0575}
\dotline{26.0}{95.4}{}{[1]}{545.4}
\total{26.0}`);
  const q = question(paper, 8);

  it('reads every label and puts the romans under their letter', () => {
    expect(q.parts.map((p) => [p.ref, p.subparts.map((s) => s.ref)])).toEqual([
      ['8(a)', ['8(a)(i)', '8(a)(ii)']],
      ['8(b)', []],
      ['8(c)', []],
      ['8(d)', []],
      ['8(e)', []],
      ['8(f)', []],
    ]);
  });

  it('gives each part the marks printed beside it', () => {
    expect(q.parts.map((p) => p.marks)).toEqual([2, 1, 1, 2, 2, 1]);
    expect(part(q, 'a').subparts.map((p) => p.marks)).toEqual([1, 1]);
    expect(paper.warnings.filter((w) => w.code === 'marks-mismatch' && w.questionNumber === 8)).toEqual([]);
  });

  it('prints the words of each part and nothing of the answer space', () => {
    correct(paper, 8, content(part(q, 'a', 'i')), 'State the name of compound A.');
    correct(paper, 8, content(part(q, 'a', 'ii')),
      'Draw the displayed formula of the other structural isomer of C$_3$H$_8$O that is an alcohol.');
    correct(paper, 8, content(part(q, 'c')), 'Draw the structural formula of propanoic acid.');
  });

  it('does not repeat the question number in the text', () => {
    expect(sentences(q.stem)[0]).toBe(
      'Fig. 8.1 is a flow diagram showing information about some organic chemical reactions.',
    );
  });

  it('knows how each answer is given', () => {
    expect(part(q, 'a', 'i').answerSpace).toEqual({ kind: 'lines', lines: 1 });
    expect(part(q, 'b').answerSpace).toEqual({ kind: 'markright' });
  });

  it('keeps the words in front of the answer lines', () => {
    // "name ......" and "formula ......" are printed under (d)
    expect(sentences(part(q, 'd').content).join(' ')).toMatch(
      /^State the name and formula of compound D\. name( \.\.\.+|…)? formula( \.\.\.+|…)?$/,
    );
  });
});

describe('text: labels printed in other ways', () => {
  it('(a) and (i) on one line', () => {
    // 5054/21/M/J/16 Q3, page 6
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{3}{Mass Weight and Density \textperiodcentered\ Physical Quantities and Measurements}{6}
\row{0.6}{72.3}{\lab{22.7}{\textbf{3 }}Fig. 3.1 shows a thin sheet of plastic. A student tries to measure the thickness of the sheet with a\linebreak}
ruler\kern-0.55bp , but the sheet is too thin to measure accurately\kern-1.10bp .
\qfig{6}{215.58bp 634.93bp 214.80bp 101.27bp}{}{15.1}{0}{215.58}
\row{25.8}{245.6}{\textbf{Fig. 3.1 }(not to scale)}
\row{26.0}{72.3}{The student measures the mass of the sheet and obtains the value 0.12 g.}
\partbreak
\row{26.0}{117.6}{\lab{45.3}{\textbf{(a)}}\lab{21.7}{\textbf{(i) }}State what is meant by {\itshape mass}.}
\dotgrid{119.91}{541.92}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[1]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{24.8}{\textbf{(ii) }}The student is told that the density of the plastic is 0.91\,g\,/\,cm$^{3}$.}
\row{26.0}{117.6}{Calculate the volume of the plastic sheet.}
\dotgrid{352.32}{529.69}{3.0580}
\dotline{119.3}{302.6}{volume =}{[2]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{27.8}{\textbf{(iii) }}The student measures the length and width of the sheet.\,The readings obtained are:}
\row{26.0}{117.6}{length of sheet = 3.0\,cm\newline}
width of sheet = 2.0\,cm
\row{26.0}{117.6}{Calculate the thickness of the sheet.}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{117.0}{292.1}{thickness =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}State a measuring instrument that can be used to measure the thickness of the sheet\linebreak}
accurately\kern-1.10bp .
\dotgrid{95.45}{529.68}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}`);
    const q = question(paper, 3);
    expect(q.parts.map((p) => p.label)).toEqual(['a', 'b']);
    expect(part(q, 'a').subparts.map((p) => [p.label, p.marks])).toEqual([['i', 1], ['ii', 2], ['iii', 2]]);
    expect(sentences(part(q, 'a', 'i').content)).toEqual(['State what is meant by mass.']);
    expect(part(q, 'a', 'ii').answerSpace).toMatchObject({ kind: 'value', unit: '' });
    correct(paper, 3, content(part(q, 'a', 'ii')),
      'The student is told that the density of the plastic is 0.91 g / cm$^3$. Calculate the volume of the plastic sheet.');
  });

  it('keeps two readings on two lines', () => {
    // 5054/21/M/J/16 Q3(a)(iii), page 6: "length of sheet = 3.0 cm" is above "width of sheet = 2.0 cm"
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{3}{Mass Weight and Density \textperiodcentered\ Physical Quantities and Measurements}{6}
\row{0.6}{72.3}{\lab{22.7}{\textbf{3 }}Fig. 3.1 shows a thin sheet of plastic. A student tries to measure the thickness of the sheet with a\linebreak}
ruler\kern-0.55bp , but the sheet is too thin to measure accurately\kern-1.10bp .
\qfig{6}{215.58bp 634.93bp 214.80bp 101.27bp}{}{15.1}{0}{215.58}
\row{25.8}{245.6}{\textbf{Fig. 3.1 }(not to scale)}
\row{26.0}{72.3}{The student measures the mass of the sheet and obtains the value 0.12 g.}
\partbreak
\row{26.0}{117.6}{\lab{45.3}{\textbf{(a)}}\lab{21.7}{\textbf{(i) }}State what is meant by {\itshape mass}.}
\dotgrid{119.91}{541.92}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[1]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{24.8}{\textbf{(ii) }}The student is told that the density of the plastic is 0.91\,g\,/\,cm$^{3}$.}
\row{26.0}{117.6}{Calculate the volume of the plastic sheet.}
\dotgrid{352.32}{529.69}{3.0580}
\dotline{119.3}{302.6}{volume =}{[2]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{27.8}{\textbf{(iii) }}The student measures the length and width of the sheet.\,The readings obtained are:}
\row{26.0}{117.6}{length of sheet = 3.0\,cm\newline}
width of sheet = 2.0\,cm
\row{26.0}{117.6}{Calculate the thickness of the sheet.}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{117.0}{292.1}{thickness =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}State a measuring instrument that can be used to measure the thickness of the sheet\linebreak}
accurately\kern-1.10bp .
\dotgrid{95.45}{529.68}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}`);
    const lines = sentences(part(question(paper, 3), 'a', 'iii').content);
    expect(lines.join(' ')).toBe(
      'The student measures the length and width of the sheet. The readings obtained are: length of sheet = 3.0 cm width of sheet = 2.0 cm Calculate the thickness of the sheet.',
    );
    expect(lines).toContain('Calculate the thickness of the sheet.');
  });

  it('(i), (ii), (iii) with no letter above them are the parts', () => {
    // 4037/12/M/J/16 Q8, page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{8}{Straight-Line Graphs \textperiodcentered\ Logarithmic \& Exponential Functions}{8}
\row{-0.18}{49.61}{\textbf{8}}
\qfig{10}{142.86bp 467.43bp 147.54bp 78.58bp}{}{6.16}{0}{142.86}
\row{25.78}{72.28}{V\kern-1.28bp ariables $x$ and $y$ are such that when\kern3.62bp lg\kern1.55bp $y$\kern3.93bp is plotted against\kern4.38bp $x$\kern0.55bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont 2}\kern1.09bp , the straight line graph shown above is\newline}
obtained.
\partbreak
\freerow{17.25}{%
  \at{184.90}{-0.00}{2}}
\partbreak
\row{8.75}{94.96}{\lab{22.19}{\textbf{(i)}}Given that\kern4.90bp $y$\kern3.14bp $=$\kern3.15bp $Ab$\kern0.84bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont $x$}\kern4.39bp , find the value of $A$ and of $b$.\swmark{[4]}}
\partbreak
\freerow{177.0}{%
  \at{69.57}{-0.00}{\textbf{(ii)}}%
  \at{94.97}{-0.00}{Find the value of $y$ when $x$ = 1.5.}%
  \at{532.26}{-0.00}{\swmark{[2]}}}
\partbreak
\freerow{106.0}{%
  \at{66.38}{0.00}{\textbf{(iii)}}%
  \at{94.95}{0.00}{Find the positive value of $x$ when $y$ = 2.}%
  \at{532.25}{0.00}{\swmark{[2]}}}`);
    const q = question(paper, 8);
    expect(q.parts.map((p) => [p.ref, p.marks])).toEqual([['8(i)', 4], ['8(ii)', 2], ['8(iii)', 2]]);
    expect(canon(everything({ ...q, stem: [], parts: q.parts.slice(1) }))).toBe(
      canon('Find the value of y when x = 1.5. Find the positive value of x when y = 2.'),
    );
  });

  it('a question number set as two digits side by side is still only a number', () => {
    // 4037/12/M/J/16 Q11, pages 14 to 16: "11 (a)" heads the question
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{11}{Calculus for Kinematics}{12}
\row{0.0}{72.28}{\lab{22.67}{\textbf{1}\kern-0.63bp \textbf{1}}\textbf{(a)}}
\qfig{14}{77.34bp 515.13bp 91.02bp 87.76bp}{}{15.16}{0}{77.34}
\row{28.8}{94.96}{The diagram shows the velocity-time graph of a particle $P$ moving in a straight line with velocity\newline}
$v$ ms\raisebox{4.03bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1} at time $t$\kern1.45bp s after leaving a fixed point.
\partbreak
\row{26.0}{117.64}{\lab{22.2}{\textbf{(i)}}Find the distance travelled by the particle $P$.\swmark{[2]}}
\partbreak
\freerow{173.7}{%
  \at{92.24}{0.00}{\textbf{(ii)}}%
  \at{117.64}{0.00}{W\kern-0.46bp rite down the deceleration of the particle when\kern2.87bp $t$ = 30.}%
  \at{532.26}{0.00}{\swmark{[1]}}}
\newpage
\pagestart
\partbreak
\row{0.02}{94.96}{\lab{22.68}{\textbf{(b)}}The diagram shows a velocity-time graph of a particle $Q$ moving in a straight line with velocity\newline}
$v$ ms\raisebox{4.03bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}, at time $t$\kern1.45bp s after leaving a fixed point.
\qfig{15}{61.14bp 579.51bp 75.90bp 103.30bp}{}{17.68}{0}{61.14}
\row{28.43}{94.96}{The displacement of $Q$ at time $t$\kern1.46bp s is $s$\kern1.44bp m. On the axes below\kern-0.74bp , draw the corresponding\newline}
displacement-time graph for $Q$.\swmark{[2]}
\qfig{15}{73.74bp 284.64bp 76.26bp 322.57bp}{}{18.76}{0}{73.74}
\freerow{81.7}{%
  \at{194.46}{0.00}{\textbf{Question} \textbf{1}\kern-0.63bp \textbf{1(c)} \textbf{is} \textbf{printed} \textbf{on} \textbf{the} \textbf{next} \textbf{page.}}}
\newpage
\pagestart
\partbreak
\row{0.01}{94.96}{\lab{22.68}{\textbf{(c)}}The velocity\kern-0.75bp , $v$ ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}, of a particle $R$ moving in a straight line, $t$\kern1.46bp s after passing through a fixed\newline}
point $O$, is given by\kern3.72bp $v$\kern3.14bp $=$\kern3.15bp 4e\kern0.55bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont 2$t$}\kern2.53bp $+$\kern2.37bp 6\kern0.65bp .
\partbreak
\row{26.01}{117.64}{\lab{22.2}{\textbf{(i)}}Explain why the particle is never at rest.\swmark{[1]}}
\partbreak
\freerow{90.99}{%
  \at{92.24}{-0.01}{\textbf{(ii)}}%
  \at{117.64}{-0.01}{Find the exact value of $t$ for which the acceleration of $R$ is $12 \mathrm{ms}^{-2}$.}%
  \at{532.26}{-0.01}{\hfill\swmark{[2]}}}
\partbreak
\freerow{169.0}{%
  \at{89.05}{-0.01}{\textbf{(iii)}}%
  \at{117.63}{-0.01}{Showing all your working, find the distance travelled by $R$ in the interval between\kern3.52bp $t$\kern3.15bp $=$\kern3.15bp 0.4}}
\row{13.0}{117.64}{and\kern3.50bp $t$\kern3.15bp $=$\kern3.15bp 0.5\kern0.31bp .\swmark{[4]}}
\end{document}`);
    const q = question(paper, 11);
    expect(q.parts.map((p) => p.ref)).toEqual(['11(a)', '11(b)', '11(c)']);
    expect(part(q, 'a').subparts.map((p) => [p.label, p.marks])).toEqual([['i', 2], ['ii', 1]]);
    expect(part(q, 'b').marks).toBe(2);
    expect(part(q, 'c').subparts.map((p) => [p.label, p.marks])).toEqual([['i', 1], ['ii', 2], ['iii', 4]]);
    expect(content(part(q, 'a', 'ii'))).toBe(canon('Write down the deceleration of the particle when t = 30.'));
    expect(content(part(q, 'a'))).toBe(
      canon('The diagram shows the velocity-time graph of a particle P moving in a straight line with velocity v ms$^{-1}$ at time t s after leaving a fixed point.'),
    );
    expect(stem(q)).not.toMatch(/1/);
  });

  it('a label with kerns between its brackets and its letter', () => {
    // 5054/42/M/J/18 Q3(c), page 7
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/42/M/J/18}{3}{Pressure}{5}
\row{26.0}{95.0}{\lab{22.7}{\textbf{(\kern-0.41bp\relax c\kern0.20bp\relax )\kern-0.41bp\relax }}Use\kern-0.21bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ e\kern-0.21bp\relax q\kern0.41bp\relax ua\kern-0.21bp\relax t\kern0.41bp\relax io\kern0.20bp\relax n}
\row{2.8}{95.0}{\lab{22.7}{\textbf{(\kern-0.41bp\relax d)\kern-0.41bp\relax }}A\kern-0.21bp\relax no\kern0.20bp\relax t\kern0.41bp\relax he\kern-0.21bp\relax r st\kern0.41bp\relax ud\kern0.41bp\relax e\kern-0.21bp\relax nt\kern0.41bp\relax \ sa\kern-0.21bp\relax ys t\kern0.41bp\relax ha\kern-0.21bp\relax t\kern0.41bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ a\kern-0.21bp\relax c\kern0.41bp\relax t\kern0.41bp\relax ua\kern-0.21bp\relax l p\kern0.41bp\relax re\kern-0.21bp\relax ssure\kern-0.21bp\relax \ d\kern0.41bp\relax ue\kern-0.21bp\relax \ t\kern0.41bp\relax o\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ w\kern0.40bp\relax e\kern-0.21bp\relax ig\kern0.20bp\relax ht\kern0.41bp\relax \ o\kern0.20bp\relax f\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ b\kern0.41bp\relax lo\kern0.20bp\relax c\kern0.41bp\relax k\kern0.21bp\relax \ o\kern0.20bp\relax n t\kern0.41bp\relax he\kern-0.21bp\relax \ t\kern0.41bp\relax a\kern-0.21bp\relax b\kern0.41bp\relax le\kern-0.21bp\relax \ is\linebreak}
g\kern0.20bp\relax re\kern-0.21bp\relax a\kern-0.21bp\relax t\kern0.41bp\relax e\kern-0.21bp\relax r t\kern0.41bp\relax ha\kern-0.21bp\relax n t\kern0.41bp\relax he\kern-0.21bp\relax \ va\kern-0.21bp\relax lue\kern-0.21bp\relax \ c\kern0.41bp\relax a\kern-0.21bp\relax lc\kern0.41bp\relax ula\kern-0.21bp\relax t\kern0.41bp\relax e\kern-0.21bp\relax d\kern0.41bp\relax \ in \textbf{(\kern-0.41bp\relax c\kern0.20bp\relax )\kern-0.41bp\relax }.`);
    expect(question(paper, 3).parts.map((p) => p.ref)).toEqual(['3(c)']);
    expect(sentences(part(question(paper, 3), 'c').content)).toEqual(['Use the equation']);
  });
});

describe('text: options', () => {
  it('lines of \\choice', () => {
    // 5070/11/M/J/18 Q19, page 9
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/18}{19}{Rate of Reaction}{1}
\mcq{0.0}{\textbf{19}}{A student wrote two conclusions about calcium carbonate.}
\freerow{25.4}{%
  \at{113.40}{0.04}{conclusion 1}%
  \at{189.56}{0.04}{The\kern8.30bp reaction\kern8.30bp with\kern8.30bp dilute\kern8.30bp hydrochloric acid\kern8.30bp is\kern8.30bp faster\kern8.30bp with\kern8.30bp powdered}%
  \at{189.60}{-12.62}{calcium carbonate than with large pieces of calcium carbonate.}%
  \at{113.40}{-37.88}{conclusion 2}%
  \at{189.57}{-37.88}{Grinding\kern3.38bp large\kern3.38bp pieces\kern3.38bp of\kern3.31bp calcium carbonate\kern3.38bp to\kern3.38bp form\kern3.38bp powder\kern3.38bp increases\kern3.38bp the}%
  \at{189.60}{-50.54}{surface area.}%
  \swdepth{52.86}}
\stem{75.9}{Which statement is correct?}
\choice{23.6}{\textbf{A }}{Both conclusions are correct and conclusion 2 explains conclusion 1.}
\choice{21.7}{\textbf{B }}{Both conclusions are correct but conclusion 2 does not explain conclusion 1.}
\choice{21.6}{\textbf{C }}{Conclusion 1 is correct but conclusion 2 is not correct.}
\choice{21.6}{\textbf{D }}{Conclusion 2 is correct but conclusion 1 is not correct.}`);
    const q = question(paper, 19);
    expect(q.kind).toBe('mcq');
    expect(options(q)).toEqual([
      'A: Both conclusions are correct and conclusion 2 explains conclusion 1.',
      'B: Both conclusions are correct but conclusion 2 does not explain conclusion 1.',
      'C: Conclusion 1 is correct but conclusion 2 is not correct.',
      'D: Conclusion 2 is correct but conclusion 1 is not correct.',
    ].map((o) => `${o.slice(0, 2)} ${canon(o.slice(3))}`));
  });

  it('four across in an \\optrow', () => {
    // 5054/11/M/J/19 Q5, page 3
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/19}{5}{Forces or Dynamics}{1}
\mcq{37.9}{\textbf{5 }}{Four of the gravitational forces that act between bodies in the Solar System are listed below.}
\prow{25.3}{134.7}{\plab{21.3}{P}the force on the Moon due to the Earth}
\prow{21.6}{134.7}{\plab{21.3}{Q}the force on the Earth due to the Sun}
\prow{21.7}{134.7}{\plab{21.3}{R}the force on the Earth due to the Moon}
\prow{21.6}{134.7}{\plab{21.3}{S}the force on the Moon due to the Sun}
\stem{25.4}{Which two forces are a Newton's third law pair (action and reaction)?}
\optrow{23.6}{P and Q}{P and R}{Q and S}{R and S}`);
    expect(options(question(paper, 5))).toEqual(['A: P and Q', 'B: P and R', 'C: Q and S', 'D: R and S']);
  });

  it('a whole question, statements and options, placed in one block', () => {
    // 5070/11/M/J/26 Q6, page 4
    const paper = paperOf(CHEMISTRY_MCQ_26, String.raw`\examq{5070/11/M/J/26}{6}{Structure and Properties of Materials}{1}
\freerow{-0.6}{%
  \at{49.58}{-0.05}{\textbf{6}}%
  \at{72.25}{-0.05}{Three statements about graphite and diamond are listed.}%
  \at{116.17}{-27.41}{1}%
  \at{142.11}{-27.41}{Graphite and diamond both have giant covalent structures.}%
  \at{116.17}{-47.68}{2}%
  \at{142.11}{-47.68}{Graphite is used as a lubricant; diamond is}%
  \at{352.82}{-47.68}{\textbf{not}}%
  \at{372.94}{-47.68}{used as a lubricant.}%
  \at{116.17}{-67.96}{3}%
  \at{142.11}{-67.96}{Graphite is used to make electrodes; diamond is}%
  \at{380.31}{-67.96}{\textbf{not}}%
  \at{400.43}{-67.96}{used to make electrodes.}%
  \at{72.25}{-93.90}{Which statements are correct?}%
  \at{72.25}{-120.76}{\textbf{A}}%
  \at{93.50}{-120.76}{1, 2 and 3}%
  \at{172.84}{-120.76}{\textbf{B}}%
  \at{194.09}{-120.76}{1\kern2.20bp and\kern2.20bp 2\kern2.20bp only}%
  \at{273.42}{-120.76}{\textbf{C}}%
  \at{294.67}{-120.76}{1\kern2.20bp and\kern2.20bp 3\kern2.20bp only}%
  \at{374.01}{-120.76}{\textbf{D}}%
  \at{395.26}{-120.76}{2\kern2.20bp and\kern2.20bp 3\kern2.20bp only}%
  \swdepth{123.08}}`);
    const q = question(paper, 6);
    expect(q.kind).toBe('mcq');
    expect(sentences(q.stem).join(' ')).toBe(
      'Three statements about graphite and diamond are listed. ' +
        '1 Graphite and diamond both have giant covalent structures. ' +
        '2 Graphite is used as a lubricant; diamond is not used as a lubricant. ' +
        '3 Graphite is used to make electrodes; diamond is not used to make electrodes. ' +
        'Which statements are correct?',
    );
    expect(q.options?.items.map((o) => `${o.label} ${o.content}`)).toEqual([
      'A 1, 2 and 3',
      'B 1 and 2 only',
      'C 1 and 3 only',
      'D 2 and 3 only',
    ]);
    expect(everything(q).match(/<(strong|b)>\s*not\s*<\/\1>/g)).toHaveLength(2);
    expect(passesOf(paper, 6)).toEqual([]);
  });

  it('a whole question in one block, with powers floating above wrapped lines', () => {
    // 5070/12/M/J/26 Q8, page 4
    const paper = paperOf(CHEMISTRY_MCQ_26, String.raw`\examq{5070/12/M/J/26}{8}{Formulae, Stoichiometry and the Mole Concept}{1}
\freerow{34.9}{%
  \at{49.59}{-0.01}{\textbf{8}}%
  \at{72.25}{-0.01}{Nitrogen monoxide and oxygen react to form nitrogen dioxide.}%
  \at{201.32}{-27.65}{2NO(g)\kern4.38bp +\kern4.39bp O\kern4.17bp (g)}%
  \at{283.11}{-27.65}{\makebox[10.85bp][c]{\swsy{AE}}}%
  \at{298.36}{-27.65}{2NO\kern4.16bp (g)}%
  \at{261.10}{-30.65}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{320.95}{-30.65}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{470.28}{-48.80}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{72.25}{-54.50}{What is the maximum volume of nitrogen dioxide that may be obtained when 1\,dm\kern7.34bp of}%
  \at{241.13}{-61.99}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{72.25}{-67.69}{nitrogen\kern2.23bp monoxide\kern2.24bp reacts\kern2.24bp with\kern2.23bp 2\,dm\kern6.48bp of\kern2.24bp oxygen\kern2.24bp when\kern2.24bp all\kern2.24bp volumes\kern2.24bp are\kern2.25bp measured\kern2.24bp at\kern2.24bp room}%
  \at{72.25}{-80.88}{temperature and pressure?}%
  \at{116.54}{-102.03}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{217.12}{-102.03}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{317.71}{-102.03}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{418.30}{-102.03}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{72.25}{-107.73}{\textbf{A}}%
  \at{93.50}{-107.73}{1\,dm}%
  \at{172.84}{-107.73}{\textbf{B}}%
  \at{194.09}{-107.73}{2\,dm}%
  \at{273.42}{-107.73}{\textbf{C}}%
  \at{294.67}{-107.73}{3\,dm}%
  \at{374.01}{-107.73}{\textbf{D}}%
  \at{395.26}{-107.73}{4\,dm}%
  \swdepth{110.05}}`);
    const q = question(paper, 8);
    correct(paper, 8, stem(q),
      String.raw`Nitrogen monoxide and oxygen react to form nitrogen dioxide. 2NO(g) + O$_2$(g) $\rightarrow$ 2NO$_2$(g)
       What is the maximum volume of nitrogen dioxide that may be obtained when 1 dm$^3$ of nitrogen monoxide reacts with
       2 dm$^3$ of oxygen when all volumes are measured at room temperature and pressure?`);
    expect(options(q)).toEqual(['1', '2', '3', '4'].map((n, i) => `${'ABCD'[i]}: ${canon(`${n} dm$^3$`)}`));
  });

  it('a whole question in one block: sentences of their own, and one that wraps', () => {
    // 5070/11/M/J/26 Q40, page 15
    const paper = paperOf(CHEMISTRY_MCQ_26, String.raw`\examq{5070/11/M/J/26}{40}{Identification of Ions and Gases}{1}
\freerow{157.1}{%
  \at{49.58}{0.04}{\textbf{40}}%
  \at{72.25}{0.04}{J is an aqueous solution.}%
  \at{72.25}{-26.81}{When aqueous sodium hydroxide is added to J, a green precipitate is formed.}%
  \at{72.25}{-53.66}{The resulting mixture is heated, and no gas is formed.}%
  \at{72.25}{-80.51}{Aluminium foil is added to the warmed mixture. A gas is formed that turns damp red}%
  \at{72.25}{-93.70}{litmus paper blue.}%
  \at{72.25}{-120.55}{Which ions does J contain?}%
  \at{72.25}{-147.41}{\textbf{A}}%
  \at{94.18}{-147.41}{$\mathrm{Fe}^{3+}$ and $\mathrm{NH}_{4}^{+}$}%
  \at{72.25}{-169.10}{\textbf{B}}%
  \at{94.18}{-169.10}{$\mathrm{Fe}^{3+}$ and $\mathrm{NO}_{3}^{-}$}%
  \at{72.25}{-190.79}{\textbf{C}}%
  \at{94.18}{-190.79}{$\mathrm{Fe}^{2+}$ and $\mathrm{NH}_{4}^{+}$}%
  \at{72.25}{-212.49}{\textbf{D}}%
  \at{94.18}{-212.49}{$\mathrm{Fe}^{2+}$ and $\mathrm{NO}_{3}^{-}$}%
  \swdepth{217.07}}`);
    const lines = sentences(question(paper, 40).stem);
    expect(lines.join(' ')).toBe(
      'J is an aqueous solution. When aqueous sodium hydroxide is added to J, a green precipitate is formed. ' +
        'The resulting mixture is heated, and no gas is formed. ' +
        'Aluminium foil is added to the warmed mixture. A gas is formed that turns damp red litmus paper blue. ' +
        'Which ions does J contain?',
    );
  });
});

describe('text: lists', () => {
  it('lettered lines', () => {
    // 5054/11/M/J/19 Q5, page 3
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/19}{5}{Forces or Dynamics}{1}
\mcq{37.9}{\textbf{5 }}{Four of the gravitational forces that act between bodies in the Solar System are listed below.}
\prow{25.3}{134.7}{\plab{21.3}{P}the force on the Moon due to the Earth}
\prow{21.6}{134.7}{\plab{21.3}{Q}the force on the Earth due to the Sun}
\prow{21.7}{134.7}{\plab{21.3}{R}the force on the Earth due to the Moon}
\prow{21.6}{134.7}{\plab{21.3}{S}the force on the Moon due to the Sun}
\stem{25.4}{Which two forces are a Newton's third law pair (action and reaction)?}
\optrow{23.6}{P and Q}{P and R}{Q and S}{R and S}`);
    expect(sentences(question(paper, 5).stem)).toEqual([
      'Four of the gravitational forces that act between bodies in the Solar System are listed below.',
      'P the force on the Moon due to the Earth',
      'Q the force on the Earth due to the Sun',
      'R the force on the Earth due to the Moon',
      'S the force on the Moon due to the Sun',
      "Which two forces are a Newton's third law pair (action and reaction)?",
    ]);
  });

  it('bullets set with \\swbul', () => {
    // 5054/11/M/J/23 Q26, page 12
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/23}{26}{Simple Magnetism and Magnetic Fields}{1}
\mcq{0.0}{\textbf{26}}{A student uses a wooden clamp and a stand to hold a freely suspended bar magnet.}
\qfig{12}{208.38bp 643.44bp 207.38bp 85.92bp}{}{13.42}{0}{208.38}
\stem{19.94}{The diagrams show that:}
\prow{25.3}{134.7}{\plab{21.3}{\swbul{}}in experiment 1, the student holds a bar magnet next to the suspended magnet}
\prow{21.6}{134.7}{\plab{21.3}{\swbul{}}in experiment 2, the student holds an iron bar next to the suspended magnet}
\prow{21.7}{134.7}{\plab{21.3}{\swbul{}}in experiment 3, the student holds a steel bar next to the suspended magnet.}
\qfig{12}{52.50bp 414.12bp 52.58bp 302.28bp}{}{15.18}{0}{52.50}
\stem{20.22}{In which experiments does the suspended magnet move?}
\optrow{23.6}{1, 2 and 3}{1 and 2 only}{1 and 3 only}{2 and 3 only}`);
    const q = question(paper, 26);
    expect(sentences(q.stem).map((s) => s.replace('●', '•'))).toEqual([
      'A student uses a wooden clamp and a stand to hold a freely suspended bar magnet.',
      'The diagrams show that:',
      '• in experiment 1, the student holds a bar magnet next to the suspended magnet',
      '• in experiment 2, the student holds an iron bar next to the suspended magnet',
      '• in experiment 3, the student holds a steel bar next to the suspended magnet.',
      'In which experiments does the suspended magnet move?',
    ]);
    expect(figures(q.stem)).toHaveLength(2);
  });

  it('bullets written as labels', () => {
    // 5054/22/M/J/16 Q4(b), page 5
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/22/M/J/16}{4}{Thermal Properties \& Temperature \textperiodcentered\ Kinetic Model of Matter}{6}
\row{0.6}{72.3}{\lab{22.7}{\textbf{4 }}A beaker is filled with water and placed on a hot-plate to boil, as shown in Fig.\,4.1.\,The hot-plate is\linebreak}
on top of a balance, which measures the mass of water in the beaker\kern-0.55bp .
\qfig{5}{178.86bp 596.05bp 181.32bp 99.83bp}{}{13.6}{0}{178.86}
\row{23.7}{278.9}{\textbf{Fig. 4.1}}
\row{26.0}{72.3}{The liquid boils f\kern-0.33bp or a long time.\,There are bubbles within the boiling water\kern-0.55bp .}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State what is inside each bubble.}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.4}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}The mass of water is measured at two diff\kern-0.33bp erent times, while the water is boiling steadily\kern-1.10bp .}
\row{26.0}{94.9}{During this time}
\row{26.0}{117.6}{\lab{22.7}{•}the mass of water in the beaker decreases by 20\,g}
\row{13.0}{117.6}{\lab{22.7}{•}the energy supplied to the hot-plate is 52\,000\,J}
\row{13.0}{117.6}{\lab{22.7}{•}the energy lost from the hot-plate and beaker to the atmosphere is 6000\,J}
\row{26.0}{94.9}{Calculate the specific latent heat of vaporisation of water\kern-0.55bp .}
\dotgrid{352.32}{529.69}{3.0580}
\dotline{130.0}{246.6}{specific latent heat =}{[3]}{545.4}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(c)}}The beaker of water is taken off the hot-plate.\,The boiling stops but e\kern-0.33bp vaporation still continues\linebreak}
and the water cools.
\row{26.0}{94.9}{Explain, using ideas about molecules, how e\kern-0.33bp vaporation causes cooling.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.4}`);
    const b = part(question(paper, 4), 'b');
    expect(sentences(b.content)).toEqual([
      'The mass of water is measured at two different times, while the water is boiling steadily.',
      'During this time',
      '• the mass of water in the beaker decreases by 20 g',
      '• the energy supplied to the hot-plate is 52 000 J',
      '• the energy lost from the hot-plate and beaker to the atmosphere is 6000 J',
      'Calculate the specific latent heat of vaporisation of water.',
    ]);
    expect(b.marks).toBe(3);
    expect(sentences(question(paper, 4).stem)).toContain('The liquid boils for a long time. There are bubbles within the boiling water.');
  });

  it('numbered statements are not the question number', () => {
    // 5070/11/M/J/16 Q40, page 13
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{40}{Macromolecules}{1}
\mcq{37.9}{\textbf{40}}{Polymer Z has the structure shown.}
\qfig{13}{138.90bp 427.39bp 138.26bp 353.09bp}{}{14.6}{0}{138.90}
\stem{23.9}{These four terms can be used to describe polymers.}
\prow{25.2}{134.6}{\plab{21.2}{1}addition polymer}
\prow{21.7}{134.6}{\plab{21.2}{2}condensation polymer}
\prow{21.6}{134.6}{\plab{21.2}{3}polyamide}
\prow{21.7}{134.6}{\plab{21.2}{4}polyester}
\stem{25.3}{Which two terms can be applied to polymer Z?}
\optrow{23.7}{1 and 3}{1 and 4}{2 and 3}{2 and 4}
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\qfig{16}{48.54bp 59.46bp 78.86bp 60.78bp}{}{-11.7}{0}{48.54}
\end{document}`);
    expect(sentences(question(paper, 40).stem)).toEqual([
      'Polymer Z has the structure shown.',
      'These four terms can be used to describe polymers.',
      '1 addition polymer',
      '2 condensation polymer',
      '3 polyamide',
      '4 polyester',
      'Which two terms can be applied to polymer Z?',
    ]);
  });
});

describe('text: two columns, the second of them wrapping', () => {
  it('"conclusion 1" and "conclusion 2"', () => {
    // 5070/11/M/J/18 Q19, page 9
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/18}{19}{Rate of Reaction}{1}
\mcq{0.0}{\textbf{19}}{A student wrote two conclusions about calcium carbonate.}
\freerow{25.4}{%
  \at{113.40}{0.04}{conclusion 1}%
  \at{189.56}{0.04}{The\kern8.30bp reaction\kern8.30bp with\kern8.30bp dilute\kern8.30bp hydrochloric acid\kern8.30bp is\kern8.30bp faster\kern8.30bp with\kern8.30bp powdered}%
  \at{189.60}{-12.62}{calcium carbonate than with large pieces of calcium carbonate.}%
  \at{113.40}{-37.88}{conclusion 2}%
  \at{189.57}{-37.88}{Grinding\kern3.38bp large\kern3.38bp pieces\kern3.38bp of\kern3.31bp calcium carbonate\kern3.38bp to\kern3.38bp form\kern3.38bp powder\kern3.38bp increases\kern3.38bp the}%
  \at{189.60}{-50.54}{surface area.}%
  \swdepth{52.86}}
\stem{75.9}{Which statement is correct?}
\choice{23.6}{\textbf{A }}{Both conclusions are correct and conclusion 2 explains conclusion 1.}
\choice{21.7}{\textbf{B }}{Both conclusions are correct but conclusion 2 does not explain conclusion 1.}
\choice{21.6}{\textbf{C }}{Conclusion 1 is correct but conclusion 2 is not correct.}
\choice{21.6}{\textbf{D }}{Conclusion 2 is correct but conclusion 1 is not correct.}`);
    const q = question(paper, 19);
    expect(sentences(q.stem).join(' ')).toBe(
      'A student wrote two conclusions about calcium carbonate. ' +
        'conclusion 1 The reaction with dilute hydrochloric acid is faster with powdered calcium carbonate than with large pieces of calcium carbonate. ' +
        'conclusion 2 Grinding large pieces of calcium carbonate to form powder increases the surface area. ' +
        'Which statement is correct?',
    );
    expect(passesOf(paper, 19)).toEqual([]);
  });

  it('"experiment 1" and "experiment 2", every word placed on its own', () => {
    // 5070/11/M/J/21 Q19, page 8
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/21}{19}{Rate of Reaction \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{1}
\stem{26.1}{Two experiments are carried out at 25\,$^{\circ}$C.}
\freerow{25.3}{%
  \at{70.86}{-0.02}{experiment 1}%
  \at{148.77}{-0.02}{24.0\,g}%
  \at{186.81}{-0.02}{of}%
  \at{204.97}{-0.02}{powdered}%
  \at{262.31}{-0.02}{magnesium}%
  \at{328.19}{-0.02}{is}%
  \at{345.24}{-0.02}{reacted}%
  \at{390.99}{-0.02}{with}%
  \at{419.65}{-0.02}{$100\,\mathrm{cm}^{3}$}%
  \at{467.63}{-0.02}{of}%
  \at{485.91}{-0.02}{$1.0\,\mathrm{mol}/\mathrm{dm}^{3}$}%
  \at{148.80}{-12.62}{sulfuric acid.}%
  \at{70.92}{-34.28}{experiment 2}%
  \at{148.83}{-34.28}{24.0\,g}%
  \at{187.53}{-34.28}{of}%
  \at{206.42}{-34.28}{powdered}%
  \at{264.42}{-34.28}{magnesium}%
  \at{330.96}{-34.28}{is}%
  \at{348.67}{-34.28}{reacted}%
  \at{395.08}{-34.28}{with}%
  \at{424.40}{-34.28}{$50\,\mathrm{cm}^{3}$}%
  \at{466.97}{-34.28}{of}%
  \at{485.91}{-34.28}{$2.0\,\mathrm{mol}/\mathrm{dm}^{3}$}%
  \at{148.86}{-46.94}{sulfuric acid.}%
  \swdepth{49.26}}
\stem{72.3}{During each experiment the volume of hydrogen produced is measured. The results are plotted\linebreak}
on a graph.`);
    correct(paper, 19, stem(question(paper, 19)),
      `Two experiments are carried out at 25 °C.
       experiment 1 24.0 g of powdered magnesium is reacted with 100 cm$^3$ of 1.0 mol/dm$^3$ sulfuric acid.
       experiment 2 24.0 g of powdered magnesium is reacted with 50 cm$^3$ of 2.0 mol/dm$^3$ sulfuric acid.
       During each experiment the volume of hydrogen produced is measured. The results are plotted on a graph.`);
  });
});

describe('text: typesetting leaves no trace', () => {
  it('a line spread across the page by its word gaps', () => {
    // 5054/11/M/J/17 Q2, page 2
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/17}{2}{Physical Quantities and Measurements}{1}
\freerow{37.9}{%
  \at{49.62}{-0.04}{\textbf{2}}%
  \at{70.87}{-0.04}{A\kern3.73bp car's\kern3.73bp acceleration\kern3.73bp and\kern3.68bp maximum\kern3.73bp speed\kern3.73bp are\kern3.73bp improved\kern3.73bp by\kern3.73bp using\kern3.73bp an\kern3.68bp engine\kern3.73bp of\kern3.73bp smaller\kern3.73bp mass\kern3.73bp and}%
  \at{70.86}{-12.70}{greater driving force.}%
  \ruleat{108.90}{168.18}{-1.57}{0.78}%
  \ruleat{245.22}{275.22}{-1.57}{0.78}%
  \ruleat{497.40}{523.68}{-1.57}{0.78}%
  \ruleat{144.24}{168.72}{-14.23}{0.78}%
  \swdepth{15.02}}
\stem{38.0}{How many of the underlined quantities are vectors?}
\optrow{23.7}{1}{2}{3}{4}`);
    expect(sentences(question(paper, 2).stem)[0]).toBe(
      "A car's acceleration and maximum speed are improved by using an engine of smaller mass and greater driving force.",
    );
  });

  it('a letter-spaced line', () => {
    // 5054/11/M/J/22 Q28, page 11
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/22}{28}{Electric Charge}{1}
\mcq{37.9}{\textbf{28}}{\textls[-9]{Two metal spheres are mounted on insulating stands. Sphere X is initially uncharged and sphere Y}\linebreak}
is initially positively charged.
\stem{25.4}{A metal rod, held by an insulating handle, is placed in contact with X and Y as shown.}
\qfig{11}{174.18bp 476.40bp 173.90bp 250.44bp}{}{13.34}{0}{174.18}
\stem{20.4}{What are the charges on X and on Y after the rod is placed in contact with them?}
\qfig{11}{68.34bp 333.24bp 301.34bp 398.64bp}{}{12.64}{0}{68.34}`);
    expect(sentences(question(paper, 28).stem)[0]).toBe(
      'Two metal spheres are mounted on insulating stands. Sphere X is initially uncharged and sphere Y is initially positively charged.',
    );
  });

  it('a letter-spaced line holding typed maths, closed by \\parfillskip', () => {
    // 5054/41/M/J/17 Q1(b), page 2
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/41/M/J/17}{1}{Motion or Kinematics}{7}
\row{26.0}{95.0}{\lab{22.7}{\textbf{(b)}}The distance of each dot from A is $d$. Dot A was marked on the strip at time $t=1.000$\,s.}
\row{26.0}{95.0}{{\advance\spaceskip-0.11bp\advance\xspaceskip-0.11bp\textls[-10]{T\kern-1.22bp ake measurements from Fig. 1.1 and, in the space below\kern-0.60bp , draw a table of results for $d$ against $t$.}}{\parfillskip0pt\par}}`);
    const b = part(question(paper, 1), 'b');
    correct(paper, 1, content(b),
      `The distance of each dot from A is d. Dot A was marked on the strip at time t = 1.000 s.
       Take measurements from Fig. 1.1 and, in the space below, draw a table of results for d against t.`);
  });

  it('\\parfillskip=0pt with an equals sign', () => {
    // 5070/42/M/J/16 Q2(b), page 4
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/42/M/J/16}{2}{Identification of Ions and Gases \textperiodcentered\ Energy from Chemicals \textperiodcentered\ Preparation of Salts}{10}
\row{23.0}{94.9}{\lab{22.6}{\textbf{(b)}}Describe briefly how pure cr\kern0.33bp ystals of potassium nitrate ma\kern-0.33bp y be made from aqueous potassium{\parfillskip=0pt\par}}
\row{12.0}{94.9}{nitrate.}`);
    expect(sentences(part(question(paper, 2), 'b').content).join(' ')).toBe(
      'Describe briefly how pure crystals of potassium nitrate may be made from aqueous potassium nitrate.',
    );
  });

  it('word spacing set with \\spaceskip and a shrinking skip at the end', () => {
    // 5054/21/M/J/16 Q10, page 14
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{10}{Thermal Properties \& Temperature \textperiodcentered\ Kinetic Model of Matter \textperiodcentered\ Transfer of Thermal Energy}{15}
\row{26.0}{117.6}{{\spaceskip=2.22bp\xspaceskip=2.22bp\relax Using ideas about molecules, describe the changes that occur when the liquid e\kern-0.33bp vaporates.}\nobreak\hskip0pt minus2.11bp\kern0pt }`);
    expect(everything(question(paper, 10))).toContain(
      'Using ideas about molecules, describe the changes that occur when the liquid evaporates.',
    );
    expect(everything(question(paper, 10))).not.toMatch(/bp|2\.\d\d|minus|hskip/);
  });

  it('answer dots set from a named font print no font name', () => {
    // 5054/41/M/J/17 Q4(b), page 8
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/41/M/J/17}{4}{Electrical Quantities}{6}
\row{25.4}{95.0}{\lab{22.7}{\textbf{(b)}}State the quantities that are measured by these meters.}
\row{25.4}{95.0}{meter 1 measures {\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}{\font\swell=uhvr8r at 11.00bp\swell\char"85}..}`);
    const b = sentences(part(question(paper, 4), 'b').content);
    expect(b[0]).toBe('State the quantities that are measured by these meters.');
    expect(b[1]).toMatch(/^meter 1 measures [….]+$/);
    expect(passesOf(paper, 4)).toEqual([]);
  });
});

describe('text: EITHER and OR', () => {
  it('counts the marks of one alternative, not of both', () => {
    // 5054/21/M/J/16 Q9, pages 12 and 13: [2] + [2], or [1] + [3]; worth 4
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{9}{Uses of Oscilloscope \textperiodcentered\ Electric Circuits}{4}
\row{0.6}{72.3}{\lab{22.7}{\textbf{9 }}\textbf{EITHER}}
\row{26.0}{72.3}{Fig. 9.1 shows a cathode-ra\kern-0.33bp y oscilloscope (c.r\kern-0.55bp .o\kern-0.44bp .). An alternating voltage supply is applied to the\linebreak}
input and the trace produced is shown.
\row{30.2}{319.8}{1 division}
\qfig{12}{100.38bp 422.47bp 106.80bp 144.87bp}{}{2.5}{0}{100.38}
\row{29.0}{278.9}{\textbf{Fig. 9.1}}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}Use Fig. 9.1 to determine the maximum voltage of the supply\kern-1.10bp .}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{78.0}{302.5}{voltage =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Describe how the trace on the screen and the controls on the c.r\kern-0.55bp .o\kern-0.44bp . are used to measure the\linebreak}
time between any two points on the trace.
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.6}
\newpage
\pagestart
\row{0.6}{72.3}{\textbf{OR}}
\row{26.0}{72.3}{The circuit diagram shown in Fig. 9.2 uses an LDR as the sensor in an automatic night light.}
\qfig{13}{184.62bp 574.80bp 195.00bp 112.80bp}{}{13.6}{0}{184.62}
\row{24.5}{278.9}{\textbf{Fig. 9.2}}
\row{26.0}{72.3}{When it gets dark, the lamp turns on.}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State the name of component A.}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Explain wh\kern-0.33bp y the lamp turns on when it gets dark.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[3]}{545.6}
\newpage
\pagestart
\row{0.6}{272.2}{\textbf{Section B}}
\qfig{14}{121.26bp 737.96bp 120.84bp 88.24bp}{}{15.0}{0}{121.26}`);
    const q = question(paper, 9);
    expect(q.marks).toBe(4);
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['a', 2], ['b', 2], ['a', 1], ['b', 3]]);
    expect(paper.warnings.filter((w) => w.code === 'marks-mismatch' && w.questionNumber === 9)).toEqual([]);
  });

  it('counts a part before EITHER once', () => {
    // 5054/22/M/J/21 Q8, pages 12 and 13: (a) [3], then (b) [3] or (b) [3]; worth 6
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/22/M/J/21}{8}{Electric Circuits}{6}
\row{0.0}{72.3}{\lab{22.7}{\textbf{8 }}Fig. 8.1 shows a potential divider circuit containing two resistors R$_{1}$ and R$_{2}$.}
\qfig{12}{198.30bp 602.97bp 198.30bp 85.60bp}{}{13.0}{0}{198.30}
\row{23.0}{278.7}{\textbf{Fig. 8.1}}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(a)}}There is an input voltage of 6.0\,V\kern-1.01bp .}
\row{26.0}{95.0}{Complete T\kern-1.22bp able 8.1 to show the output voltage for different values of the resistances of the\linebreak}
two resistors.
\row{156.0}{274.5}{\textbf{T\kern-0.82bp able 8.1}}
\qfig{12}{109.02bp 251.30bp 108.30bp 497.24bp}{}{14.3}{0}{109.02}
\qmark{9.3}{[3]}
\newpage
\pagestart
\row{0.0}{49.6}{\textbf{EITHER}}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(b)}}In the circuit shown in Fig. 8.1, resistor R$_{1}$ is replaced by a light dependent resistor (LDR).}
\partbreak
\row{26.0}{117.6}{\lab{21.7}{\textbf{(i) }}In the space below\kern-0.60bp , draw the circuit symbol for an LDR.}
\qmark{78.0}{[1]}
\partbreak
\row{26.0}{117.6}{\lab{24.7}{\textbf{(ii) }}The LDR is moved from darkness into daylight.}
\row{26.1}{117.6}{State what happens to the resistance of the LDR and the output voltage.}
\dotgrid{171.85}{541.87}{3.0580}
\dotline{26.0}{117.6}{resistance}{}{544.9}
\dotgrid{190.18}{541.85}{3.0580}
\dotline{26.0}{117.6}{output voltage}{}{544.9}
\qmark{13.0}{[1]}
\partbreak
\row{26.0}{117.6}{\lab{27.8}{\textbf{(iii) }}A potential divider circuit can also be used to produce an output voltage that changes\linebreak}
with temperature.
\row{26.0}{117.6}{State the name of the component that is used instead of the LDR.}
\dotgrid{119.90}{523.56}{3.0580}
\dotline{26.0}{117.6}{}{[1]}{545.7}
\row{26.0}{49.6}{\textbf{OR}}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(b)}}A simple bistable circuit contains NOR gates.}
\partbreak
\row{26.0}{117.6}{\lab{21.7}{\textbf{(i) }}In the space below\kern-0.60bp , draw the circuit symbol of a NOR gate.}
\qmark{91.0}{[1]}
\partbreak
\row{26.0}{117.6}{\lab{24.7}{\textbf{(ii) }}Describe what is meant by a {\itshape bistable circuit}.}
\dotgrid{119.89}{541.90}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.90}{541.90}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.90}{541.90}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.90}{523.56}{3.0580}
\dotline{26.0}{117.6}{}{[2]}{545.7}
\total{26.0}
\newpage
\pagestart
\row{0.0}{272.3}{\textbf{Section B}}
\qfig{14}{120.18bp 738.39bp 120.54bp 88.06bp}{}{15.5}{0}{120.18}`);
    const q = question(paper, 8);
    expect(q.marks).toBe(6);
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['a', 3], ['b', 3], ['b', 3]]);
    expect(q.parts.map((p) => p.subparts.map((s) => s.marks))).toEqual([[], [1, 1, 1], [1, 2]]);
    expect(paper.warnings.filter((w) => w.code === 'marks-mismatch' && w.questionNumber === 8)).toEqual([]);
  });

  it('keeps both words, in their places', () => {
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{9}{Uses of Oscilloscope \textperiodcentered\ Electric Circuits}{4}
\row{0.6}{72.3}{\lab{22.7}{\textbf{9 }}\textbf{EITHER}}
\row{26.0}{72.3}{Fig. 9.1 shows a cathode-ra\kern-0.33bp y oscilloscope (c.r\kern-0.55bp .o\kern-0.44bp .). An alternating voltage supply is applied to the\linebreak}
input and the trace produced is shown.
\row{30.2}{319.8}{1 division}
\qfig{12}{100.38bp 422.47bp 106.80bp 144.87bp}{}{2.5}{0}{100.38}
\row{29.0}{278.9}{\textbf{Fig. 9.1}}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}Use Fig. 9.1 to determine the maximum voltage of the supply\kern-1.10bp .}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{78.0}{302.5}{voltage =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Describe how the trace on the screen and the controls on the c.r\kern-0.55bp .o\kern-0.44bp . are used to measure the\linebreak}
time between any two points on the trace.
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.6}
\newpage
\pagestart
\row{0.6}{72.3}{\textbf{OR}}
\row{26.0}{72.3}{The circuit diagram shown in Fig. 9.2 uses an LDR as the sensor in an automatic night light.}
\qfig{13}{184.62bp 574.80bp 195.00bp 112.80bp}{}{13.6}{0}{184.62}
\row{24.5}{278.9}{\textbf{Fig. 9.2}}
\row{26.0}{72.3}{When it gets dark, the lamp turns on.}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State the name of component A.}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Explain wh\kern-0.33bp y the lamp turns on when it gets dark.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[3]}{545.6}
\newpage
\pagestart
\row{0.6}{272.2}{\textbf{Section B}}
\qfig{14}{121.26bp 737.96bp 120.84bp 88.24bp}{}{15.0}{0}{121.26}`);
    const text = everything(question(paper, 9)).replace(/<[^>]+>/g, '');
    const order = ['EITHER', 'cathode-ray oscilloscope', 'maximum voltage', 'OR', 'LDR as the sensor', 'component A'];
    const at = order.map((s) => (s === 'OR' ? text.search(/\bOR\b/) : text.indexOf(s)));
    expect(at.every((n) => n >= 0), `all printed: ${order.filter((_, i) => at[i] < 0)}`).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
  });

  it('a question that ends without an alternative still reports wrong marks', () => {
    // The rule must come from the printed EITHER/OR, not from being lenient:
    // 5054/21/M/J/16 Q9 with the two words removed really does add up to 8.
    const tex = String.raw`\examq{5054/21/M/J/16}{9}{Uses of Oscilloscope \textperiodcentered\ Electric Circuits}{4}
\row{0.6}{72.3}{\lab{22.7}{\textbf{9 }}\textbf{EITHER}}
\row{26.0}{72.3}{Fig. 9.1 shows a cathode-ra\kern-0.33bp y oscilloscope (c.r\kern-0.55bp .o\kern-0.44bp .). An alternating voltage supply is applied to the\linebreak}
input and the trace produced is shown.
\row{30.2}{319.8}{1 division}
\qfig{12}{100.38bp 422.47bp 106.80bp 144.87bp}{}{2.5}{0}{100.38}
\row{29.0}{278.9}{\textbf{Fig. 9.1}}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}Use Fig. 9.1 to determine the maximum voltage of the supply\kern-1.10bp .}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{78.0}{302.5}{voltage =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Describe how the trace on the screen and the controls on the c.r\kern-0.55bp .o\kern-0.44bp . are used to measure the\linebreak}
time between any two points on the trace.
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.6}
\newpage
\pagestart
\row{0.6}{72.3}{\textbf{OR}}
\row{26.0}{72.3}{The circuit diagram shown in Fig. 9.2 uses an LDR as the sensor in an automatic night light.}
\qfig{13}{184.62bp 574.80bp 195.00bp 112.80bp}{}{13.6}{0}{184.62}
\row{24.5}{278.9}{\textbf{Fig. 9.2}}
\row{26.0}{72.3}{When it gets dark, the lamp turns on.}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State the name of component A.}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Explain wh\kern-0.33bp y the lamp turns on when it gets dark.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[3]}{545.6}
\newpage
\pagestart
\row{0.6}{272.2}{\textbf{Section B}}
\qfig{14}{121.26bp 737.96bp 120.84bp 88.24bp}{}{15.0}{0}{121.26}`.replace(/\\textbf\{EITHER\}/, '').replace(/\\textbf\{OR\}/, 'x');
    const paper = paperOf(PHYSICS, tex);
    expect(paper.warnings.some((w) => w.code === 'marks-mismatch' && w.questionNumber === 9)).toBe(true);
  });
});

describe('text: page furniture is not question text', () => {
  it('BLANK PAGE and the Periodic Table after the last question', () => {
    // 5070/11/M/J/16 Q40, page 13; pages 14 and 15 are blank, page 16 is the Periodic Table
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{40}{Macromolecules}{1}
\mcq{37.9}{\textbf{40}}{Polymer Z has the structure shown.}
\qfig{13}{138.90bp 427.39bp 138.26bp 353.09bp}{}{14.6}{0}{138.90}
\stem{23.9}{These four terms can be used to describe polymers.}
\prow{25.2}{134.6}{\plab{21.2}{1}addition polymer}
\prow{21.7}{134.6}{\plab{21.2}{2}condensation polymer}
\prow{21.6}{134.6}{\plab{21.2}{3}polyamide}
\prow{21.7}{134.6}{\plab{21.2}{4}polyester}
\stem{25.3}{Which two terms can be applied to polymer Z?}
\optrow{23.7}{1 and 3}{1 and 4}{2 and 3}{2 and 4}
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\qfig{16}{48.54bp 59.46bp 78.86bp 60.78bp}{}{-11.7}{0}{48.54}
\end{document}`, String.raw`
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\freerow{0.3}{%
  \at{261.30}{-0.00}{\textbf{BLANK PAGE}}}
\newpage
\pagestart
\qfig{16}{48.54bp 59.46bp 78.86bp 60.78bp}{}{-11.7}{0}{48.54}`);
    const q = question(paper, 40);
    expect(everything(q)).not.toMatch(/BLANK/);
    expect(figures(q.stem).map((f) => f.type === 'figure' && f.clip?.page)).toEqual([13]);
    expect(options(q)).toEqual(['1 and 3', '1 and 4', '2 and 3', '2 and 4'].map((t, i) => `${'ABCD'[i]}: ${canon(t)}`));
  });

  it('the notes for qualitative analysis after the last question', () => {
    // 5070/41/M/J/23 Q4, pages 9 and 10, then the notes on pages 11 and 12
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/41/M/J/23}{4}{Experimental Design}{6}
\row{0.0}{72.3}{\lab{22.7}{\textbf{4 }}Baking powder is used to make cakes rise. When water is added to baking powder\kern-0.60bp , carbon dioxide\linebreak}
gas is released.
\row{26.0}{72.3}{The longer the baking powder is stored, the less carbon dioxide it releases when water is added.}
\row{26.0}{72.3}{Plan an investigation to show which of two different samples of baking powder has been stored for\linebreak}
longer\kern-0.60bp .
\row{26.0}{72.3}{Y\kern-1.01bp our plan should include the use of common laboratory apparatus, the two samples of baking\linebreak}
powder and water\kern-0.59bp . No other chemicals should be used.
\row{26.0}{72.3}{Y\kern-1.01bp our plan should include:}
\row{12.9}{95.0}{\lab{22.7}{\makebox[4.20bp][c]{\textbullet}}the apparatus needed}
\row{13.0}{95.0}{\lab{22.7}{\makebox[4.20bp][c]{\textbullet}}the method to use}
\row{13.0}{95.0}{\lab{22.7}{\makebox[4.20bp][c]{\textbullet}}the measurements to take}
\row{13.0}{95.0}{\lab{22.7}{\makebox[4.20bp][c]{\textbullet}}the variables to control}
\row{13.0}{95.0}{\lab{22.7}{\makebox[4.20bp][c]{\textbullet}}how to use the results to determine which sample has been stored for longer\kern-0.57bp .}
\row{26.0}{72.3}{Y\kern-1.01bp ou may draw a diagram to help you answer the question.}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.1}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.06}{541.78}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\newpage
\pagestart
\dotgrid{74.05}{541.77}{3.0570}
\dotline{13.0}{74.1}{}{}{544.8}
\dotgrid{74.05}{541.77}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.05}{541.77}{3.0570}
\dotline{26.0}{74.1}{}{}{544.8}
\dotgrid{74.05}{541.77}{3.0570}
\dotline{26.1}{74.1}{}{}{544.8}
\qmark{377.0}{[6]}
\newpage
\pagestart
\row{0.0}{49.6}{\textbf{Notes for use in qualitative analysis}}
\row{26.0}{49.6}{\textbf{T\kern-0.82bp ests for anions}}
\qfig{11}{47.10bp 473.02bp 46.38bp 113.31bp}{}{14.7}{0}{47.10}
\row{32.2}{49.6}{\textbf{T\kern-0.82bp ests for aqueous cations}}
\qfig{11}{47.10bp 184.61bp 46.38bp 415.76bp}{}{14.7}{0}{47.10}
\newpage
\pagestart
\row{0.0}{49.6}{\textbf{T\kern-0.82bp ests for gases}}
\qfig{12}{47.10bp 610.26bp 46.38bp 87.31bp}{}{14.7}{0}{47.10}
\row{32.2}{49.6}{\textbf{Flame tests for metal ions}}
\qfig{12}{47.10bp 146.63bp 46.74bp 278.50bp}{}{14.7}{0}{47.10}
\end{document}`.replace(/\\end\{document\}\s*$/, ''));
    const q = question(paper, 4);
    expect(everything(q)).not.toMatch(/Notes for use|Flame tests|ests for (anions|gases|aqueous)/);
    const all = [...q.stem, ...q.parts.flatMap((p) => [...p.content, ...p.subparts.flatMap((s) => s.content)])];
    expect(figures(all).filter((f) => f.type === 'figure' && (f.clip?.page ?? 0) >= 11)).toEqual([]);
  });

  it('"Question 11 is printed on the next page."', () => {
    // 4037/22/M/J/20 Q10, page 11
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/20}{10}{Arithmetic \& Geometric Progressions}{11}
\row{0.0}{94.96}{\lab{45.35}{\textbf{10}}\lab{22.68}{\textbf{(a)}}The first 5 terms of a sequence are given below\kern-0.75bp .}
\partbreak
\freerow{26.0}{%
  \at{195.97}{-0.01}{4}%
  \at{235.39}{2.66}{\swglyph{10}{235.39bp 745.95bp 352.37bp 94.42bp}}%
  \at{244.06}{-0.00}{2}%
  \at{283.40}{-0.00}{1}%
  \at{323.07}{2.66}{\swglyph{10}{323.07bp 745.95bp 264.69bp 94.42bp}}%
  \at{331.50}{-0.00}{0.5}%
  \at{379.18}{-0.00}{0.25}}
\partbreak
\row{26.01}{117.64}{\lab{22.68}{\textbf{(i)}}Find the 20th term of the sequence.\swmark{[2]}}
\partbreak
\row{197.24}{117.64}{\lab{22.68}{\textbf{(ii)}}Explain why the sum to infinity exists for this sequence and find the value of this sum.\swmark{[2]}}
\newpage
\pagestart
\partbreak
\row{0.0}{94.96}{\lab{22.68}{\textbf{(b)}}The\kern4.41bp tenth\kern4.41bp term\kern4.41bp of\kern4.42bp an\kern4.42bp arithmetic\kern4.41bp progression\kern4.42bp is\kern4.42bp 15\kern4.42bp times\kern4.42bp the\kern4.41bp second\kern4.42bp term.\kern4.21bp The\kern4.41bp sum\kern4.42bp of\kern4.42bp the\kern4.41bp first\linebreak}
6 terms of the progression is 87.
\partbreak
\row{26.0}{117.64}{\lab{22.68}{\textbf{(i)}}Find the common dif\kern-0.21bp ference of the progression.\swmark{[4]}}
\partbreak
\row{296.47}{117.64}{\lab{22.68}{\textbf{(ii)}}For this progression, the $n$th term is 6990. Find the value of $n$.\swmark{[3]}}
\freerow{377.0}{%
  \at{200.83}{-0.00}{\textbf{Question} \textbf{1}\kern-0.63bp \textbf{1} \textbf{is} \textbf{printed} \textbf{on} \textbf{the} \textbf{next} \textbf{page.}}}`);
    const q = question(paper, 10);
    expect(everything(q)).not.toMatch(/printed|next page/);
    expect(content(part(q, 'b', 'ii'))).toBe(canon('For this progression, the nth term is 6990. Find the value of n.'));
  });

  it('"Question 11(c) is printed on the next page." in the middle of a question', () => {
    // 4037/12/M/J/16 Q11, page 15
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{11}{Calculus for Kinematics}{12}
\row{0.0}{72.28}{\lab{22.67}{\textbf{1}\kern-0.63bp \textbf{1}}\textbf{(a)}}
\qfig{14}{77.34bp 515.13bp 91.02bp 87.76bp}{}{15.16}{0}{77.34}
\row{28.8}{94.96}{The diagram shows the velocity-time graph of a particle $P$ moving in a straight line with velocity\newline}
$v$ ms\raisebox{4.03bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1} at time $t$\kern1.45bp s after leaving a fixed point.
\partbreak
\row{26.0}{117.64}{\lab{22.2}{\textbf{(i)}}Find the distance travelled by the particle $P$.\swmark{[2]}}
\partbreak
\freerow{173.7}{%
  \at{92.24}{0.00}{\textbf{(ii)}}%
  \at{117.64}{0.00}{W\kern-0.46bp rite down the deceleration of the particle when\kern2.87bp $t$ = 30.}%
  \at{532.26}{0.00}{\swmark{[1]}}}
\newpage
\pagestart
\partbreak
\row{0.02}{94.96}{\lab{22.68}{\textbf{(b)}}The diagram shows a velocity-time graph of a particle $Q$ moving in a straight line with velocity\newline}
$v$ ms\raisebox{4.03bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}, at time $t$\kern1.45bp s after leaving a fixed point.
\qfig{15}{61.14bp 579.51bp 75.90bp 103.30bp}{}{17.68}{0}{61.14}
\row{28.43}{94.96}{The displacement of $Q$ at time $t$\kern1.46bp s is $s$\kern1.44bp m. On the axes below\kern-0.74bp , draw the corresponding\newline}
displacement-time graph for $Q$.\swmark{[2]}
\qfig{15}{73.74bp 284.64bp 76.26bp 322.57bp}{}{18.76}{0}{73.74}
\freerow{81.7}{%
  \at{194.46}{0.00}{\textbf{Question} \textbf{1}\kern-0.63bp \textbf{1(c)} \textbf{is} \textbf{printed} \textbf{on} \textbf{the} \textbf{next} \textbf{page.}}}
\newpage
\pagestart
\partbreak
\row{0.01}{94.96}{\lab{22.68}{\textbf{(c)}}The velocity\kern-0.75bp , $v$ ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}, of a particle $R$ moving in a straight line, $t$\kern1.46bp s after passing through a fixed\newline}
point $O$, is given by\kern3.72bp $v$\kern3.14bp $=$\kern3.15bp 4e\kern0.55bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont 2$t$}\kern2.53bp $+$\kern2.37bp 6\kern0.65bp .
\partbreak
\row{26.01}{117.64}{\lab{22.2}{\textbf{(i)}}Explain why the particle is never at rest.\swmark{[1]}}
\partbreak
\freerow{90.99}{%
  \at{92.24}{-0.01}{\textbf{(ii)}}%
  \at{117.64}{-0.01}{Find the exact value of $t$ for which the acceleration of $R$ is $12 \mathrm{ms}^{-2}$.}%
  \at{532.26}{-0.01}{\hfill\swmark{[2]}}}
\partbreak
\freerow{169.0}{%
  \at{89.05}{-0.01}{\textbf{(iii)}}%
  \at{117.63}{-0.01}{Showing all your working, find the distance travelled by $R$ in the interval between\kern3.52bp $t$\kern3.15bp $=$\kern3.15bp 0.4}}
\row{13.0}{117.64}{and\kern3.50bp $t$\kern3.15bp $=$\kern3.15bp 0.5\kern0.31bp .\swmark{[4]}}
\end{document}`);
    expect(everything(question(paper, 11))).not.toMatch(/printed|next page/);
  });

  it('the total', () => {
    // 5070/21/M/J/24 Q8, page 13: "[Total: 9]"
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/24}{8}{Carboxylic Acids \textperiodcentered\ Alcohols}{9}
\row{26.0}{95.0}{\lab{22.7}{\textbf{(f) }}State the name of ester \textbf{G}.}
\total{26.0}`);
    expect(everything(question(paper, 8))).not.toMatch(/Total|otal|26\.0/);
  });

  it('a heading and rubric between two sections', () => {
    // 5054/21/M/J/16: "Section B" and its rubric head page 14, above Q10
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/16}{9}{Uses of Oscilloscope \textperiodcentered\ Electric Circuits}{4}
\row{0.6}{72.3}{\lab{22.7}{\textbf{9 }}\textbf{EITHER}}
\row{26.0}{72.3}{Fig. 9.1 shows a cathode-ra\kern-0.33bp y oscilloscope (c.r\kern-0.55bp .o\kern-0.44bp .). An alternating voltage supply is applied to the\linebreak}
input and the trace produced is shown.
\row{30.2}{319.8}{1 division}
\qfig{12}{100.38bp 422.47bp 106.80bp 144.87bp}{}{2.5}{0}{100.38}
\row{29.0}{278.9}{\textbf{Fig. 9.1}}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}Use Fig. 9.1 to determine the maximum voltage of the supply\kern-1.10bp .}
\dotgrid{352.32}{526.63}{3.0580}
\dotline{78.0}{302.5}{voltage =}{[2]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Describe how the trace on the screen and the controls on the c.r\kern-0.55bp .o\kern-0.44bp . are used to measure the\linebreak}
time between any two points on the trace.
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.6}
\newpage
\pagestart
\row{0.6}{72.3}{\textbf{OR}}
\row{26.0}{72.3}{The circuit diagram shown in Fig. 9.2 uses an LDR as the sensor in an automatic night light.}
\qfig{13}{184.62bp 574.80bp 195.00bp 112.80bp}{}{13.6}{0}{184.62}
\row{24.5}{278.9}{\textbf{Fig. 9.2}}
\row{26.0}{72.3}{When it gets dark, the lamp turns on.}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State the name of component A.}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[1]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Explain wh\kern-0.33bp y the lamp turns on when it gets dark.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.69}{3.0580}
\dotline{26.0}{94.9}{}{[3]}{545.6}
\newpage
\pagestart
\row{0.6}{272.2}{\textbf{Section B}}
\qfig{14}{121.26bp 737.96bp 120.84bp 88.24bp}{}{15.0}{0}{121.26}`);
    const q = question(paper, 9);
    expect(everything(q)).not.toMatch(/Section B/);
    const all = [...q.stem, ...q.parts.flatMap((p) => [...p.content, ...p.subparts.flatMap((s) => s.content)])];
    expect(figures(all).map((f) => f.type === 'figure' && f.clip?.page)).not.toContain(14);
  });

  it('text that only mentions a page is question text', () => {
    // 5054/42/M/J/21 Q1(c), page 4: "On the grid provided in Fig. 1.3 on page 5, plot a graph"
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/42/M/J/21}{1}{Electrical Quantities \textperiodcentered\ Electric Circuits}{14}
\row{26.0}{94.9}{\lab{22.6}{\textbf{(c)}}{\advance\spaceskip0.05bp\advance\xspaceskip0.05bp\textls[+5]{On the grid provided in Fig. 1.3 on page 5, plot a graph of \rlap{\kern1.19bp\raisebox{6.20bp}[0pt][0pt]{1}}\rlap{\kern0.01bp\raisebox{-6.80bp}[0pt][0pt]{{\itshape V}}}\rlap{\kern0.00bp\raisebox{3.06bp}[0pt][0pt]{\rule{8.50bp}{0.30bp}}}\kern8.50bp {} on the {\itshape y}-axis against {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }on the}}\linebreak}
$x$-axis.`);
    expect(everything(question(paper, 1))).toContain('on page 5, plot a graph of');
  });
});

describe('text: options in a column inside a placed block (round 1)', () => {
  it('A to C placed in one \\freerow, D set as a \\choice', () => {
    // 5054/11/M/J/23 Q2, page 2: "Which equation contains two vector quantities?"
    // A acceleration = change in velocity / time taken   B average speed = distance travelled / time taken
    // C density = mass / volume   D volume = length × width × height
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/23}{2}{Physical Quantities and Measurements}{1}
\mcq{38.1}{\textbf{2 }}{Which equation contains two vector quantities?}
\freerow{24.3}{%
  \at{70.86}{-7.04}{\textbf{A}}%
  \at{92.09}{-7.04}{acceleration $= \; \dfrac{\mathrm{change} \mathrm{in} \mathrm{velocity}}{\mathrm{time} \mathrm{taken}}$}%
  \at{70.86}{-41.06}{\textbf{B}}%
  \at{92.09}{-41.06}{average speed $= \; \dfrac{\mathrm{distance} \mathrm{travelled}}{\mathrm{time} \mathrm{taken}}$}%
  \at{70.86}{-75.02}{\textbf{C}}%
  \at{92.09}{-75.02}{density $= \; \dfrac{\mathrm{mass}}{\mathrm{volume}}$}%
  \swdepth{85.92}}
\choice{104.1}{\textbf{D }}{volume = length $\times$ width $\times$ height}`);
    const q = question(paper, 2);
    expect(sentences(q.stem)).toEqual(['Which equation contains two vector quantities?']);
    expect(q.options?.items.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    const [a, b, c, d] = q.options!.items.map((o) => o.content);
    // The fractions are typed: never rewritten (rule 4), so they are compared as typed.
    expect(a).toContain(String.raw`\dfrac{\mathrm{change} \mathrm{in} \mathrm{velocity}}{\mathrm{time} \mathrm{taken}}`);
    expect(b).toContain(String.raw`\dfrac{\mathrm{distance} \mathrm{travelled}}{\mathrm{time} \mathrm{taken}}`);
    expect(c).toContain(String.raw`\dfrac{\mathrm{mass}}{\mathrm{volume}}`);
    expect(canon(a)).toMatch(/^acceleration ?=/);
    expect(canon(b)).toMatch(/^average speed ?=/);
    expect(canon(c)).toMatch(/^density ?=/);
    expect(canon(d)).toBe(canon('volume = length $\\times$ width $\\times$ height'));
    expect(everything({ ...q, options: null })).not.toMatch(/acceleration|density|volume/);
  });
});
