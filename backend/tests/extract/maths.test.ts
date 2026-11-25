/**
 * Equations of Additional Mathematics 4037, drawn piece by piece.
 *
 * Every expected value was typed from the printed PDF page named beside it.
 * Two contracts (see helpers.ts):
 *   correct           simple scripts, fractions, roots and modulus bars: the
 *                     LaTeX says all of it, so it must be read, and read right
 *   correctOrPassed   anything harder: right, or flagged. Never quietly wrong
 */

import { describe, expect, it } from 'vitest';
import type { Block } from '../../src/latex/types.js';
import { canon, content, correct, correctOrPassed, everything, paperOf, part, question, stem } from './helpers.js';
import { MATHS } from './preambles.js';

const raw = (blocks: Block[]) => blocks.map((b) => (b.type === 'figure' ? '' : b.html)).join('\n');

describe('maths: typed maths is never rewritten', () => {
  it('keeps a typed fraction of surds exactly as typed', () => {
    // 4037/12/M/J/16 Q4, page 6 (second line)
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{4}{Quadratic Functions \textperiodcentered\ Indices \& Surds}{6}
\freerow{20.5}{%
  \at{72.29}{-6.03}{form $\dfrac{a + \sqrt{5}}{b}$, where $a$ and $b$ are integers.}%
  \at{532.26}{-6.03}{\hfill\swmark{[6]}}%
  \swdepth{14.80}}`);
    const q = question(paper, 4);
    expect(raw(q.stem)).toBe(String.raw`form $\dfrac{a + \sqrt{5}}{b}$, where $a$ and $b$ are integers.`);
    correct(paper, 4, stem(q), String.raw`form $\dfrac{a + \sqrt{5}}{b}$, where a and b are integers.`);
  });

  it('keeps typed matrices exactly as typed', () => {
    // 4037/11/M/J/16 Q4(a), page 5
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/16}{4}{Excluded from the present curriculum \textperiodcentered\ Simultaneous Equations}{7}
\freerow{-0.84}{%
  \at{49.61}{-12.35}{\textbf{4}}%
  \at{72.28}{-12.35}{\textbf{(a)}}%
  \at{94.96}{-12.35}{Given the matrices \textbf{A} $= \begin{pmatrix}- 1 & 2\\3 & 0\end{pmatrix}$ and \textbf{B} $= \begin{pmatrix}3 & 0\\1 & 2\end{pmatrix}$ , find $\mathrm{A}^{2} -$ 2\textbf{B} .}%
  \at{532.26}{-12.35}{\hfill\swmark{[3]}}%
  \swdepth{27.01}}`);
    const a = part(question(paper, 4), 'a');
    expect(raw(a.content)).toContain(String.raw`\begin{pmatrix}- 1 & 2\\3 & 0\end{pmatrix}`);
    expect(raw(a.content)).toContain(String.raw`\begin{pmatrix}3 & 0\\1 & 2\end{pmatrix}`);
    expect(raw(a.content)).toContain(String.raw`$\mathrm{A}^{2} -$`);
    correct(paper, 4, content(a), String.raw`Given the matrices A = $\begin{pmatrix}-1&2\\3&0\end{pmatrix}$ and
      B = $\begin{pmatrix}3&0\\1&2\end{pmatrix}$, find $A^2-2B$.`);
    expect(a.marks).toBe(3);
  });

  it('keeps a typed fraction of powers set on a line of its own', () => {
    // 4037/22/O/N/18 Q5, page 6
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/O/N/18}{5}{Simultaneous Equations \textperiodcentered\ Indices \& Surds}{5}
\row{-0.34}{72.29}{\lab{22.68}{\textbf{5}}Solve the simultaneous equations}
\freerow{27.56}{%
  \at{210.70}{-5.65}{$\dfrac{8^{p+1}}{4^{q}} = 2^{11}$,}%
  \swdepth{15.64}}`);
    const q = question(paper, 5);
    expect(raw(q.stem)).toContain(String.raw`$\dfrac{8^{p+1}}{4^{q}} = 2^{11}$,`);
    correct(paper, 5, stem(q), String.raw`Solve the simultaneous equations $\frac{8^{p+1}}{4^q}=2^{11}$,`);
  });
});

describe('maths: simple scripts must be read', () => {
  it('a power raised inside a sentence', () => {
    // 4037/12/M/J/16 Q8, page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{8}{Straight-Line Graphs \textperiodcentered\ Logarithmic \& Exponential Functions}{8}
\row{25.78}{72.28}{V\kern-1.28bp ariables $x$ and $y$ are such that when\kern3.62bp lg\kern1.55bp $y$\kern3.93bp is plotted against\kern4.38bp $x$\kern0.55bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont 2}\kern1.09bp , the straight line graph shown above is\newline}
obtained.`);
    correct(paper, 8, stem(question(paper, 8)),
      'Variables x and y are such that when lg y is plotted against $x^2$, the straight line graph shown above is obtained.');
  });

  it('a raised exponent with a sign, in a unit', () => {
    // 4037/11/M/J/16 Q7, page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/16}{7}{Vectors in Two Dimensions}{8}
\row{28.95}{72.28}{The\kern3.42bp diagram\kern3.42bp shows\kern3.42bp a\kern3.42bp river\kern3.42bp with\kern3.42bp parallel\kern3.41bp banks.\kern3.21bp The\kern3.42bp river\kern3.42bp is\kern3.42bp 75\kern1.46bp m\kern3.42bp wide\kern3.42bp and\kern3.42bp is\kern3.42bp flowing\kern3.42bp with\kern3.42bp a\kern3.42bp speed\kern3.42bp of\linebreak}
2.4\kern1.44bp ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}.\kern2.47bp A\kern2.48bp speedboat\kern3.11bp travels\kern3.11bp in\kern3.12bp a\kern3.11bp straight\kern3.11bp line\kern3.11bp from\kern3.12bp a\kern3.11bp point\kern3.13bp $A$\kern3.12bp on\kern3.12bp one\kern3.11bp bank\kern3.12bp to\kern3.11bp a\kern3.12bp point\kern3.11bp $B$\kern3.12bp on\kern3.12bp the\kern3.11bp opposite\linebreak
bank, 30\kern1.44bp m downstream from $A$.\kern2.67bp The speedboat can travel at a speed of 4.5\kern1.42bp ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1} in still water\kern-0.63bp .`);
    correct(paper, 7, stem(question(paper, 7)),
      `The diagram shows a river with parallel banks. The river is 75 m wide and is flowing with a speed of 2.4 ms$^{-1}$.
       A speedboat travels in a straight line from a point A on one bank to a point B on the opposite bank, 30 m downstream
       from A. The speedboat can travel at a speed of 4.5 ms$^{-1}$ in still water.`);
  });

  it('the base of a logarithm', () => {
    // 4037/12/M/J/24 Q2, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/24}{2}{Logarithmic \& Exponential Functions}{3}
\row{160.4}{72.29}{\lab{22.68}{\textbf{2}}Given that\kern9.37bp log\kern0.35bp $_{3}$\kern1.16bp $r$\kern1.56bp $+$\kern1.56bp 2\kern1.56bp log\kern0.34bp $_{9}$\kern1.16bp $s$\kern3.15bp $=$\kern3.16bp 8\kern0.43bp ,\kern8.62bp find the value of $rs$.\swmark{[3]}}`);
    correct(paper, 2, stem(question(paper, 2)), String.raw`Given that $\log_3 r+2\log_9 s=8$, find the value of rs.`);
  });

  it('indices on the names of points', () => {
    // 4037/22/M/J/20 Q11, page 12
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/20}{11}{Circular Measure}{8}
\row{26.21}{72.28}{The\kern3.66bp circles\kern3.67bp with\kern3.66bp centres\kern3.67bp $C$\raisebox{-4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont 1}\kern3.67bp and\kern3.66bp $C$\raisebox{-4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont 2}\kern3.67bp have\kern3.67bp equal\kern3.66bp radii\kern3.67bp of\kern3.67bp length\kern3.65bp $r$\kern1.44bp cm.\kern3.46bp The\kern3.67bp line\kern3.67bp $C$\raisebox{-4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont 1}$C$\raisebox{-4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont 2}\kern3.67bp is\kern3.67bp a\kern3.66bp radius\kern3.66bp of\kern3.67bp both\linebreak}
circles.\kern2.67bp The two circles intersect at $A$ and $B$.`);
    correct(paper, 11, stem(question(paper, 11)),
      `The circles with centres $C_1$ and $C_2$ have equal radii of length r cm. The line $C_1C_2$ is a radius of both
       circles. The two circles intersect at A and B.`);
  });

  it('an exponential', () => {
    // 4037/12/M/J/16 Q11(c), page 16
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{11}{Calculus for Kinematics}{12}
\row{0.01}{94.96}{\lab{22.68}{\textbf{(c)}}The velocity\kern-0.75bp , $v$ ms\raisebox{4.02bp}[0pt][0pt]{\fontsize{8.62bp}{8.62bp}\selectfont \textendash{}1}, of a particle $R$ moving in a straight line, $t$\kern1.46bp s after passing through a fixed\newline}
point $O$, is given by\kern3.72bp $v$\kern3.14bp $=$\kern3.15bp 4e\kern0.55bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont 2$t$}\kern2.53bp $+$\kern2.37bp 6\kern0.65bp .`);
    correct(paper, 11, content(part(question(paper, 11), 'c')),
      String.raw`The velocity, v ms$^{-1}$, of a particle R moving in a straight line, t s after passing through a fixed
       point O, is given by $v=4e^{2t}+6$.`);
  });
});

describe('maths: modulus bars drawn as rectangles must be read', () => {
  it('one pair', () => {
    // 4037/23/O/N/18 Q1, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/23/O/N/18}{1}{Equations, Inequalities \& Graphs}{3}
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
  \at{532.85}{-0.00}{\swmark{[3]}}}`);
    correct(paper, 1, stem(question(paper, 1)), 'Solve the equation $|5x-3|=-3x+13$.');
  });

  it('two pairs on one line', () => {
    // 4037/22/M/J/17 Q1, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/17}{1}{Equations, Inequalities \& Graphs}{3}
\freerow{2.5}{%
  \at{49.61}{0.00}{\textbf{1}}%
  \at{72.28}{0.00}{Solve\kern6.78bp 5{\itshape x}\kern2.36bp {\itshape +}\kern2.36bp 3\kern5.97bp {\itshape =}\kern5.96bp 1}%
  \at{162.77}{0.48}{\swsy{2D}}%
  \at{172.48}{0.00}{3{\itshape x}\kern3.90bp .}%
  \swpath{fill=black}{(52.85,-2.12) rectangle (53.35,9.38)}{}%
  \swpath{fill=black}{(87.13,-2.12) rectangle (87.63,9.38)}{}%
  \swpath{fill=black}{(101.75,-2.12) rectangle (102.25,9.38)}{}%
  \swpath{fill=black}{(136.03,-2.12) rectangle (136.53,9.38)}{}%
  \at{532.26}{0.00}{\swmark{[3]}}}`);
    correct(paper, 1, stem(question(paper, 1)), 'Solve $|5x+3|=|1-3x|$.');
  });

  it('a pair around an expression with a power, the bars closing after it', () => {
    // 4037/21/M/J/16 Q6(ii), page 7
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/16}{6}{Quadratic Functions \textperiodcentered\ Equations, Inequalities \& Graphs}{8}
\freerow{202.57}{%
  \at{69.57}{-0.01}{\textbf{(ii)}}%
  \at{94.96}{-0.01}{State the coordinates of the vertex of\kern7.78bp {\itshape y}\kern3.14bp {\itshape =}\kern5.96bp 4{\itshape x}}%
  \at{305.42}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{311.80}{-0.00}{{\itshape +}\kern2.36bp 8{\itshape x}}%
  \at{335.69}{0.48}{\swsy{2D}}%
  \at{345.39}{-0.00}{5\kern6.78bp .}%
  \swpath{fill=black}{(241.60,-1.04) rectangle (242.10,10.46)}{}%
  \swpath{fill=black}{(303.85,-1.04) rectangle (304.35,10.46)}{}%
  \at{532.26}{-0.00}{\swmark{[2]}}}`);
    const ii = part(question(paper, 6), 'ii');
    correct(paper, 6, content(ii), 'State the coordinates of the vertex of $y=|4x^2+8x-5|$.');
    expect(ii.marks).toBe(2);
  });

  it('only the first of two graphs is inside bars', () => {
    // 4037/11/M/J/17 Q8(i) and (ii), page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/17}{8}{Equations, Inequalities \& Graphs \textperiodcentered\ Quadratic Functions}{11}
\freerow{3.69}{%
  \at{49.61}{0.00}{\textbf{8}}%
  \at{72.77}{0.00}{\textbf{(i)}}%
  \at{94.96}{0.00}{On the axes below sketch the graphs of\kern10.66bp {\itshape y}\kern3.15bp {\itshape =}\kern5.96bp 2{\itshape x}}%
  \at{321.79}{0.48}{\swsy{2D}}%
  \at{331.49}{0.00}{5}%
  \at{349.77}{0.00}{and\kern9.28bp 9{\itshape y}\kern3.15bp {\itshape =}\kern3.15bp 80{\itshape x}}%
  \at{420.07}{0.48}{\swsy{2D}}%
  \at{429.77}{0.00}{16{\itshape x}}%
  \at{446.94}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{452.03}{0.00}{.}%
  \swpath{fill=black}{(255.67,-2.12) rectangle (256.17,9.38)}{}%
  \swpath{fill=black}{(289.95,-2.12) rectangle (290.45,9.38)}{}%
  \at{532.27}{0.00}{\swmark{[5]}}}
\freerow{26.14}{%
  \at{69.57}{-0.00}{\textbf{(ii)}}%
  \at{94.96}{-0.00}{Solve\kern6.78bp 2{\itshape x}}%
  \at{141.63}{0.48}{\swsy{2D}}%
  \at{151.34}{-0.00}{5\kern5.97bp {\itshape =}\kern3.15bp 4\kern0.69bp .}%
  \swpath{fill=black}{(75.52,-2.13) rectangle (76.02,9.37)}{}%
  \swpath{fill=black}{(109.80,-2.13) rectangle (110.30,9.37)}{}%
  \at{532.26}{-0.00}{\swmark{[3]}}}`);
    const q = question(paper, 8);
    correct(paper, 8, content(part(q, 'i')), 'On the axes below sketch the graphs of $y=|2x-5|$ and $9y=80x-16x^2$.');
    correct(paper, 8, content(part(q, 'ii')), 'Solve $|2x-5|=4$.');
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['i', 5], ['ii', 3]]);
  });
});

describe('maths: roots and fractions must be read', () => {
  it('a root over a difference of roots', () => {
    // 4037/21/M/J/16 Q5(a), page 6
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/16}{5}{Indices \& Surds}{6}
\freerow{19.96}{%
  \at{159.90}{-0.00}{8}%
  \at{72.28}{-6.04}{\textbf{(a)}}%
  \at{94.96}{-6.04}{Express}%
  \at{183.31}{-6.04}{in the form}%
  \at{246.34}{-6.04}{{\itshape a}\kern2.38bp {\itshape +}}%
  \at{272.62}{-6.04}{{\itshape b}\kern1.10bp , where {\itshape a} and {\itshape b} are integers.}%
  \at{146.74}{-14.20}{7}%
  \at{155.34}{-13.72}{\swsy{2D}}%
  \at{173.02}{-14.20}{5}%
  \ruleat{138.21}{179.34}{-2.57}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(89.88,-10.15)--(90.71,-9.66)--(93.36,-14.41)}{\clip (92.66,-4.51)--(92.66,-8.10)--(89.62,-9.90)--(89.88,-10.16)--(90.72,-9.66)--(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)--(102.89,-4.51)--(92.66,-4.51);}%
  \swpath{draw=black,line width=1.00bp}{(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)}{\clip (92.66,-4.51)--(92.66,-8.10)--(89.62,-9.90)--(89.88,-10.16)--(90.72,-9.66)--(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)--(102.89,-4.51)--(92.66,-4.51);}%
  \swpath{draw=black,line width=1.80bp}{(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)}{\clip (105.82,9.68)--(105.82,6.09)--(102.77,4.29)--(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)--(109.64,9.18)--(116.05,9.18)--(116.05,9.68)--(105.82,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(106.52,-0.23)--(109.65,9.18)--(116.05,9.18)}{\clip (105.82,9.68)--(105.82,6.09)--(102.77,4.29)--(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)--(109.64,9.18)--(116.05,9.18)--(116.05,9.68)--(105.82,9.68);}%
  \swpath{draw=black,line width=1.80bp}{(116.16,-10.15)--(117.00,-9.66)--(119.64,-14.41)}{\clip (118.94,-4.51)--(118.94,-8.10)--(115.90,-9.90)--(116.16,-10.16)--(117.00,-9.66)--(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)--(129.18,-4.51)--(118.94,-4.51);}%
  \swpath{draw=black,line width=1.00bp}{(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)}{\clip (118.94,-4.51)--(118.94,-8.10)--(115.90,-9.90)--(116.16,-10.16)--(117.00,-9.66)--(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)--(129.18,-4.51)--(118.94,-4.51);}%
  \swpath{draw=black,line width=1.80bp}{(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)}{\clip (192.26,3.65)--(192.26,0.06)--(189.22,-1.74)--(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)--(202.49,3.65)--(192.26,3.65);}%
  \swpath{draw=black,line width=1.00bp}{(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)}{\clip (192.26,3.65)--(192.26,0.06)--(189.22,-1.74)--(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)--(202.49,3.65)--(192.26,3.65);}%
  \swpath{draw=black,line width=1.80bp}{(215.76,-2.00)--(216.59,-1.50)--(219.24,-6.26)}{\clip (218.54,3.65)--(218.54,0.06)--(215.50,-1.74)--(215.76,-2.00)--(216.60,-1.50)--(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)--(228.77,3.65)--(218.54,3.65);}%
  \swpath{draw=black,line width=1.00bp}{(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)}{\clip (218.54,3.65)--(218.54,0.06)--(215.50,-1.74)--(215.76,-2.00)--(216.60,-1.50)--(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)--(228.77,3.65)--(218.54,3.65);}%
  \at{532.26}{-6.04}{\swmark{[3]}}%
  \swdepth{16.50}}`);
    const a = part(question(paper, 5), 'a');
    correct(paper, 5, content(a),
      String.raw`Express $\frac{\sqrt8}{\sqrt7-\sqrt5}$ in the form $\sqrt a+\sqrt b$, where a and b are integers.`);
    expect(a.marks).toBe(3);
  });

  it('roots on both lines of a fraction', () => {
    // 4037/11/M/J/18 Q10(a), page 13
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/18}{10}{Indices \& Surds}{9}
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
  \swdepth{16.50}}`);
    correct(paper, 10, content(part(question(paper, 10), 'a')), String.raw`Simplify $\frac{5+6\sqrt5}{6+\sqrt5}$.`);
  });

  it('two fractions and a root along one sentence', () => {
    // 4037/12/M/J/18 Q10, page 12
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/18}{10}{Trigonometry \textperiodcentered\ Indices \& Surds}{8}
\freerow{19.96}{%
  \at{201.28}{-0.00}{3}%
  \at{262.78}{-0.00}{1}%
  \at{72.28}{-6.04}{It is known that\kern3.41bp sin\kern1.55bp 60\textdegree{}\kern3.15bp {\itshape =}}%
  \at{208.68}{-6.04}{,\kern3.57bp cos\kern1.54bp 60\textdegree{}\kern3.15bp {\itshape =}}%
  \at{270.18}{-6.04}{,\kern3.84bp tan\kern1.54bp 60\textdegree{}\kern3.15bp {\itshape =}}%
  \at{330.69}{-6.04}{3\kern1.09bp .}%
  \at{197.31}{-12.29}{2}%
  \at{262.78}{-12.29}{2}%
  \ruleat{192.75}{207.59}{-2.57}{0.50}%
  \ruleat{262.22}{269.09}{-2.57}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(144.41,4.03)--(145.25,4.53)--(147.89,-0.23)}{\clip (147.19,9.68)--(147.19,6.09)--(144.15,4.29)--(144.41,4.03)--(145.25,4.53)--(147.89,-0.23)--(151.02,9.18)--(157.43,9.18)--(157.43,9.68)--(147.19,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(147.89,-0.22)--(151.02,9.18)--(157.43,9.18)}{\clip (147.19,9.68)--(147.19,6.09)--(144.15,4.29)--(144.41,4.03)--(145.25,4.53)--(147.89,-0.23)--(151.02,9.18)--(157.43,9.18)--(157.43,9.68)--(147.19,9.68);}%
  \swpath{draw=black,line width=1.80bp}{(273.81,-2.00)--(274.65,-1.50)--(277.30,-6.26)}{\clip (276.60,3.65)--(276.60,0.06)--(273.55,-1.74)--(273.82,-2.00)--(274.66,-1.50)--(277.30,-6.26)--(280.43,3.15)--(286.83,3.15)--(286.83,3.65)--(276.60,3.65);}%
  \swpath{draw=black,line width=1.00bp}{(277.30,-6.26)--(280.43,3.15)--(286.83,3.15)}{\clip (276.60,3.65)--(276.60,0.06)--(273.55,-1.74)--(273.82,-2.00)--(274.66,-1.50)--(277.30,-6.26)--(280.43,3.15)--(286.83,3.15)--(286.83,3.65)--(276.60,3.65);}%
  \swdepth{14.59}}`);
    correct(paper, 10, stem(question(paper, 10)),
      String.raw`It is known that $\sin60°=\frac{\sqrt3}{2}$, $\cos60°=\frac12$, $\tan60°=\sqrt3$.`);
  });

  it('a fraction of products of powers', () => {
    // 4037/12/M/J/18 Q12(a), page 16
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/18}{12}{Indices \& Surds}{7}
\freerow{19.97}{%
  \at{154.16}{0.00}{6}%
  \at{161.38}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape p}}}%
  \at{168.47}{0.48}{\swsy{B4}}%
  \at{176.60}{0.00}{8}%
  \at{183.82}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape p}\kern1.12bp {\itshape +}\kern1.12bp 2}}%
  \at{202.60}{0.48}{\swsy{B4}}%
  \at{210.73}{0.00}{3}%
  \at{217.04}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape q}}}%
  \at{292.71}{-0.87}{{\fontsize{8.00bp}{8.00bp}\selectfont 7}}%
  \at{315.59}{-0.87}{{\fontsize{8.00bp}{8.00bp}\selectfont 4}}%
  \at{72.28}{-6.03}{\textbf{(a)}}%
  \at{94.96}{-6.03}{Given\kern3.05bp that}%
  \at{180.91}{-9.90}{{\fontsize{8.00bp}{8.00bp}\selectfont 2{\itshape q}}}%
  \at{190.37}{-9.57}{{\fontsize{8.00bp}{8.00bp}\selectfont \swsy{2D}}}%
  \at{196.60}{-9.90}{{\fontsize{8.00bp}{8.00bp}\selectfont 3}}%
  \at{231.84}{-6.03}{is\kern3.05bp equal\kern3.05bp to\kern6.94bp 2}%
  \at{299.96}{-5.45}{{\fontsize{13.92bp}{13.92bp}\selectfont \swsy{B4}}}%
  \at{309.27}{-6.03}{3\kern5.66bp ,\kern6.09bp find\kern3.05bp the\kern3.05bp value\kern3.05bp of\kern3.05bp each\kern3.05bp of\kern3.05bp the\kern3.05bp constants\kern3.05bp {\itshape p}\kern3.05bp and\kern3.05bp {\itshape q}.}%
  \at{174.61}{-15.06}{9}%
  \ruleat{153.60}{221.60}{-2.56}{0.50}%
  \at{532.26}{-19.02}{\swmark{[3]}}%
  \swdepth{21.32}}`);
    correct(paper, 12, content(part(question(paper, 12), 'a')),
      String.raw`Given that $\frac{6^p\times8^{p+2}\times3^q}{9^{2q-3}}$ is equal to $2^7\times3^4$, find the value of
       each of the constants p and q.`);
  });

  it('two lines of prose with Symbol-font pi, powers and a fraction', () => {
    // 4037/22/O/N/22 Q8, page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/O/N/22}{8}{Differentiation}{10}
\freerow{26.0}{%
  \at{72.28}{-0.01}{The volume of a cylinder with radius {\itshape r} and height {\itshape h} is}%
  \at{324.33}{-0.00}{\swsy{70}}%
  \at{331.03}{-0.00}{{\itshape r}}%
  \at{336.06}{5.15}{{\fontsize{8.05bp}{8.05bp}\selectfont 2}}%
  \at{340.66}{-0.00}{{\itshape h}\kern3.59bp and its curved surface area is\kern3.72bp 2}%
  \at{492.85}{-0.00}{\swsy{70}}%
  \at{499.55}{-0.00}{{\itshape rh}\kern0.71bp .}%
  \at{263.33}{-9.97}{4}%
  \at{282.80}{-10.85}{{\fontsize{8.05bp}{8.05bp}\selectfont 3}}%
  \at{417.03}{-10.85}{{\fontsize{8.05bp}{8.05bp}\selectfont 2}}%
  \at{72.28}{-16.00}{The volume of a sphere with radius {\itshape r} is}%
  \at{271.07}{-16.00}{\swsy{70}}%
  \at{277.77}{-16.00}{{\itshape r}}%
  \at{296.55}{-16.00}{and its surface area is\kern3.78bp 4}%
  \at{405.30}{-16.00}{\swsy{70}}%
  \at{412.00}{-16.00}{{\itshape r}\kern5.68bp .}%
  \at{263.33}{-22.25}{3}%
  \ruleat{262.77}{269.64}{-12.53}{0.50}%
  \swdepth{24.55}}
\row{28.8}{72.28}{The\kern4.49bp diagram\kern4.50bp shows\kern4.49bp a\kern4.49bp solid\kern4.50bp object\kern4.49bp in\kern4.49bp the\kern4.49bp shape\kern4.49bp of\kern4.50bp a\kern4.49bp cylinder\kern4.49bp of\kern4.50bp base\kern4.49bp radius\kern4.48bp $r$\kern4.49bp and\kern4.49bp height\kern4.48bp $h$,\kern4.50bp with\kern4.49bp a\linebreak}
hemisphere of radius $r$ on top.\kern2.68bp The total surface area of the object is\kern3.49bp 300\kern1.56bp cm\kern0.55bp $^{2}$\kern1.10bp .`);
    correct(paper, 8, stem(question(paper, 8)),
      // The excerpt also holds the row under the figure, which page 8 prints.
      String.raw`The volume of a cylinder with radius r and height h is $\pi r^2h$ and its curved surface area is $2\pi rh$.
       The volume of a sphere with radius r is $\frac43\pi r^3$ and its surface area is $4\pi r^2$.
       The diagram shows a solid object in the shape of a cylinder of base radius r and height h, with a
       hemisphere of radius r on top. The total surface area of the object is 300 cm$^2$.`);
  });
});

describe('maths: harder equations are right or flagged', () => {
  it('a cube root', () => {
    // 4037/21/M/J/22 Q3, page 4
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/22}{3}{Straight-Line Graphs}{4}
\freerow{3.72}{%
  \at{49.61}{0.00}{\textbf{3}}%
  \at{72.28}{0.00}{V\kern-1.27bp ariables {\itshape x} and {\itshape y} are such that when}%
  \at{243.77}{4.06}{{\fontsize{8.05bp}{8.05bp}\selectfont 3}}%
  \at{251.65}{0.00}{{\itshape y}\kern3.97bp is plotted against\kern4.40bp {\itshape x}}%
  \at{348.72}{5.16}{{\fontsize{8.05bp}{8.05bp}\selectfont 2}}%
  \at{352.75}{0.00}{,\kern3.45bp a straight line passing through the points}%
  \swpath{draw=black,line width=1.20bp}{(194.24,2.40)--(194.83,3.00)--(196.64,-2.47)}{\clip (196.14,9.69)--(196.14,4.84)--(193.98,2.65)--(194.24,2.40)--(194.83,3.00)--(196.64,-2.47)--(200.25,9.19)--(207.14,9.19)--(207.14,9.69)--(196.14,9.69);}%
  \swpath{draw=black,line width=1.00bp}{(196.64,-2.47)--(200.25,9.19)--(207.14,9.19)}{\clip (196.14,9.69)--(196.14,4.84)--(193.98,2.65)--(194.24,2.40)--(194.83,3.00)--(196.64,-2.47)--(200.25,9.19)--(207.14,9.19)--(207.14,9.69)--(196.14,9.69);}}`);
    correctOrPassed(paper, 3, stem(question(paper, 3)),
      String.raw`Variables x and y are such that when $\sqrt[3]{y}$ is plotted against $x^2$, a straight line passing
       through the points`);
  });

  it('a fourth root and a fraction in one sentence', () => {
    // 4037/21/M/J/20 Q1, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/20}{1}{Straight-Line Graphs}{4}
\freerow{0.91}{%
  \at{347.53}{0.00}{1}%
  \at{49.61}{-6.03}{\textbf{1}}%
  \at{72.28}{-6.03}{V\kern-1.27bp ariables\kern3.01bp {\itshape x}\kern3.00bp and\kern3.00bp {\itshape y}\kern3.00bp are\kern3.00bp such\kern3.00bp that,\kern3.01bp when}%
  \at{247.61}{-2.06}{{\fontsize{8.05bp}{8.05bp}\selectfont 4}}%
  \at{255.48}{-6.03}{{\itshape y}\kern4.09bp is\kern3.00bp plotted\kern3.01bp against}%
  \at{353.84}{-6.03}{,\kern3.56bp a\kern3.00bp straight\kern3.01bp line\kern3.01bp graph\kern3.00bp passing\kern3.00bp through\kern3.00bp the}%
  \at{348.06}{-11.93}{{\itshape x}}%
  \ruleat{346.97}{353.84}{-2.56}{0.50}%
  \swpath{draw=black,line width=1.20bp}{(198.07,-3.63)--(198.67,-3.02)--(200.47,-8.49)}{\clip (199.97,3.66)--(199.97,-1.19)--(197.82,-3.38)--(198.07,-3.63)--(198.67,-3.03)--(200.47,-8.50)--(204.08,3.16)--(210.97,3.16)--(210.97,3.66)--(199.97,3.66);}%
  \swpath{draw=black,line width=1.00bp}{(200.47,-8.50)--(204.08,3.16)--(210.97,3.16)}{\clip (199.97,3.66)--(199.97,-1.19)--(197.82,-3.38)--(198.07,-3.63)--(198.67,-3.03)--(200.47,-8.50)--(204.08,3.16)--(210.97,3.16)--(210.97,3.66)--(199.97,3.66);}%
  \swdepth{14.23}}`);
    correctOrPassed(paper, 1, stem(question(paper, 1)),
      String.raw`Variables x and y are such that, when $\sqrt[4]{y}$ is plotted against $\frac1x$, a straight line graph
       passing through the`);
  });

  it('two roots over products of powers', () => {
    // 4037/11/M/J/17 Q3(a), page 4
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/17}{3}{Indices \& Surds}{6}
\freerow{308.92}{%
  \at{49.61}{-0.01}{\textbf{3}}%
  \at{72.28}{-0.01}{\textbf{(a)}}%
  \at{94.96}{-0.01}{Simplify}%
  \at{148.40}{-0.00}{{\itshape x}}%
  \at{154.06}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont 8}}%
  \at{158.63}{-0.00}{{\itshape y}}%
  \at{164.28}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont 10}}%
  \at{175.37}{0.48}{\textdiv{}}%
  \at{188.28}{5.47}{{\fontsize{8.00bp}{8.00bp}\selectfont 3}}%
  \at{195.13}{-0.00}{{\itshape x}}%
  \at{200.78}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont 3}}%
  \at{205.35}{-0.00}{{\itshape y}}%
  \at{211.33}{5.49}{{\fontsize{8.00bp}{8.00bp}\selectfont \swsy{2D}}}%
  \at{217.12}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont 6}}%
  \at{222.22}{-0.00}{, giving your answer in the form\kern4.37bp {\itshape x}}%
  \at{380.76}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape a}}}%
  \at{385.33}{-0.00}{{\itshape y}}%
  \at{390.97}{5.15}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape b}}}%
  \at{396.07}{-0.00}{, where {\itshape a} and {\itshape b} are integers.}%
  \swpath{draw=black,line width=1.80bp}{(90.28,3.64)--(91.24,4.35)--(94.22,-2.47)}{\clip (93.52,11.75)--(93.52,6.57)--(89.99,3.94)--(90.28,3.64)--(91.24,4.35)--(94.22,-2.47)--(97.74,11.25)--(122.68,11.25)--(122.68,11.75)--(93.52,11.75);}%
  \swpath{draw=black,line width=1.00bp}{(94.22,-2.47)--(97.74,11.25)--(122.68,11.25)}{\clip (93.52,11.75)--(93.52,6.57)--(89.99,3.94)--(90.28,3.64)--(91.24,4.35)--(94.22,-2.47)--(97.74,11.25)--(122.68,11.25)--(122.68,11.75)--(93.52,11.75);}%
  \swpath{draw=black,line width=1.80bp}{(137.00,3.64)--(137.96,4.35)--(140.94,-2.47)}{\clip (140.24,11.75)--(140.24,6.57)--(136.70,3.94)--(137.00,3.64)--(137.96,4.35)--(140.94,-2.47)--(144.46,11.25)--(171.52,11.25)--(171.52,11.75)--(140.24,11.75);}%
  \swpath{draw=black,line width=1.00bp}{(140.94,-2.47)--(144.46,11.25)--(171.52,11.25)}{\clip (140.24,11.75)--(140.24,6.57)--(136.70,3.94)--(137.00,3.64)--(137.96,4.35)--(140.94,-2.47)--(144.46,11.25)--(171.52,11.25)--(171.52,11.75)--(140.24,11.75);}%
  \at{532.25}{-0.00}{\swmark{[2]}}}`);
    correctOrPassed(paper, 3, content(part(question(paper, 3), 'a')),
      String.raw`Simplify $\sqrt{x^8y^{10}}\div\sqrt[3]{x^3y^{-6}}$, giving your answer in the form $x^ay^b$, where a and b
       are integers.`);
  });

  it('surds in brackets', () => {
    // 4037/12/M/J/16 Q4, page 6
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{4}{Quadratic Functions \textperiodcentered\ Indices \& Surds}{6}
\row{-0.18}{72.28}{\lab{22.67}{\textbf{4}}\textbf{Do} \textbf{not} \textbf{use} \textbf{a} \textbf{calculator}\kern2.67bp \textbf{in} \textbf{this} \textbf{question.}}
\freerow{25.47}{%
  \at{72.28}{-0.53}{Find the positive value of {\itshape x} for which}%
  \at{257.15}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{261.22}{-0.53}{4\kern2.38bp {\itshape +}}%
  \at{287.50}{-0.53}{5}%
  \at{293.72}{-3.09}{\swglyph{6}{293.72bp 740.91bp 297.88bp 88.90bp}}%
  \at{298.00}{-0.53}{{\itshape x}}%
  \at{303.66}{4.63}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{310.03}{-0.53}{{\itshape +}}%
  \at{319.71}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{323.78}{-0.53}{2}%
  \at{332.39}{-0.05}{\swsy{2D}}%
  \at{350.06}{-0.53}{5}%
  \at{356.04}{-3.09}{\swglyph{6}{356.04bp 740.91bp 235.56bp 88.66bp}}%
  \at{360.56}{-0.53}{{\itshape x}}%
  \at{368.51}{-0.05}{\swsy{2D}}%
  \at{378.22}{-0.53}{1\kern3.16bp {\itshape =}\kern3.14bp 0\kern0.69bp ,}%
  \at{418.91}{-0.53}{giving your answer in the}%
  \swpath{draw=black,line width=1.80bp}{(230.63,3.51)--(231.47,4.01)--(234.12,-0.75)}{\clip (233.42,9.16)--(233.42,5.57)--(230.37,3.77)--(230.63,3.51)--(231.47,4.01)--(234.12,-0.75)--(237.25,8.66)--(243.65,8.66)--(243.65,9.16)--(233.42,9.16);}%
  \swpath{draw=black,line width=1.00bp}{(234.12,-0.75)--(237.25,8.66)--(243.65,8.66)}{\clip (233.42,9.16)--(233.42,5.57)--(230.37,3.77)--(230.63,3.51)--(231.47,4.01)--(234.12,-0.75)--(237.25,8.66)--(243.65,8.66)--(243.65,9.16)--(233.42,9.16);}%
  \swpath{draw=black,line width=1.80bp}{(293.20,3.51)--(294.04,4.01)--(296.68,-0.75)}{\clip (295.98,9.16)--(295.98,5.57)--(292.94,3.77)--(293.20,3.51)--(294.04,4.01)--(296.68,-0.75)--(299.81,8.66)--(306.22,8.66)--(306.22,9.16)--(295.98,9.16);}%
  \swpath{draw=black,line width=1.00bp}{(296.68,-0.75)--(299.81,8.66)--(306.21,8.66)}{\clip (295.98,9.16)--(295.98,5.57)--(292.94,3.77)--(293.20,3.51)--(294.04,4.01)--(296.68,-0.75)--(299.81,8.66)--(306.22,8.66)--(306.22,9.16)--(295.98,9.16);}}
\freerow{20.5}{%
  \at{72.29}{-6.03}{form $\dfrac{a + \sqrt{5}}{b}$, where $a$ and $b$ are integers.}%
  \at{532.26}{-6.03}{\hfill\swmark{[6]}}%
  \swdepth{14.80}}`);
    correctOrPassed(paper, 4, stem(question(paper, 4)),
      String.raw`Do not use a calculator in this question. Find the positive value of x for which
       $(4+\sqrt5)x^2+(2-\sqrt5)x-1=0$, giving your answer in the form $\frac{a+\sqrt5}{b}$, where a and b are integers.`);
  });

  it('column vectors and moduli of vectors', () => {
    // 4037/12/M/J/16 Q3 and Q3(i), page 5
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{3}{Vectors in Two Dimensions}{6}
\freerow{-0.84}{%
  \at{246.30}{-23.02}{\swglyph{5}{246.30bp 747.11bp 345.06bp 65.42bp}}%
  \at{256.66}{-23.02}{\swglyph{5}{256.66bp 747.11bp 334.93bp 65.42bp}}%
  \at{288.99}{-23.02}{\swglyph{5}{288.99bp 747.11bp 302.36bp 65.42bp}}%
  \at{298.89}{-23.02}{\swglyph{5}{298.89bp 747.11bp 292.70bp 65.42bp}}%
  \at{346.54}{-23.02}{\swglyph{5}{346.54bp 747.11bp 244.82bp 65.42bp}}%
  \at{365.25}{-23.02}{\swglyph{5}{365.25bp 747.11bp 226.35bp 65.42bp}}%
  \at{250.57}{-4.53}{2}%
  \at{292.49}{-4.53}{1}%
  \at{350.83}{-4.05}{\swsy{2D}}%
  \at{359.16}{-4.53}{5}%
  \at{246.30}{-23.04}{\swglyph{5}{246.30bp 747.09bp 345.06bp 65.44bp}}%
  \at{256.66}{-23.04}{\swglyph{5}{256.66bp 747.09bp 334.93bp 65.44bp}}%
  \at{288.99}{-23.04}{\swglyph{5}{288.99bp 747.09bp 302.36bp 65.44bp}}%
  \at{298.89}{-23.04}{\swglyph{5}{298.89bp 747.09bp 292.70bp 65.44bp}}%
  \at{346.54}{-23.04}{\swglyph{5}{346.54bp 747.09bp 244.82bp 65.44bp}}%
  \at{365.25}{-23.04}{\swglyph{5}{365.25bp 747.09bp 226.35bp 65.44bp}}%
  \at{49.61}{-12.37}{\textbf{3}}%
  \at{72.28}{-12.37}{V\kern-1.28bp ectors\kern5.75bp \textbf{a}, \textbf{b} and \textbf{c} are such that\kern8.62bp \textbf{a} \textbf{=}}%
  \at{246.30}{-23.16}{\swglyph{5}{246.30bp 746.97bp 345.06bp 65.56bp}}%
  \at{256.66}{-23.16}{\swglyph{5}{256.66bp 746.97bp 334.93bp 65.56bp}}%
  \at{260.92}{-12.36}{,\kern5.75bp \textbf{b} \textbf{=}}%
  \at{288.99}{-23.16}{\swglyph{5}{288.99bp 746.97bp 302.36bp 65.56bp}}%
  \at{298.89}{-23.16}{\swglyph{5}{298.89bp 746.97bp 292.70bp 65.56bp}}%
  \at{308.90}{-12.36}{and \textbf{c} \textbf{=}}%
  \at{346.54}{-23.16}{\swglyph{5}{346.54bp 746.97bp 244.82bp 65.56bp}}%
  \at{365.25}{-23.16}{\swglyph{5}{365.25bp 746.97bp 226.35bp 65.56bp}}%
  \at{369.50}{-12.36}{.}%
  \at{251.14}{-19.46}{{\itshape y}}%
  \at{292.55}{-19.46}{3}%
  \at{358.66}{-19.46}{5}%
  \at{246.30}{-23.01}{\swglyph{5}{246.30bp 747.12bp 345.06bp 65.41bp}}%
  \at{256.66}{-23.01}{\swglyph{5}{256.66bp 747.12bp 334.93bp 65.41bp}}%
  \at{288.99}{-23.01}{\swglyph{5}{288.99bp 747.12bp 302.36bp 65.41bp}}%
  \at{298.89}{-23.01}{\swglyph{5}{298.89bp 747.12bp 292.70bp 65.41bp}}%
  \at{346.54}{-23.01}{\swglyph{5}{346.54bp 747.12bp 244.82bp 65.41bp}}%
  \at{365.25}{-23.01}{\swglyph{5}{365.25bp 747.12bp 226.35bp 65.41bp}}%
  \at{72.29}{-38.36}{\textbf{(i)}}%
  \at{94.96}{-38.36}{Given that\kern6.78bp \textbf{a}\kern5.97bp {\itshape =}\kern5.96bp \textbf{b}}%
  \at{184.73}{-37.89}{\swsy{2D}}%
  \at{194.44}{-38.37}{\textbf{c}\kern3.89bp , find the possible values of {\itshape y}.}%
  \swpath{fill=black}{(97.55,-40.50) rectangle (98.05,-29.00)}{}%
  \swpath{fill=black}{(108.43,-40.50) rectangle (108.93,-29.00)}{}%
  \swpath{fill=black}{(123.05,-40.50) rectangle (123.55,-29.00)}{}%
  \swpath{fill=black}{(152.24,-40.50) rectangle (152.74,-29.00)}{}%
  \at{532.27}{-38.37}{\swmark{[3]}}%
  \swdepth{40.67}}`);
    const q = question(paper, 3);
    correctOrPassed(paper, 3, stem(q),
      String.raw`Vectors a, b and c are such that a = $\begin{pmatrix}2\\y\end{pmatrix}$, b =
       $\begin{pmatrix}1\\3\end{pmatrix}$ and c = $\begin{pmatrix}-5\\5\end{pmatrix}$.`);
    correctOrPassed(paper, 3, q.parts.length ? content(part(q, 'i')) : '', 'Given that $|a|=|b-c|$, find the possible values of y.');
  });

  it('Greek multiples of vectors in brackets', () => {
    // 4037/12/M/J/16 Q3(ii), page 5
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{3}{Vectors in Two Dimensions}{6}
\freerow{271.84}{%
  \at{72.29}{-0.53}{\textbf{(ii)}}%
  \at{94.97}{-0.53}{Given that}%
  \at{146.83}{-2.91}{\swglyph{5}{146.83bp 495.38bp 441.16bp 338.27bp}}%
  \at{154.96}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{159.03}{-0.53}{\textbf{b}\kern2.39bp {\itshape +}\kern2.37bp \textbf{c}}%
  \at{183.56}{-3.33}{\swglyph{5}{183.56bp 494.96bp 408.03bp 334.85bp}}%
  \at{189.03}{-0.53}{{\itshape +}\kern2.37bp 4}%
  \at{205.64}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{209.72}{-0.53}{\textbf{b}}%
  \at{218.99}{-0.05}{\swsy{2D}}%
  \at{228.70}{-0.53}{\textbf{c}}%
  \at{234.25}{-3.33}{\swglyph{5}{234.25bp 494.96bp 357.35bp 334.85bp}}%
  \at{240.51}{-0.53}{{\itshape =}}%
  \at{251.12}{-1.23}{\swglyph{5}{251.12bp 497.06bp 338.31bp 335.15bp}}%
  \at{258.02}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{262.10}{-0.53}{2\textbf{b}}%
  \at{277.11}{-0.05}{\swsy{2D}}%
  \at{286.80}{-0.53}{\textbf{c}}%
  \at{292.37}{-3.33}{\swglyph{5}{292.37bp 494.96bp 299.22bp 334.85bp}}%
  \at{296.56}{-0.53}{, find the value of}%
  \at{381.88}{-2.91}{\swglyph{5}{381.88bp 495.38bp 206.36bp 338.27bp}}%
  \at{392.37}{-0.53}{and of}%
  \at{425.15}{-1.23}{\swglyph{5}{425.15bp 497.06bp 164.29bp 335.15bp}}%
  \at{431.55}{-0.53}{.}%
  \at{532.26}{-0.53}{\swmark{[3]}}}`);
    correctOrPassed(paper, 3, content(part(question(paper, 3), 'ii')),
      String.raw`Given that $\mu(b+c)+4(b-c)=\lambda(2b-c)$, find the value of $\mu$ and of $\lambda$.`);
  });

  it('a binomial with a fraction and a power', () => {
    // 4037/12/M/J/16 Q2(i), page 4
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{2}{Binomial Theorem}{5}
\freerow{3.4}{%
  \at{291.49}{-0.00}{1}%
  \at{304.65}{4.96}{{\fontsize{8.00bp}{8.00bp}\selectfont 5}}%
  \at{357.90}{-0.00}{{\itshape b}}%
  \at{379.85}{-0.00}{{\itshape c}}%
  \at{49.61}{-6.04}{\textbf{2}}%
  \at{72.77}{-6.04}{\textbf{(i)}}%
  \at{94.96}{-6.04}{The first 3 terms in the expansion of}%
  \at{265.57}{-14.01}{\swglyph{4}{265.57bp 751.88bp 325.55bp 67.13bp}}%
  \at{270.06}{-6.04}{2}%
  \at{278.66}{-5.56}{\swsy{2D}}%
  \at{300.76}{-14.25}{\swglyph{4}{300.76bp 751.64bp 290.11bp 66.89bp}}%
  \at{312.62}{-6.04}{are}%
  \at{339.03}{-6.04}{{\itshape a}\kern2.37bp {\itshape +}}%
  \at{366.59}{-6.04}{{\itshape +}}%
  \at{383.40}{-9.91}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{389.06}{-6.04}{. Find the value of each of the}%
  \at{288.93}{-12.29}{4{\itshape x}}%
  \at{358.44}{-15.04}{{\itshape x}}%
  \at{377.75}{-15.07}{{\itshape x}}%
  \ruleat{288.37}{300.33}{-2.57}{0.50}%
  \ruleat{357.34}{364.22}{-2.57}{0.50}%
  \ruleat{376.78}{387.97}{-2.57}{0.50}%
  \swdepth{17.37}}
\row{19.03}{94.96}{integers $a$, $b$ and $c$.\swmark{[3]}}`);
    correctOrPassed(paper, 2, content(part(question(paper, 2), 'i')),
      String.raw`The first 3 terms in the expansion of $\left(2-\frac{1}{4x}\right)^5$ are $a+\frac bx+\frac{c}{x^2}$.
       Find the value of each of the integers a, b and c.`);
  });

  it('a binomial times a bracket', () => {
    // 4037/12/M/J/16 Q2(ii), page 4
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{2}{Binomial Theorem}{5}
\freerow{279.97}{%
  \at{386.32}{-0.00}{1}%
  \at{399.47}{4.96}{{\fontsize{8.00bp}{8.00bp}\selectfont 5}}%
  \at{69.58}{-6.04}{\textbf{(ii)}}%
  \at{94.97}{-6.04}{Hence find the term independent of {\itshape x} in the expansion of}%
  \at{360.63}{-14.25}{\swglyph{4}{360.63bp 452.64bp 230.49bp 365.89bp}}%
  \at{364.88}{-6.04}{2}%
  \at{373.48}{-5.56}{\swsy{2D}}%
  \at{395.59}{-14.25}{\swglyph{4}{395.59bp 452.64bp 195.29bp 365.89bp}}%
  \at{404.71}{-5.75}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{408.79}{-6.03}{3\kern2.37bp {\itshape +}\kern2.37bp 4{\itshape x}}%
  \at{438.17}{-8.60}{\swglyph{4}{438.17bp 458.29bp 153.43bp 371.28bp}}%
  \at{442.60}{-6.04}{.}%
  \at{383.75}{-12.29}{4{\itshape x}}%
  \ruleat{383.19}{395.16}{-2.57}{0.50}%
  \at{532.26}{-6.04}{\swmark{[2]}}%
  \swdepth{14.59}}`);
    correctOrPassed(paper, 2, content(part(question(paper, 2), 'ii')),
      String.raw`Hence find the term independent of x in the expansion of $\left(2-\frac{1}{4x}\right)^5(3+4x)$.`);
  });

  it('a trigonometric identity with theta as a picture', () => {
    // 4037/12/M/J/16 Q5(i), page 7
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{5}{Trigonometry}{7}
\freerow{1.97}{%
  \at{49.61}{-0.53}{\textbf{5}}%
  \at{72.77}{-0.53}{\textbf{(i)}}%
  \at{94.96}{-0.53}{Show that}%
  \at{144.74}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{148.82}{-0.53}{1}%
  \at{157.43}{-0.05}{\swsy{2D}}%
  \at{167.12}{-0.53}{cos}%
  \at{184.63}{-1.23}{\swglyph{7}{184.63bp 766.09bp 404.57bp 66.12bp}}%
  \at{184.45}{-3.33}{\swglyph{7}{184.45bp 763.99bp 401.15bp 65.58bp}}%
  \at{194.46}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{198.53}{-0.53}{1\kern2.38bp {\itshape +}\kern2.36bp sec}%
  \at{233.45}{-1.23}{\swglyph{7}{233.45bp 766.09bp 355.51bp 66.12bp}}%
  \at{233.52}{-3.33}{\swglyph{7}{233.52bp 763.99bp 351.84bp 65.82bp}}%
  \at{246.01}{-0.53}{{\itshape =}\kern3.14bp sin}%
  \at{272.33}{-1.23}{\swglyph{7}{272.33bp 766.09bp 316.63bp 66.12bp}}%
  \at{279.48}{-0.53}{tan}%
  \at{295.69}{-1.23}{\swglyph{7}{295.69bp 766.09bp 293.50bp 66.12bp}}%
  \at{302.37}{-0.53}{.}%
  \at{532.26}{-0.53}{\swmark{[4]}}}`);
    correctOrPassed(paper, 5, content(part(question(paper, 5), 'i')),
      String.raw`Show that $(1-\cos\theta)(1+\sec\theta)=\sin\theta\tan\theta$.`);
  });

  it('inequalities that are not strict', () => {
    // 4037/12/M/J/16 Q5(ii), page 7
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{5}{Trigonometry}{7}
\freerow{338.0}{%
  \at{69.57}{-0.53}{\textbf{(ii)}}%
  \at{94.96}{-0.53}{Hence solve the equation}%
  \at{222.96}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{227.04}{-0.53}{1}%
  \at{235.65}{-0.05}{\swsy{2D}}%
  \at{245.34}{-0.53}{cos}%
  \at{262.85}{-1.23}{\swglyph{7}{262.85bp 428.09bp 326.35bp 404.12bp}}%
  \at{262.67}{-3.09}{\swglyph{7}{262.67bp 426.23bp 322.93bp 403.34bp}}%
  \at{272.68}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{276.75}{-0.53}{1\kern2.38bp {\itshape +}\kern2.36bp sec}%
  \at{311.67}{-1.23}{\swglyph{7}{311.67bp 428.09bp 277.29bp 404.12bp}}%
  \at{311.74}{-3.09}{\swglyph{7}{311.74bp 426.23bp 273.62bp 403.58bp}}%
  \at{324.23}{-0.53}{{\itshape =}\kern3.14bp sin}%
  \at{350.55}{-1.23}{\swglyph{7}{350.55bp 428.09bp 238.41bp 404.12bp}}%
  \at{368.97}{-0.53}{for\kern3.53bp 0}%
  \at{394.95}{-1.23}{\swglyph{7}{394.95bp 428.09bp 192.80bp 405.08bp}}%
  \at{406.31}{-1.23}{\swglyph{7}{406.31bp 428.09bp 182.89bp 404.12bp}}%
  \at{414.95}{-1.23}{\swglyph{7}{414.95bp 428.09bp 172.57bp 405.08bp}}%
  \at{425.71}{-1.35}{\swglyph{7}{425.71bp 427.97bp 163.01bp 407.84bp}}%
  \at{435.79}{-0.53}{radians.}%
  \at{532.26}{-0.53}{\swmark{[3]}}}`);
    correctOrPassed(paper, 5, content(part(question(paper, 5), 'ii')),
      String.raw`Hence solve the equation $(1-\cos\theta)(1+\sec\theta)=\sin\theta$ for $0\leq\theta\leq\pi$ radians.`);
  });

  it('strict inequalities, a tall bracket and a root', () => {
    // 4037/23/O/N/18 Q9(a), page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/23/O/N/18}{9}{Trigonometry}{12}
\freerow{1.16}{%
  \at{171.25}{0.00}{\swsy{70}}%
  \at{49.61}{-5.75}{\textbf{9}}%
  \at{72.29}{-5.75}{\textbf{(a)}}%
  \at{94.96}{-5.75}{Solve\kern9.09bp 2\kern1.51bp sin}%
  \at{150.08}{-13.10}{\swglyph{10}{150.08bp 755.03bp 435.99bp 65.66bp}}%
  \at{154.11}{-5.75}{{\itshape x}\kern1.50bp {\itshape +}}%
  \at{170.52}{-12.86}{\swglyph{10}{170.52bp 755.27bp 413.64bp 65.42bp}}%
  \at{184.27}{-5.75}{{\itshape =}}%
  \at{201.80}{-5.75}{3}%
  \at{216.64}{-5.75}{for\kern3.41bp 0}%
  \at{242.06}{-6.03}{\swglyph{10}{242.06bp 762.10bp 345.46bp 71.79bp}}%
  \at{253.50}{-5.75}{{\itshape x}}%
  \at{262.30}{-6.03}{\swglyph{10}{262.30bp 762.10bp 325.46bp 71.79bp}}%
  \at{273.98}{-5.75}{\swsy{70}}%
  \at{283.50}{-5.75}{radians.}%
  \at{171.33}{-11.78}{4}%
  \ruleat{170.20}{177.95}{-2.43}{0.50}%
  \swpath{draw=black,line width=1.20bp}{(145.64,-2.68)--(146.21,-2.16)--(147.93,-6.84)}{\clip (147.43,3.57)--(147.43,-0.59)--(145.40,-2.44)--(145.64,-2.68)--(146.21,-2.16)--(147.94,-6.84)--(151.39,3.07)--(157.70,3.07)--(157.70,3.57)--(147.43,3.57);}%
  \swpath{draw=black,line width=1.00bp}{(147.93,-6.84)--(151.39,3.07)--(157.70,3.07)}{\clip (147.43,3.57)--(147.43,-0.59)--(145.40,-2.44)--(145.64,-2.68)--(146.21,-2.16)--(147.94,-6.84)--(151.39,3.07)--(157.70,3.07)--(157.70,3.57)--(147.43,3.57);}%
  \at{532.85}{-5.75}{\swmark{[3]}}%
  \swdepth{13.98}}`);
    correctOrPassed(paper, 9, content(part(question(paper, 9), 'a')),
      String.raw`Solve $2\sin\left(x+\frac\pi4\right)=\sqrt3$ for $0<x<\pi$ radians.`);
  });

  it('strict inequalities in degrees', () => {
    // 4037/23/O/N/18 Q9(b), page 10, and (c), page 11
    const b = paperOf(MATHS, String.raw`\examq{4037/23/O/N/18}{9}{Trigonometry}{12}
\freerow{382.75}{%
  \at{72.29}{0.00}{\textbf{(b)}}%
  \at{94.97}{0.00}{Solve\kern8.90bp 3\kern1.50bp sec\kern1.49bp $y$\kern2.99bp $=$\kern2.99bp 4\kern1.50bp cosec\kern1.48bp $y$\kern9.31bp for\kern3.41bp 0\textdegree{}}%
  \at{246.96}{-0.28}{\swglyph{10}{246.96bp 385.10bp 340.80bp 448.79bp}}%
  \at{258.16}{0.00}{$y$}%
  \at{266.96}{-0.28}{\swglyph{10}{266.96bp 385.10bp 320.56bp 448.79bp}}%
  \at{278.16}{0.00}{360\textdegree{}\kern0.50bp .}%
  \at{532.84}{0.00}{\swmark{[3]}}}
\freerow{0.69}{%
  \at{72.29}{0.00}{\textbf{(c)}}%
  \at{94.97}{0.00}{Solve\kern8.91bp 7\kern1.49bp cot\kern1.51bp $z$}%
  \at{157.38}{0.48}{$-$}%
  \at{165.61}{0.00}{tan\kern1.51bp $z$\kern3.00bp $=$\kern2.99bp 2\kern1.49bp cosec\kern1.49bp $z$\kern9.36bp for\kern3.41bp 0\textdegree{}}%
  \at{274.68}{-0.28}{\swglyph{11}{274.68bp 768.32bp 312.84bp 65.57bp}}%
  \at{286.13}{0.00}{$z$}%
  \at{294.08}{-0.28}{\swglyph{11}{294.08bp 768.32bp 293.44bp 65.57bp}}%
  \at{305.53}{0.00}{360\textdegree{}\kern0.50bp .}%
  \at{532.85}{0.00}{\swmark{[6]}}}`);
    correctOrPassed(b, 9, content(part(question(b, 9), 'b')),
      String.raw`Solve $3\sec y=4\operatorname{cosec}y$ for $0°<y<360°$.`);
    const c = paperOf(MATHS, String.raw`\examq{4037/23/O/N/18}{9}{Trigonometry}{12}
\freerow{0.69}{%
  \at{72.29}{0.00}{\textbf{(c)}}%
  \at{94.97}{0.00}{Solve\kern8.91bp 7\kern1.49bp cot\kern1.51bp $z$}%
  \at{157.38}{0.48}{$-$}%
  \at{165.61}{0.00}{tan\kern1.51bp $z$\kern3.00bp $=$\kern2.99bp 2\kern1.49bp cosec\kern1.49bp $z$\kern9.36bp for\kern3.41bp 0\textdegree{}}%
  \at{274.68}{-0.28}{\swglyph{11}{274.68bp 768.32bp 312.84bp 65.57bp}}%
  \at{286.13}{0.00}{$z$}%
  \at{294.08}{-0.28}{\swglyph{11}{294.08bp 768.32bp 293.44bp 65.57bp}}%
  \at{305.53}{0.00}{360\textdegree{}\kern0.50bp .}%
  \at{532.85}{0.00}{\swmark{[6]}}}`);
    correctOrPassed(c, 9, content(part(question(c, 9), 'c')),
      String.raw`Solve $7\cot z-\tan z=2\operatorname{cosec}z$ for $0°<z<360°$.`);
  });

  it('a minus, degrees and inequalities all as pictures', () => {
    // 4037/12/M/J/24 Q1, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/24}{1}{Trigonometry}{3}
\freerow{23.42}{%
  \at{72.28}{-0.00}{The\kern4.90bp diagram\kern4.91bp shows\kern4.90bp the\kern4.90bp graph\kern4.90bp of}%
  \at{252.56}{0.00}{{\itshape y}\kern3.15bp {\itshape =}\kern3.14bp {\itshape a}\kern1.56bp sin\kern1.55bp {\itshape bx}\kern1.55bp {\itshape +}\kern1.55bp {\itshape c}\kern10.66bp for}%
  \at{350.59}{2.66}{\swglyph{3}{350.59bp 512.53bp 237.17bp 327.84bp}}%
  \at{359.17}{0.00}{360}%
  \at{377.04}{5.06}{\swglyph{3}{377.04bp 514.93bp 215.04bp 323.76bp}}%
  \at{383.74}{-0.70}{\swglyph{3}{383.74bp 509.17bp 203.77bp 324.00bp}}%
  \at{394.48}{0.00}{{\itshape x}}%
  \at{402.87}{-0.70}{\swglyph{3}{402.87bp 509.17bp 184.89bp 324.00bp}}%
  \at{413.61}{0.00}{360}%
  \at{431.48}{5.06}{\swglyph{3}{431.48bp 514.93bp 160.84bp 323.52bp}}%
  \at{435.17}{-0.00}{,\kern4.90bp where\kern4.90bp {\itshape a},\kern4.91bp {\itshape b}\kern4.90bp and\kern4.90bp {\itshape c}\kern4.90bp are}}`);
    correctOrPassed(paper, 1, stem(question(paper, 1)),
      String.raw`The diagram shows the graph of $y=a\sin bx+c$ for $-360°\leq x\leq360°$, where a, b and c are`);
  });

  it('the derivative of a product with a root', () => {
    // 4037/12/M/J/16 Q6, page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{6}{Differentiation \textperiodcentered\ Logarithmic \& Exponential Functions}{5}
\freerow{3.16}{%
  \at{348.43}{-0.53}{e}%
  \at{354.09}{4.63}{{\fontsize{8.00bp}{8.00bp}\selectfont 3{\itshape x}}}%
  \at{362.89}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{368.25}{-0.53}{{\itshape px}\kern2.36bp {\itshape +}\kern2.36bp {\itshape q}}%
  \at{397.86}{-3.33}{\swglyph{8}{397.86bp 762.80bp 193.73bp 67.01bp}}%
  \at{134.33}{-2.41}{d}%
  \at{153.57}{-3.28}{{\fontsize{8.00bp}{8.00bp}\selectfont 3{\itshape x}}}%
  \at{143.84}{-7.05}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{200.48}{-9.90}{\swglyph{8}{200.48bp 756.23bp 391.12bp 73.34bp}}%
  \at{49.61}{-8.43}{\textbf{6}}%
  \at{72.28}{-8.43}{Show that}%
  \at{147.92}{-8.43}{e}%
  \at{170.85}{-8.43}{4{\itshape x}\kern2.36bp {\itshape +}\kern2.36bp 1}%
  \at{216.17}{-8.43}{can be written in the form}%
  \at{402.62}{-8.43}{,}%
  \at{417.00}{-8.43}{where {\itshape p} and {\itshape q} are}%
  \at{131.76}{-14.91}{d{\itshape x}}%
  \at{364.12}{-16.59}{4{\itshape x}\kern2.37bp {\itshape +}\kern2.36bp 1}%
  \ruleat{131.20}{143.17}{-4.96}{0.50}%
  \ruleat{347.87}{401.53}{-4.96}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)}{\clip (116.77,1.25)--(116.77,-2.34)--(113.73,-4.13)--(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)--(150.41,1.25)--(116.77,1.25);}%
  \swpath{draw=black,line width=1.00bp}{(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)}{\clip (116.77,1.25)--(116.77,-2.34)--(113.73,-4.13)--(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)--(150.41,1.25)--(116.77,1.25);}%
  \swpath{draw=black,line width=1.80bp}{(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)}{\clip (310.04,-6.90)--(310.04,-10.49)--(306.99,-12.29)--(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)--(343.68,-6.90)--(310.04,-6.90);}%
  \swpath{draw=black,line width=1.00bp}{(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)}{\clip (310.04,-6.90)--(310.04,-10.49)--(306.99,-12.29)--(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)--(343.68,-6.90)--(310.04,-6.90);}%
  \swdepth{18.89}}
\row{34.43}{72.28}{integers to be found.\swmark{[5]}}`);
    correctOrPassed(paper, 6, stem(question(paper, 6)),
      String.raw`Show that $\frac{d}{dx}(e^{3x}\sqrt{4x+1})$ can be written in the form
       $\frac{e^{3x}(px+q)}{\sqrt{4x+1}}$, where p and q are integers to be found.`);
  });

  it('a power of a power whose top index is drawn on a line of its own', () => {
    // 4037/12/M/J/16 Q8(i), page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{8}{Straight-Line Graphs \textperiodcentered\ Logarithmic \& Exponential Functions}{8}
\partbreak
\freerow{17.25}{%
  \at{184.90}{-0.00}{2}}
\partbreak
\row{8.75}{94.96}{\lab{22.19}{\textbf{(i)}}Given that\kern4.90bp $y$\kern3.14bp $=$\kern3.15bp $Ab$\kern0.84bp \raisebox{5.15bp}[0pt][0pt]{\fontsize{8.00bp}{8.00bp}\selectfont $x$}\kern4.39bp , find the value of $A$ and of $b$.\swmark{[4]}}
\partbreak
\partbreak`);
    correctOrPassed(paper, 8, content(part(question(paper, 8), 'i')),
      'Given that $y=Ab^{x^2}$, find the value of A and of b.');
  });

  it('powers of powers over each other', () => {
    // 4037/22/M/J/17 Q7(c), page 6
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/17}{7}{Logarithmic \& Exponential Functions \textperiodcentered\ Indices \& Surds}{7}
\freerow{143.0}{%
  \at{206.77}{8.75}{{\fontsize{5.75bp}{5.75bp}\selectfont 2}}%
  \at{202.80}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape x}}}%
  \at{211.11}{5.49}{{\fontsize{8.00bp}{8.00bp}\selectfont \swsy{2D}}}%
  \at{217.34}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont 1}}%
  \at{190.46}{-0.00}{32}%
  \at{72.28}{-6.03}{\textbf{(c)}}%
  \at{94.96}{-6.03}{Solve the equation}%
  \at{209.74}{-8.38}{{\fontsize{5.75bp}{5.75bp}\selectfont 2}}%
  \at{225.05}{-6.03}{{\itshape =}\kern3.15bp 16\kern0.66bp .}%
  \at{199.18}{-17.13}{4}%
  \at{205.77}{-11.97}{{\fontsize{8.00bp}{8.00bp}\selectfont {\itshape x}}}%
  \ruleat{189.90}{221.90}{-2.56}{0.50}%
  \at{532.26}{-6.03}{\swmark{[3]}}%
  \swdepth{19.43}}`);
    correctOrPassed(paper, 7, content(part(question(paper, 7), 'c')),
      String.raw`Solve the equation $\frac{32^{x^2-1}}{4^{x^2}}=16$.`);
  });

  it('a fraction as a power inside a fraction', () => {
    // 4037/12/M/J/17 Q2, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/17}{2}{Differentiation}{5}
\partbreak
\freerow{31.09}{%
  \at{206.09}{8.94}{{\fontsize{5.75bp}{5.75bp}\selectfont 1}}%
  \at{163.09}{-0.00}{(5{\itshape x}}%
  \at{178.34}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{184.71}{-0.00}{{\itshape +}\kern2.36bp 4)}%
  \at{206.09}{2.31}{{\fontsize{5.75bp}{5.75bp}\selectfont 2}}%
  \at{450.29}{-0.00}{d\kern0.94bp {\itshape y}}%
  \at{49.61}{-7.90}{\textbf{2}}%
  \at{72.28}{-7.90}{It is given that\kern4.91bp {\itshape y}\kern3.15bp {\itshape =}}%
  \at{211.02}{-7.91}{. Showing all your working, find the exact value of}%
  \at{466.61}{-7.91}{when\kern4.37bp {\itshape x}\kern3.14bp {\itshape =}\kern3.15bp 3\kern0.13bp .}%
  \at{174.74}{-14.16}{{\itshape x}\kern2.36bp {\itshape +}\kern2.37bp 1}%
  \at{450.32}{-14.38}{d\kern0.91bp {\itshape x}}%
  \ruleat{162.52}{209.93}{-4.44}{0.50}%
  \ruleat{205.68}{209.37}{7.55}{0.41}%
  \ruleat{449.73}{462.64}{-4.44}{0.50}%
  \at{532.26}{-20.90}{\swmark{[5]}}%
  \swdepth{23.20}}`);
    correctOrPassed(paper, 2, stem(question(paper, 2)),
      String.raw`It is given that $y=\frac{(5x^2+4)^{\frac12}}{x+1}$. Showing all your working, find the exact value of
       $\frac{dy}{dx}$ when $x=3$.`);
  });

  it('a fraction as the power of a bracket', () => {
    // 4037/13/O/N/17 Q8 and Q8(i), page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/13/O/N/17}{8}{Differentiation}{8}
\freerow{6.09}{%
  \at{233.24}{9.15}{{\fontsize{5.75bp}{5.75bp}\selectfont \textbf{5}}}%
  \at{49.61}{-0.00}{\textbf{8}}%
  \at{72.28}{-0.00}{It is given that\kern4.91bp {\itshape y}\kern3.14bp {\itshape =}\kern3.15bp ({\itshape x}}%
  \at{174.32}{0.48}{\swsy{2D}}%
  \at{184.02}{-0.00}{4)\kern1.21bp (3{\itshape x}}%
  \at{212.35}{0.48}{\swsy{2D}}%
  \at{222.05}{-0.00}{1)}%
  \at{233.24}{2.15}{{\fontsize{5.75bp}{5.75bp}\selectfont \textbf{3}}}%
  \at{237.62}{-0.00}{.}%
  \ruleat{232.84}{236.52}{7.54}{0.72}}
\freerow{18.1}{%
  \at{151.56}{-0.00}{d\kern0.94bp {\itshape y}}%
  \at{216.47}{1.19}{{\fontsize{5.75bp}{5.75bp}\selectfont \textbf{2}}}%
  \at{72.76}{-7.90}{\textbf{(i)}}%
  \at{94.96}{-7.90}{Show that}%
  \at{167.06}{-7.90}{{\itshape =}\kern3.15bp (3{\itshape x}}%
  \at{195.58}{-7.42}{\swsy{2D}}%
  \at{205.28}{-7.90}{1)}%
  \at{216.47}{-5.75}{{\fontsize{5.75bp}{5.75bp}\selectfont \textbf{3}}}%
  \at{220.94}{-7.90}{({\itshape Ax}\kern2.39bp {\itshape +}\kern2.36bp {\itshape B})\kern0.69bp ,\kern8.62bp where {\itshape A} and {\itshape B} are integers to be found.}%
  \at{151.85}{-14.38}{d\kern0.40bp {\itshape x}}%
  \ruleat{151.00}{163.90}{-4.43}{0.50}%
  \ruleat{216.06}{219.75}{-0.36}{0.72}%
  \at{532.26}{-7.90}{\swmark{[5]}}%
  \swdepth{16.68}}`);
    const q = question(paper, 8);
    correctOrPassed(paper, 8, stem(q), String.raw`It is given that $y=(x-4)(3x-1)^{\frac53}$.`);
    correctOrPassed(paper, 8, content(part(q, 'i')),
      String.raw`Show that $\frac{dy}{dx}=(3x-1)^{\frac23}(Ax+B)$, where A and B are integers to be found.`);
  });

  it('a fraction as the power of e', () => {
    // 4037/13/O/N/16 Q7(i), page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/13/O/N/16}{7}{Straight-Line Graphs \textperiodcentered\ Logarithmic \& Exponential Functions}{8}
\freerow{26.0}{%
  \at{186.15}{8.99}{{\fontsize{6.75bp}{6.75bp}\selectfont {\itshape b}}}%
  \at{72.77}{-0.00}{\textbf{(i)}}%
  \at{94.96}{-0.00}{Given that\kern10.66bp {\itshape y}\kern3.14bp {\itshape =}\kern3.15bp {\itshape A}e}%
  \at{186.46}{2.77}{{\fontsize{6.75bp}{6.75bp}\selectfont {\itshape x}}}%
  \at{191.03}{-0.01}{,\kern8.62bp find the value of {\itshape A} and of {\itshape b}.}%
  \ruleat{185.75}{189.93}{7.54}{0.41}%
  \at{532.26}{-0.01}{\swmark{[4]}}}`);
    correctOrPassed(paper, 7, content(part(question(paper, 7), 'i')),
      String.raw`Given that $y=Ae^{\frac bx}$, find the value of A and of b.`);
  });

  it('a fraction of fractions', () => {
    // 4037/13/O/N/16 Q2, page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/13/O/N/16}{2}{Indices \& Surds}{3}
\partbreak
\freerow{86.87}{%
  \at{171.79}{-0.00}{9}%
  \at{121.85}{-5.97}{4{\itshape m}}%
  \at{145.06}{-5.97}{{\itshape m}}%
  \at{156.23}{-5.49}{\swsy{2D}}%
  \at{174.47}{-14.10}{{\itshape m}}%
  \at{49.61}{-19.75}{\textbf{2}}%
  \at{72.28}{-19.75}{Express}%
  \at{196.51}{-19.75}{in the form\kern4.53bp {\itshape Am}\kern2.39bp {\itshape +}\kern2.37bp {\itshape B}\kern0.84bp , where {\itshape A} and {\itshape B} are integers to be found.}%
  \at{167.63}{-26.00}{3}%
  \at{126.00}{-31.97}{2}%
  \at{140.91}{-31.97}{{\itshape m}\kern2.38bp {\itshape +}}%
  \at{170.32}{-40.10}{{\itshape m}}%
  \ruleat{121.29}{183.91}{-16.28}{0.50}%
  \ruleat{161.79}{179.19}{-28.52}{0.41}%
  \ruleat{165.94}{183.35}{-2.52}{0.41}%
  \swpath{draw=black,line width=1.80bp}{(84.04,-27.93)--(84.88,-27.44)--(87.53,-32.19)}{\clip (86.83,-22.29)--(86.83,-25.88)--(83.78,-27.67)--(84.04,-27.93)--(84.88,-27.44)--(87.53,-32.19)--(90.66,-22.78)--(99.62,-22.78)--(99.62,-22.29)--(86.83,-22.29);}%
  \swpath{draw=black,line width=1.00bp}{(87.53,-32.19)--(90.65,-22.78)--(99.62,-22.78)}{\clip (86.83,-22.29)--(86.83,-25.88)--(83.78,-27.67)--(84.04,-27.93)--(84.88,-27.44)--(87.53,-32.19)--(90.66,-22.78)--(99.62,-22.78)--(99.62,-22.29)--(86.83,-22.29);}%
  \swpath{draw=black,line width=1.80bp}{(88.20,-1.93)--(89.04,-1.44)--(91.68,-6.19)}{\clip (90.98,3.71)--(90.98,0.12)--(87.94,-1.67)--(88.20,-1.93)--(89.04,-1.44)--(91.68,-6.19)--(94.81,3.22)--(103.78,3.22)--(103.78,3.71)--(90.98,3.71);}%
  \swpath{draw=black,line width=1.00bp}{(91.68,-6.19)--(94.81,3.22)--(103.78,3.22)}{\clip (90.98,3.71)--(90.98,0.12)--(87.94,-1.67)--(88.20,-1.93)--(89.04,-1.44)--(91.68,-6.19)--(94.81,3.22)--(103.78,3.22)--(103.78,3.71)--(90.98,3.71);}%
  \swpath{draw=black,line width=1.80bp}{(113.45,-36.05)--(114.29,-35.56)--(116.93,-40.31)}{\clip (116.23,-30.41)--(116.23,-34.00)--(113.19,-35.80)--(113.45,-36.06)--(114.29,-35.56)--(116.93,-40.31)--(120.06,-30.91)--(129.03,-30.91)--(129.03,-30.41)--(116.23,-30.41);}%
  \swpath{draw=black,line width=1.00bp}{(116.93,-40.31)--(120.06,-30.91)--(129.03,-30.91)}{\clip (116.23,-30.41)--(116.23,-34.00)--(113.19,-35.80)--(113.45,-36.06)--(114.29,-35.56)--(116.93,-40.31)--(120.06,-30.91)--(129.03,-30.91)--(129.03,-30.41)--(116.23,-30.41);}%
  \swpath{draw=black,line width=1.80bp}{(117.61,-10.05)--(118.45,-9.56)--(121.09,-14.31)}{\clip (120.39,-4.41)--(120.39,-8.00)--(117.35,-9.80)--(117.61,-10.06)--(118.44,-9.56)--(121.09,-14.31)--(124.22,-4.91)--(133.19,-4.91)--(133.19,-4.41)--(120.39,-4.41);}%
  \swpath{draw=black,line width=1.00bp}{(121.09,-14.31)--(124.22,-4.91)--(133.19,-4.91)}{\clip (120.39,-4.41)--(120.39,-8.00)--(117.35,-9.80)--(117.61,-10.06)--(118.44,-9.56)--(121.09,-14.31)--(124.22,-4.91)--(133.19,-4.91)--(133.19,-4.41)--(120.39,-4.41);}%
  \at{532.26}{-19.75}{\swmark{[3]}}%
  \swdepth{42.40}}`);
    correctOrPassed(paper, 2, stem(question(paper, 2)),
      String.raw`Express $\frac{4m\sqrt m-\frac{9}{\sqrt m}}{2\sqrt m+\frac{3}{\sqrt m}}$ in the form $Am+B$, where A and B
       are integers to be found.`);
  });

  it('a fraction as a power below a bar', () => {
    // 4037/22/O/N/18 Q5, page 6
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/O/N/18}{5}{Simultaneous Equations \textperiodcentered\ Indices \& Surds}{5}
\freerow{27.56}{%
  \at{210.70}{-5.65}{$\dfrac{8^{p+1}}{4^{q}} = 2^{11}$,}%
  \swdepth{15.64}}
\freerow{41.25}{%
  \at{211.26}{-0.00}{3}%
  \at{217.32}{4.94}{{\fontsize{7.50bp}{7.50bp}\selectfont 2{\itshape p}\kern0.69bp {\itshape +}\kern0.69bp 5}}%
  \at{255.14}{-0.81}{{\fontsize{7.50bp}{7.50bp}\selectfont 3{\itshape q}}}%
  \at{238.61}{-5.75}{{\itshape =}\kern2.99bp 9}%
  \at{263.73}{-5.19}{.}%
  \at{227.07}{-8.63}{{\fontsize{7.50bp}{7.50bp}\selectfont 1}}%
  \at{215.14}{-19.88}{27}%
  \at{227.07}{-16.69}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \ruleat{210.70}{235.61}{-2.44}{0.50}%
  \ruleat{226.70}{231.20}{-10.33}{0.41}%
  \at{532.85}{-5.19}{\swmark{[5]}}%
  \swdepth{22.08}}`);
    // Page 6 prints both equations; the first is typed, the second drawn.
    correctOrPassed(paper, 5, stem(question(paper, 5)),
      String.raw`$\frac{8^{p+1}}{4^q}=2^{11}$, $\frac{3^{2p+5}}{27^{\frac13}}=9^{3q}$.`);
  });

  it('a fraction at the start of the second of two lines', () => {
    // 4037/11/M/J/23 Q5(b), page 9
    const paper = paperOf(MATHS, String.raw`\examq{4037/11/M/J/23}{5}{Trigonometry \textperiodcentered\ Indices \& Surds}{8}
\freerow{45.59}{%
  \at{94.97}{-0.00}{In\kern2.71bp the\kern2.72bp triangle\kern2.72bp {\itshape PQR},\kern9.53bp {\itshape PQ}\kern3.17bp {\itshape =}\kern3.15bp 3\kern1.56bp {\itshape +}\kern1.56bp 2}%
  \at{257.11}{-0.01}{5}%
  \at{272.08}{-0.01}{and\kern2.72bp angle\kern4.11bp {\itshape PQR}\kern3.17bp {\itshape =}\kern3.15bp 30\textdegree{}\kern0.49bp .\kern2.71bp Given\kern2.72bp that\kern2.72bp the\kern2.72bp area\kern2.72bp of\kern2.71bp this\kern2.72bp triangle\kern2.72bp is}%
  \at{96.61}{-16.41}{2\kern1.56bp {\itshape +}\kern1.55bp 5}%
  \at{127.62}{-16.41}{5}%
  \at{135.02}{-23.01}{,\kern8.62bp find {\itshape QR}, giving your answer in the form\kern3.65bp {\itshape c}\kern1.55bp {\itshape +}\kern1.55bp {\itshape d}}%
  \at{365.77}{-23.01}{5\kern1.09bp , where {\itshape c} and {\itshape d} are integers.}%
  \at{112.12}{-29.26}{4}%
  \ruleat{96.05}{133.93}{-19.54}{0.50}%
  \swpath{draw=black,line width=1.20bp}{(200.62,3.18)--(201.22,3.72)--(203.03,-1.16)}{\clip (202.53,9.68)--(202.53,5.35)--(200.39,3.41)--(200.62,3.18)--(201.22,3.72)--(203.03,-1.16)--(206.64,9.18)--(213.25,9.18)--(213.25,9.68)--(202.53,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(203.03,-1.16)--(206.64,9.18)--(213.25,9.18)}{\clip (202.53,9.68)--(202.53,5.35)--(200.39,3.41)--(200.62,3.18)--(201.22,3.72)--(203.03,-1.16)--(206.64,9.18)--(213.25,9.18)--(213.25,9.68)--(202.53,9.68);}%
  \swpath{draw=black,line width=1.20bp}{(71.14,-13.23)--(71.74,-12.69)--(73.55,-17.57)}{\clip (73.05,-6.72)--(73.05,-11.05)--(70.90,-12.99)--(71.14,-13.23)--(71.74,-12.69)--(73.55,-17.57)--(77.16,-7.22)--(83.77,-7.22)--(83.77,-6.72)--(73.05,-6.72);}%
  \swpath{draw=black,line width=1.00bp}{(73.55,-17.57)--(77.16,-7.22)--(83.77,-7.22)}{\clip (73.05,-6.72)--(73.05,-11.05)--(70.90,-12.99)--(71.14,-13.23)--(71.74,-12.69)--(73.55,-17.57)--(77.16,-7.22)--(83.77,-7.22)--(83.77,-6.72)--(73.05,-6.72);}%
  \swpath{draw=black,line width=1.20bp}{(309.29,-19.82)--(309.89,-19.28)--(311.69,-24.16)}{\clip (311.19,-13.32)--(311.19,-17.64)--(309.05,-19.59)--(309.29,-19.82)--(309.89,-19.28)--(311.69,-24.16)--(315.30,-13.82)--(321.92,-13.82)--(321.92,-13.32)--(311.19,-13.32);}%
  \swpath{draw=black,line width=1.00bp}{(311.69,-24.16)--(315.30,-13.82)--(321.91,-13.82)}{\clip (311.19,-13.32)--(311.19,-17.64)--(309.05,-19.59)--(309.29,-19.82)--(309.89,-19.28)--(311.69,-24.16)--(315.30,-13.82)--(321.92,-13.82)--(321.92,-13.32)--(311.19,-13.32);}%
  \at{532.26}{-23.01}{\swmark{[4]}}%
  \swdepth{31.56}}`);
    correctOrPassed(paper, 5, stem(question(paper, 5)),
      String.raw`In the triangle PQR, $PQ=3+2\sqrt5$ and angle PQR = 30°. Given that the area of this triangle is
       $\frac{2+5\sqrt5}{4}$, find QR, giving your answer in the form $c+d\sqrt5$, where c and d are integers.`);
  });

  it('a root inside the base of a logarithm', () => {
    // 4037/21/M/J/21 Q8(b), page 9
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/21}{8}{Logarithmic \& Exponential Functions}{8}
\freerow{217.53}{%
  \at{72.28}{-0.01}{\textbf{(b)}}%
  \at{94.96}{-0.01}{W\kern-0.46bp rite the expression\kern9.37bp log}%
  \at{214.07}{-4.00}{{\fontsize{8.05bp}{8.05bp}\selectfont {\itshape a}}}%
  \at{219.25}{-0.00}{9\kern1.57bp {\itshape +}\kern2.37bp (log}%
  \at{255.63}{-4.00}{{\fontsize{8.05bp}{8.05bp}\selectfont {\itshape a}}}%
  \at{260.81}{-0.00}{{\itshape b})\kern1.21bp (log}%
  \at{295.63}{-4.00}{{\fontsize{8.05bp}{8.05bp}\selectfont {\itshape b}}}%
  \at{300.81}{-0.00}{9{\itshape a})\kern9.30bp in the form\kern3.65bp {\itshape c}\kern1.55bp {\itshape +}\kern1.55bp {\itshape d}\kern1.56bp log}%
  \at{418.57}{-4.00}{{\fontsize{8.05bp}{8.05bp}\selectfont {\itshape a}}}%
  \at{423.76}{-0.00}{9\kern0.60bp , where {\itshape c} and {\itshape d} are}%
  \at{94.96}{-13.00}{integers.}%
  \swpath{draw=black,line width=1.08bp}{(241.32,-1.74)--(241.74,-1.36)--(243.01,-4.82)}{\clip (242.56,2.87)--(242.56,-0.20)--(241.11,-1.53)--(241.32,-1.74)--(241.74,-1.36)--(243.01,-4.82)--(245.53,2.43)--(250.06,2.43)--(250.06,2.87)--(242.56,2.87);}%
  \swpath{draw=black,line width=0.88bp}{(243.01,-4.82)--(245.53,2.43)--(250.06,2.43)}{\clip (242.56,2.87)--(242.56,-0.20)--(241.11,-1.53)--(241.32,-1.74)--(241.74,-1.36)--(243.01,-4.82)--(245.53,2.43)--(250.06,2.43)--(250.06,2.87)--(242.56,2.87);}%
  \at{532.26}{-13.00}{\swmark{[4]}}%
  \swdepth{15.30}}`);
    correctOrPassed(paper, 8, content(part(question(paper, 8), 'b')),
      String.raw`Write the expression $\log_a9+(\log_ab)(\log_{\sqrt b}9a)$ in the form $c+d\log_a9$, where c and d are
       integers.`);
  });

  it('integrals', () => {
    // 4037/22/M/J/16 Q9(a) and (b)(i), page 9
    const a = paperOf(MATHS, String.raw`\examq{4037/22/M/J/16}{9}{Integration}{7}
\freerow{3.69}{%
  \at{134.93}{0.00}{{\itshape x}}%
  \at{140.58}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont 3}}%
  \at{146.96}{0.00}{{\itshape +}\kern2.37bp {\itshape x}}%
  \at{162.80}{5.16}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{169.18}{0.00}{{\itshape +}\kern2.37bp 1}%
  \at{49.61}{-6.03}{\textbf{9}}%
  \at{72.28}{-6.03}{\textbf{(a)}}%
  \at{94.96}{-6.03}{Find}%
  \at{125.59}{-13.60}{\swglyph{9}{125.59bp 752.01bp 461.93bp 68.21bp}}%
  \at{160.86}{-9.90}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{187.17}{-6.02}{d{\itshape x}\kern1.00bp .}%
  \at{155.21}{-15.06}{{\itshape x}}%
  \ruleat{133.96}{185.68}{-2.56}{0.50}%
  \at{532.26}{-6.03}{\swmark{[3]}}%
  \swdepth{17.36}}`);
    correctOrPassed(a, 9, content(part(question(a, 9), 'a')), String.raw`Find $\int\frac{x^3+x^2+1}{x^2}dx$.`);
    const b = paperOf(MATHS, String.raw`\examq{4037/22/M/J/16}{9}{Integration}{7}
\freerow{162.03}{%
  \at{72.28}{0.00}{\textbf{(b)}}%
  \at{95.44}{0.00}{\textbf{(i)}}%
  \at{117.63}{0.00}{Find}%
  \at{142.28}{-7.56}{\swglyph{9}{142.28bp 596.01bp 445.24bp 224.20bp}}%
  \at{150.88}{0.00}{sin\kern1.17bp (5{\itshape x}\kern2.37bp {\itshape +}}%
  \at{192.86}{-0.70}{\swglyph{9}{192.86bp 602.87bp 395.37bp 232.46bp}}%
  \at{199.23}{0.00}{)\kern1.07bp d{\itshape x}\kern1.09bp .}%
  \at{532.26}{0.00}{\swmark{[2]}}%
  \swdepth{4.36}}`);
    correctOrPassed(b, 9, content(part(question(b, 9), 'b', 'i')),
      String.raw`Find $\int\sin(5x+\pi)dx$.`);
    // 4037/21/M/J/16 Q11(i), page 12
    const c = paperOf(MATHS, String.raw`\examq{4037/21/M/J/16}{11}{Integration \textperiodcentered\ Straight-Line Graphs}{8}
\freerow{4.4}{%
  \at{49.61}{-2.60}{\textbf{1}\kern-0.63bp \textbf{1}}%
  \at{72.77}{-2.60}{\textbf{(i)}}%
  \at{94.96}{-2.60}{Find}%
  \at{125.59}{-10.17}{\swglyph{12}{125.59bp 754.72bp 461.93bp 65.49bp}}%
  \at{137.52}{-2.60}{3{\itshape x}}%
  \at{151.22}{-2.12}{\swsy{2D}}%
  \at{160.92}{-2.60}{{\itshape x}}%
  \at{175.33}{-2.60}{d{\itshape x}\kern0.99bp .}%
  \at{133.68}{-2.86}{\swglyph{12}{133.68bp 762.03bp 457.91bp 68.02bp}}%
  \at{166.99}{-0.29}{{\fontsize{5.75bp}{5.75bp}\selectfont 2}}%
  \at{166.99}{6.40}{{\fontsize{5.75bp}{5.75bp}\selectfont 3}}%
  \at{166.17}{-3.10}{\swglyph{12}{166.17bp 761.79bp 421.10bp 67.78bp}}%
  \ruleat{166.58}{170.27}{4.95}{0.41}%
  \at{532.26}{-2.60}{\swmark{[2]}}%
  \swdepth{6.97}}`);
    correctOrPassed(c, 11, content(part(question(c, 11), 'i')), String.raw`Find $\int(3x-x^{\frac32})dx$.`);
  });

  it('sets: the universal set, pi and the intersection sign as pictures', () => {
    // 4037/12/M/J/16 Q1(a), page 3
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{1}{Excluded from the present curriculum}{4}
\freerow{0.87}{%
  \at{49.61}{0.00}{\textbf{1}}%
  \at{72.28}{0.00}{\textbf{(a)}}%
  \at{94.96}{0.00}{The universal set}%
  \at{176.05}{-0.46}{\swglyph{3}{176.05bp 767.96bp 411.70bp 64.97bp}}%
  \at{186.94}{0.00}{is the set of real numbers and sets $X$, $Y$ and $Z$ are such that}}
\row{26.0}{117.64}{$X$ = \{integer multiples of 5\},}
\row{26.0}{117.64}{$Y$ = \{integer multiples of 10\},}
\freerow{25.99}{%
  \at{117.64}{-0.01}{{\itshape Z} = \{}%
  \at{142.77}{-0.58}{\swglyph{3}{142.77bp 689.85bp 446.19bp 146.20bp}}%
  \at{149.73}{-0.00}{,}%
  \at{164.54}{-0.00}{2\kern1.09bp , e\}.}%
  \swpath{draw=black,line width=1.80bp}{(107.67,4.04)--(108.51,4.53)--(111.15,-0.22)}{\clip (110.45,9.68)--(110.45,6.09)--(107.41,4.30)--(107.67,4.04)--(108.51,4.53)--(111.15,-0.22)--(114.28,9.18)--(120.69,9.18)--(120.69,9.68)--(110.45,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(111.15,-0.22)--(114.28,9.18)--(120.69,9.18)}{\clip (110.45,9.68)--(110.45,6.09)--(107.41,4.30)--(107.67,4.04)--(108.51,4.53)--(111.15,-0.22)--(114.28,9.18)--(120.69,9.18)--(120.69,9.68)--(110.45,9.68);}}
\row{26.0}{94.97}{Use set notation to complete the two statements below\kern-0.75bp .}
\freerow{26.01}{%
  \at{94.97}{0.00}{{\itshape Y} ............... {\itshape X}}%
  \at{256.70}{0.00}{{\itshape Y}}%
  \at{265.39}{-0.46}{\swglyph{3}{265.39bp 637.96bp 321.88bp 195.69bp}}%
  \at{275.55}{0.00}{{\itshape Z} {\itshape =} ...............}%
  \at{532.26}{0.00}{\swmark{[2]}}}`);
    correctOrPassed(paper, 1, content(part(question(paper, 1), 'a')),
      String.raw`The universal set E is the set of real numbers and sets X, Y and Z are such that
       X = {integer multiples of 5}, Y = {integer multiples of 10}, Z = {$\pi$, $\sqrt2$, e}.
       Use set notation to complete the two statements below. Y ............... X $Y\cap Z$ = ...............`);
  });

  it('minus signs as pictures in a list of numbers', () => {
    // 4037/22/M/J/20 Q10(a), page 10
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/20}{10}{Arithmetic \& Geometric Progressions}{11}
\row{0.0}{94.96}{\lab{45.35}{\textbf{10}}\lab{22.68}{\textbf{(a)}}The first 5 terms of a sequence are given below\kern-0.75bp .}
\freerow{26.0}{%
  \at{195.97}{-0.01}{4}%
  \at{235.39}{2.66}{\swglyph{10}{235.39bp 745.95bp 352.37bp 94.42bp}}%
  \at{244.06}{-0.00}{2}%
  \at{283.40}{-0.00}{1}%
  \at{323.07}{2.66}{\swglyph{10}{323.07bp 745.95bp 264.69bp 94.42bp}}%
  \at{331.50}{-0.00}{0.5}%
  \at{379.18}{-0.00}{0.25}}`);
    correctOrPassed(paper, 10, content(part(question(paper, 10), 'a')),
      'The first 5 terms of a sequence are given below. 4 -2 1 -0.5 0.25');
  });

  it('a fraction of pi on both sides of an inequality, one of them negative', () => {
    // 4037/12/M/J/21 Q9(c), page 13
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/21}{9}{Arithmetic \& Geometric Progressions \textperiodcentered\ Trigonometry}{10}
\freerow{136.97}{%
  \at{350.37}{-0.88}{{\fontsize{8.05bp}{8.05bp}\selectfont 2}}%
  \at{421.60}{-0.00}{\swsy{70}}%
  \at{467.26}{-0.00}{\swsy{70}}%
  \at{72.28}{-6.04}{\textbf{(c)}}%
  \at{94.96}{-6.04}{Explain\kern4.20bp why\kern4.20bp the\kern4.20bp geometric\kern4.20bp progression}%
  \at{293.62}{-6.04}{1,\kern4.74bp sin}%
  \at{321.97}{-6.85}{\swglyph{13}{321.97bp 443.47bp 267.23bp 389.70bp}}%
  \at{328.79}{-6.03}{,\kern4.73bp sin}%
  \at{355.61}{-6.85}{\swglyph{13}{355.61bp 443.47bp 233.59bp 389.70bp}}%
  \at{362.43}{-6.03}{,\kern4.20bp \swsy{BC}}%
  \at{393.60}{-6.03}{for}%
  \at{412.13}{-3.61}{\swglyph{13}{412.13bp 446.71bp 175.63bp 393.66bp}}%
  \at{432.64}{-6.50}{\swglyph{13}{432.64bp 443.82bp 154.64bp 389.83bp}}%
  \at{444.49}{-6.85}{\swglyph{13}{444.49bp 443.47bp 144.47bp 389.70bp}}%
  \at{454.39}{-6.50}{\swglyph{13}{454.39bp 443.82bp 132.65bp 389.59bp}}%
  \at{475.37}{-6.03}{,\kern4.20bp where}%
  \at{514.76}{-6.85}{\swglyph{13}{514.76bp 443.47bp 74.19bp 389.70bp}}%
  \at{524.85}{-6.03}{is\kern4.20bp in}%
  \at{421.72}{-12.28}{2}%
  \at{467.37}{-12.28}{2}%
  \ruleat{420.56}{428.62}{-2.57}{0.50}%
  \ruleat{466.22}{474.28}{-2.57}{0.50}%
  \swdepth{14.58}}`);
    correctOrPassed(paper, 9, content(part(question(paper, 9), 'c')),
      String.raw`Explain why the geometric progression $1,\sin\theta,\sin^2\theta,\ldots$ for
       $-\frac\pi2<\theta<\frac\pi2$, where $\theta$ is in`);
  });

  it('a minus as a picture in front of the first of three numbers', () => {
    // 4037/12/M/J/21 Q9(a), page 12
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/21}{9}{Arithmetic \& Geometric Progressions \textperiodcentered\ Trigonometry}{10}
\freerow{0.91}{%
  \at{49.61}{0.00}{\textbf{9}}%
  \at{72.28}{0.00}{\textbf{(a)}}%
  \at{94.96}{0.00}{The\kern2.78bp first\kern2.78bp three\kern2.78bp terms\kern2.78bp of\kern2.78bp an\kern2.78bp arithmetic\kern2.78bp progression\kern2.78bp are}%
  \at{340.59}{2.66}{\swglyph{12}{340.59bp 771.04bp 247.17bp 69.33bp}}%
  \at{349.02}{0.00}{4,\kern2.06bp 8,\kern2.51bp 20\kern0.68bp .\kern2.78bp Find\kern2.78bp the\kern2.78bp smallest\kern2.78bp number\kern2.78bp of\kern2.78bp terms}}`);
    correctOrPassed(paper, 9, content(part(question(paper, 9), 'a')),
      'The first three terms of an arithmetic progression are -4, 8, 20. Find the smallest number of terms');
  });

  it('pi as a picture after a number', () => {
    // 4037/22/M/J/20 Q11(a), page 12
    const paper = paperOf(MATHS, String.raw`\examq{4037/22/M/J/20}{11}{Circular Measure}{8}
\freerow{26.0}{%
  \at{72.29}{-0.00}{\textbf{(a)}}%
  \at{94.96}{-0.00}{Given that the perimeter of the shaded region\kern2.87bp is 4}%
  \at{322.73}{-0.65}{\swglyph{12}{322.73bp 571.68bp 265.98bp 263.65bp}}%
  \at{330.70}{-0.01}{cm, find the value of {\itshape r}.}%
  \at{532.26}{-0.01}{\swmark{[4]}}}`);
    correctOrPassed(paper, 11, content(part(question(paper, 11), 'a')),
      String.raw`Given that the perimeter of the shaded region is $4\pi$ cm, find the value of r.`);
  });
});

describe('maths: what is passed over is still shown, never silently dropped', () => {
  it('keeps the words around an equation it cannot read', () => {
    // 4037/12/M/J/16 Q5(i), page 7
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{5}{Trigonometry}{7}
\freerow{1.97}{%
  \at{49.61}{-0.53}{\textbf{5}}%
  \at{72.77}{-0.53}{\textbf{(i)}}%
  \at{94.96}{-0.53}{Show that}%
  \at{144.74}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{148.82}{-0.53}{1}%
  \at{157.43}{-0.05}{\swsy{2D}}%
  \at{167.12}{-0.53}{cos}%
  \at{184.63}{-1.23}{\swglyph{7}{184.63bp 766.09bp 404.57bp 66.12bp}}%
  \at{184.45}{-3.33}{\swglyph{7}{184.45bp 763.99bp 401.15bp 65.58bp}}%
  \at{194.46}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{198.53}{-0.53}{1\kern2.38bp {\itshape +}\kern2.36bp sec}%
  \at{233.45}{-1.23}{\swglyph{7}{233.45bp 766.09bp 355.51bp 66.12bp}}%
  \at{233.52}{-3.33}{\swglyph{7}{233.52bp 763.99bp 351.84bp 65.82bp}}%
  \at{246.01}{-0.53}{{\itshape =}\kern3.14bp sin}%
  \at{272.33}{-1.23}{\swglyph{7}{272.33bp 766.09bp 316.63bp 66.12bp}}%
  \at{279.48}{-0.53}{tan}%
  \at{295.69}{-1.23}{\swglyph{7}{295.69bp 766.09bp 293.50bp 66.12bp}}%
  \at{302.37}{-0.53}{.}%
  \at{532.26}{-0.53}{\swmark{[4]}}}`);
    const text = everything(question(paper, 5));
    expect(text).toContain('Show that');
    expect(text).toContain('cos');
    expect(text).toContain('tan');
  });

  it('never prints a measurement of the drawing', () => {
    // 4037/12/M/J/16 Q6, page 8
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/16}{6}{Differentiation \textperiodcentered\ Logarithmic \& Exponential Functions}{5}
\freerow{3.16}{%
  \at{348.43}{-0.53}{e}%
  \at{354.09}{4.63}{{\fontsize{8.00bp}{8.00bp}\selectfont 3{\itshape x}}}%
  \at{362.89}{-0.24}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{368.25}{-0.53}{{\itshape px}\kern2.36bp {\itshape +}\kern2.36bp {\itshape q}}%
  \at{397.86}{-3.33}{\swglyph{8}{397.86bp 762.80bp 193.73bp 67.01bp}}%
  \at{134.33}{-2.41}{d}%
  \at{153.57}{-3.28}{{\fontsize{8.00bp}{8.00bp}\selectfont 3{\itshape x}}}%
  \at{143.84}{-7.05}{{\fontsize{11.74bp}{11.74bp}\selectfont \swsy{28}}}%
  \at{200.48}{-9.90}{\swglyph{8}{200.48bp 756.23bp 391.12bp 73.34bp}}%
  \at{49.61}{-8.43}{\textbf{6}}%
  \at{72.28}{-8.43}{Show that}%
  \at{147.92}{-8.43}{e}%
  \at{170.85}{-8.43}{4{\itshape x}\kern2.36bp {\itshape +}\kern2.36bp 1}%
  \at{216.17}{-8.43}{can be written in the form}%
  \at{402.62}{-8.43}{,}%
  \at{417.00}{-8.43}{where {\itshape p} and {\itshape q} are}%
  \at{131.76}{-14.91}{d{\itshape x}}%
  \at{364.12}{-16.59}{4{\itshape x}\kern2.37bp {\itshape +}\kern2.36bp 1}%
  \ruleat{131.20}{143.17}{-4.96}{0.50}%
  \ruleat{347.87}{401.53}{-4.96}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)}{\clip (116.77,1.25)--(116.77,-2.34)--(113.73,-4.13)--(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)--(150.41,1.25)--(116.77,1.25);}%
  \swpath{draw=black,line width=1.00bp}{(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)}{\clip (116.77,1.25)--(116.77,-2.34)--(113.73,-4.13)--(113.99,-4.39)--(114.83,-3.90)--(117.47,-8.65)--(120.60,0.75)--(150.41,0.75)--(150.41,1.25)--(116.77,1.25);}%
  \swpath{draw=black,line width=1.80bp}{(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)}{\clip (310.04,-6.90)--(310.04,-10.49)--(306.99,-12.29)--(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)--(343.68,-6.90)--(310.04,-6.90);}%
  \swpath{draw=black,line width=1.00bp}{(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)}{\clip (310.04,-6.90)--(310.04,-10.49)--(306.99,-12.29)--(307.25,-12.55)--(308.09,-12.05)--(310.74,-16.81)--(313.86,-7.40)--(343.68,-7.40)--(343.68,-6.90)--(310.04,-6.90);}%
  \swdepth{18.89}}
\row{34.43}{72.28}{integers to be found.\swmark{[5]}}`);
    expect(everything(question(paper, 6))).not.toMatch(/\d\.\d|bp\b|clip|line width|black/);
  });
});

describe('maths: more equations from the page (round 1)', () => {
  it('a bracket squared, drawn from two same-size bracket pictures', () => {
    // 4037/21/M/J/16 Q5, page 6: "(b) Given that 28 + p√3 = (q + 2√3)², where p and q are integers,
    // find the values of p and of q. [3]". The brackets are pictures of one size: read by their order, or passed.
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/16}{5}{Indices \& Surds}{6}
\row{-0.18}{72.28}{\lab{22.67}{\textbf{5}}\textbf{Do} \textbf{not} \textbf{use} \textbf{a} \textbf{calculator}\kern2.67bp \textbf{in} \textbf{this} \textbf{question.}}
\partbreak
\freerow{19.96}{%
  \at{159.90}{-0.00}{8}%
  \at{72.28}{-6.04}{\textbf{(a)}}%
  \at{94.96}{-6.04}{Express}%
  \at{183.31}{-6.04}{in the form}%
  \at{246.34}{-6.04}{{\itshape a}\kern2.38bp {\itshape +}}%
  \at{272.62}{-6.04}{{\itshape b}\kern1.10bp , where {\itshape a} and {\itshape b} are integers.}%
  \at{146.74}{-14.20}{7}%
  \at{155.34}{-13.72}{\swsy{2D}}%
  \at{173.02}{-14.20}{5}%
  \ruleat{138.21}{179.34}{-2.57}{0.50}%
  \swpath{draw=black,line width=1.80bp}{(89.88,-10.15)--(90.71,-9.66)--(93.36,-14.41)}{\clip (92.66,-4.51)--(92.66,-8.10)--(89.62,-9.90)--(89.88,-10.16)--(90.72,-9.66)--(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)--(102.89,-4.51)--(92.66,-4.51);}%
  \swpath{draw=black,line width=1.00bp}{(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)}{\clip (92.66,-4.51)--(92.66,-8.10)--(89.62,-9.90)--(89.88,-10.16)--(90.72,-9.66)--(93.36,-14.41)--(96.49,-5.01)--(102.89,-5.01)--(102.89,-4.51)--(92.66,-4.51);}%
  \swpath{draw=black,line width=1.80bp}{(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)}{\clip (105.82,9.68)--(105.82,6.09)--(102.77,4.29)--(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)--(109.64,9.18)--(116.05,9.18)--(116.05,9.68)--(105.82,9.68);}%
  \swpath{draw=black,line width=1.00bp}{(106.52,-0.23)--(109.65,9.18)--(116.05,9.18)}{\clip (105.82,9.68)--(105.82,6.09)--(102.77,4.29)--(103.03,4.03)--(103.87,4.53)--(106.52,-0.23)--(109.64,9.18)--(116.05,9.18)--(116.05,9.68)--(105.82,9.68);}%
  \swpath{draw=black,line width=1.80bp}{(116.16,-10.15)--(117.00,-9.66)--(119.64,-14.41)}{\clip (118.94,-4.51)--(118.94,-8.10)--(115.90,-9.90)--(116.16,-10.16)--(117.00,-9.66)--(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)--(129.18,-4.51)--(118.94,-4.51);}%
  \swpath{draw=black,line width=1.00bp}{(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)}{\clip (118.94,-4.51)--(118.94,-8.10)--(115.90,-9.90)--(116.16,-10.16)--(117.00,-9.66)--(119.64,-14.41)--(122.77,-5.01)--(129.18,-5.01)--(129.18,-4.51)--(118.94,-4.51);}%
  \swpath{draw=black,line width=1.80bp}{(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)}{\clip (192.26,3.65)--(192.26,0.06)--(189.22,-1.74)--(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)--(202.49,3.65)--(192.26,3.65);}%
  \swpath{draw=black,line width=1.00bp}{(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)}{\clip (192.26,3.65)--(192.26,0.06)--(189.22,-1.74)--(189.47,-2.00)--(190.31,-1.50)--(192.96,-6.26)--(196.09,3.15)--(202.49,3.15)--(202.49,3.65)--(192.26,3.65);}%
  \swpath{draw=black,line width=1.80bp}{(215.76,-2.00)--(216.59,-1.50)--(219.24,-6.26)}{\clip (218.54,3.65)--(218.54,0.06)--(215.50,-1.74)--(215.76,-2.00)--(216.60,-1.50)--(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)--(228.77,3.65)--(218.54,3.65);}%
  \swpath{draw=black,line width=1.00bp}{(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)}{\clip (218.54,3.65)--(218.54,0.06)--(215.50,-1.74)--(215.76,-2.00)--(216.60,-1.50)--(219.24,-6.26)--(222.37,3.15)--(228.77,3.15)--(228.77,3.65)--(218.54,3.65);}%
  \at{532.26}{-6.04}{\swmark{[3]}}%
  \swdepth{16.50}}
\partbreak
\freerow{239.51}{%
  \at{72.28}{-0.53}{\textbf{(b)}}%
  \at{94.96}{-0.53}{Given that\kern9.47bp 28\kern2.37bp {\itshape +}\kern2.37bp {\itshape p}}%
  \at{191.63}{-0.53}{3\kern3.15bp {\itshape =}}%
  \at{211.22}{-2.85}{\swglyph{6}{211.22bp 507.15bp 380.37bp 322.90bp}}%
  \at{215.06}{-0.53}{{\itshape q}\kern2.38bp {\itshape +}\kern2.37bp 2}%
  \at{248.29}{-0.53}{3}%
  \at{254.25}{-3.09}{\swglyph{6}{254.25bp 506.91bp 337.34bp 322.66bp}}%
  \at{257.81}{5.13}{{\fontsize{8.00bp}{8.00bp}\selectfont 2}}%
  \at{262.90}{-0.53}{, where {\itshape p} and {\itshape q} are integers, find the values of {\itshape p} and of {\itshape q}.}%
  \swpath{draw=black,line width=1.80bp}{(134.75,3.51)--(135.59,4.01)--(138.24,-0.75)}{\clip (137.54,9.16)--(137.54,5.57)--(134.49,3.77)--(134.75,3.51)--(135.59,4.01)--(138.24,-0.75)--(141.37,8.66)--(147.77,8.66)--(147.77,9.16)--(137.54,9.16);}%
  \swpath{draw=black,line width=1.00bp}{(138.24,-0.75)--(141.37,8.66)--(147.77,8.66)}{\clip (137.54,9.16)--(137.54,5.57)--(134.49,3.77)--(134.75,3.51)--(135.59,4.01)--(138.24,-0.75)--(141.37,8.66)--(147.77,8.66)--(147.77,9.16)--(137.54,9.16);}%
  \swpath{draw=black,line width=1.80bp}{(191.41,3.51)--(192.25,4.01)--(194.89,-0.75)}{\clip (194.19,9.16)--(194.19,5.57)--(191.15,3.77)--(191.41,3.51)--(192.25,4.01)--(194.89,-0.75)--(198.02,8.66)--(204.43,8.66)--(204.43,9.16)--(194.19,9.16);}%
  \swpath{draw=black,line width=1.00bp}{(194.89,-0.75)--(198.02,8.66)--(204.43,8.66)}{\clip (194.19,9.16)--(194.19,5.57)--(191.15,3.77)--(191.41,3.51)--(192.25,4.01)--(194.89,-0.75)--(198.02,8.66)--(204.43,8.66)--(204.43,9.16)--(194.19,9.16);}%
  \at{532.26}{-0.53}{\swmark{[3]}}}`);
    const q = question(paper, 5);
    expect(q.marks).toBe(6);
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['a', 3], ['b', 3]]);
    correctOrPassed(paper, 5, content(part(q, 'b')),
      String.raw`Given that $28+p\sqrt3=(q+2\sqrt3)^2$, where p and q are integers, find the values of p and of q.`);
    // Passed or not, the line is still shown.
    const b = content(part(q, 'b'));
    expect(b).toContain(canon('Given that'));
    expect(b).toContain('28');
    expect(b).toContain(canon('where p and q are integers, find the values of p and of q.'));
    expect(everything(q)).not.toMatch(/bp\b|clip|line width|black/);
  });

  it('logarithms with letter-spaced "log" and an equals sign as a picture', () => {
    // 4037/12/M/J/21 Q5, page 7: "(c) Solve the equation 4 log_y 2 + log_2 y = 4. [3]"
    const paper = paperOf(MATHS, String.raw`\examq{4037/12/M/J/21}{5}{Logarithmic \& Exponential Functions}{8}
\freerow{1.12}{%
  \at{49.61}{-0.00}{\textbf{5}}%
  \at{72.28}{-0.00}{\textbf{(a)}}%
  \at{94.96}{-0.00}{Given that}%
  \at{152.56}{-0.00}{$\log _{a}p+\log _{a}5 - \log _{a}4 = \log _{a}20$,}%
  \at{310.37}{-0.00}{find the value of $p$.}%
  \at{532.26}{-0.00}{\hfill\swmark{[2]}}%
  \swdepth{5.61}}
\partbreak
\freerow{169.0}{%
  \at{72.29}{-0.01}{\textbf{(b)}}%
  \at{94.97}{-0.01}{Solve the equation}%
  \at{189.82}{-0.01}{$3^{2x+1} +8(3^{x}) - 3 = 0$.}%
  \at{531.68}{-0.01}{\hfill\swmark{[3]}}}
\partbreak
\freerow{221.0}{%
  \at{72.28}{-0.01}{{\fontsize{12.00bp}{12.00bp}\selectfont \textbf{(c)}}}%
  \at{94.96}{-0.01}{{\fontsize{12.00bp}{12.00bp}\selectfont Solve\kern3.00bp the\kern3.00bp equation\kern10.80bp 4\kern1.31bp l\kern-0.15bp og}}%
  \at{218.87}{-3.26}{{\fontsize{7.00bp}{7.00bp}\selectfont {\itshape y}}}%
  \at{225.12}{-0.30}{{\fontsize{12.00bp}{12.00bp}\selectfont 2}}%
  \at{233.23}{-0.54}{\swsy{2B}}%
  \at{241.62}{-0.30}{{\fontsize{12.00bp}{12.00bp}\selectfont l\kern-0.15bp og}}%
  \at{257.46}{-3.26}{{\fontsize{7.00bp}{7.00bp}\selectfont 2}}%
  \at{264.93}{-0.30}{{\fontsize{12.00bp}{12.00bp}\selectfont {\itshape y}}}%
  \at{273.45}{0.74}{\swglyph{7}{273.45bp 378.91bp 315.50bp 459.78bp}}%
  \at{282.74}{-0.30}{{\fontsize{12.00bp}{12.00bp}\selectfont 4.}}%
  \at{531.68}{-0.00}{\swmark{[3]}}%
  \swdepth{4.66}}`);
    const q = question(paper, 5);
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['a', 2], ['b', 3], ['c', 3]]);
    // (a) and (b) are typed: kept as typed.
    expect(raw(part(q, 'a').content)).toContain(String.raw`$\log _{a}p+\log _{a}5 - \log _{a}4 = \log _{a}20$`);
    expect(raw(part(q, 'b').content)).toContain(String.raw`$3^{2x+1} +8(3^{x}) - 3 = 0$`);
    correctOrPassed(paper, 5, content(part(q, 'c')), String.raw`Solve the equation $4\log_y 2+\log_2 y=4$.`);
    // Passed or not: the words stay, and "l\kern-0.15bp og" is one word.
    const c = everything({ ...q, parts: [part(q, 'c')] });
    expect(c).toContain('Solve the equation');
    expect(c).not.toMatch(/l og/);
  });

  it('a typed fraction and derivatives across a page, then a blank page', () => {
    // 4037/21/M/J/16 Q12, pages 14 and 15: "A curve has equation y = (2x − 5)/(x − 1) − 12x."
    // (i) Find dy/dx. [3]  (ii) Find d²y/dx². [2]  (iii) ... stationary points ... nature. [5]; page 16 is BLANK PAGE
    const paper = paperOf(MATHS, String.raw`\examq{4037/21/M/J/16}{12}{Differentiation}{10}
\freerow{0.9}{%
  \at{49.61}{-6.02}{\textbf{12}}%
  \at{72.28}{-6.02}{A curve has equation}%
  \at{176.83}{-6.02}{$y = \dfrac{2x - 5}{x - 1} - 12x$.}%
  \at{72.77}{-35.04}{\textbf{(i)}}%
  \at{94.97}{-35.04}{Find}%
  \at{122.89}{-35.04}{$\dfrac{\mathrm{d}y}{\mathrm{d}x}$.}%
  \at{532.26}{-35.04}{\hfill\swmark{[3]}}%
  \swdepth{43.81}}
\freerow{222.13}{%
  \at{69.57}{-7.91}{\textbf{(ii)}}%
  \at{94.96}{-7.91}{Find}%
  \at{122.89}{-7.91}{$\dfrac{\mathrm{d}^{2}y}{\mathrm{d}x^{2}}$.}%
  \at{532.26}{-7.91}{\hfill\swmark{[2]}}%
  \swdepth{19.24}}
\newpage
\pagestart
\partbreak
\freerow{0.0}{%
  \at{66.37}{-0.00}{\textbf{(iii)}}%
  \at{94.95}{-0.00}{Find the coordinates of the stationary points of the curve and determine their nature.}%
  \at{532.25}{-0.00}{\swmark{[5]}}}
\newpage
\pagestart
\freerow{-0.18}{%
  \at{260.21}{0.00}{\textbf{BLANK} \textbf{P}\kern-0.85bp \textbf{AGE}}}`);
    const q = question(paper, 12);
    expect(raw(q.stem)).toContain(String.raw`$y = \dfrac{2x - 5}{x - 1} - 12x$.`);
    correct(paper, 12, stem(q), String.raw`A curve has equation $y=\frac{2x-5}{x-1}-12x$.`);
    expect(q.parts.map((p) => [p.label, p.marks])).toEqual([['i', 3], ['ii', 2], ['iii', 5]]);
    expect(raw(part(q, 'i').content)).toContain(String.raw`$\dfrac{\mathrm{d}y}{\mathrm{d}x}$`);
    expect(raw(part(q, 'ii').content)).toContain(String.raw`$\dfrac{\mathrm{d}^{2}y}{\mathrm{d}x^{2}}$`);
    expect(content(part(q, 'iii'))).toBe(canon('Find the coordinates of the stationary points of the curve and determine their nature.'));
    expect(everything(q)).not.toMatch(/BLANK|AGE/);
  });
});
