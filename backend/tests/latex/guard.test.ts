import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSerious, parseQuestionPaper } from '../../src/latex/index.js';

const PAPERS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'Updated Latex FIles For Web');

// The page-layout dialect, as it arrived in the 2016 papers.
const LAYOUT = String.raw`\begin{document}
\examq{5054/11/M/J/16}{2}{Physical Quantities and Measurements}{1}
\mcq{33.04}{\textbf{2 }}{Which set of quantities are all vectors?}
\choice{23.7}{\textbf{A }}{acceleration, displacement, velocity}
\choice{21.6}{\textbf{B }}{chemical energy, mass, power}
\choice{21.6}{\textbf{C }}{extension, force, gravitational potential energy}
\choice{21.7}{\textbf{D }}{weight, kinetic energy, work}
\end{document}`;

const DOCUMENTED = String.raw`\begin{document}
\examq{5054/21/M/J/25}{1}{Motion or Kinematics}{2}
A car of mass 900\,kg accelerates at $2.5\,\mathrm{m/s^2}$. \qfig[0.4\linewidth]{fig1.png}{Fig. 1.1}
\begin{parts}
\item State the resultant force. \marks{2}
\end{parts}
\end{document}`;

describe('the garbage guard', () => {
  it('flags a layout file whose maths is drawn from symbol images', () => {
    const tex = String.raw`\begin{document}
\examq{4037/12/M/J/16}{1}{Sets}{2}
\row{26.0}{94.97}{Use set notation to complete the two statements below.}
\freerow{26.01}{%
  \at{94.97}{0.00}{{\itshape Y} ............... {\itshape X}}%
  \at{265.39}{-0.46}{\swglyph{3}{265.39bp 637.96bp 321.88bp 195.69bp}}%
  \at{532.26}{0.00}{\swmark{[2]}}}
\row{26.0}{94.97}{More text.}
\row{26.0}{94.97}{More text.}
\row{26.0}{94.97}{More text.}
\end{document}`;
    const { warnings } = parseQuestionPaper(tex);
    const serious = warnings.filter(isSerious);
    expect(serious.map((w) => w.code)).toEqual(['unsupported-layout']);
    expect(serious[0].message).toContain('Q1');
  });

  it('flags text with leaked TeX lengths even without the known commands', () => {
    const tex = String.raw`\begin{document}
\examq{4037/11/M/J/16}{1}{Quadratic Functions}{3}
Find the value of k for which the curve\foo{4.91bp} y 3.14bp = 2x
\end{document}`;
    const serious = parseQuestionPaper(tex).warnings.filter(isSerious);
    expect(serious.map((w) => w.code)).toEqual(['garbled-text']);
    expect(serious[0].message).toContain('Q1');
  });

  it('lets the documented format through', () => {
    expect(parseQuestionPaper(DOCUMENTED).warnings.some(isSerious)).toBe(false);
  });

  it('does not mistake a length inside maths for leaked text', () => {
    const tex = String.raw`\begin{document}
\examq{4037/11/M/J/25}{1}{Algebra}{1}
Evaluate $\hspace{2bp} x + 1$.
\end{document}`;
    expect(parseQuestionPaper(tex).warnings.some(isSerious)).toBe(false);
  });

  it('passes every question paper already in the bank', () => {
    const folders = readdirSync(PAPERS).filter(
      (d) => d !== 'new_layout' && statSync(join(PAPERS, d)).isDirectory(),
    );
    expect(folders.length).toBeGreaterThanOrEqual(6);
    for (const folder of folders) {
      const qp = readdirSync(join(PAPERS, folder)).find((f) => /QP.*\.tex$/i.test(f));
      const { warnings } = parseQuestionPaper(readFileSync(join(PAPERS, folder, qp!), 'utf8'));
      expect(warnings.filter(isSerious), folder).toEqual([]);
    }
  });
});
