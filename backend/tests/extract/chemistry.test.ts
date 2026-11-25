/**
 * Chemical formulae and equations of Chemistry 5070. Expected values were
 * typed from the printed PDF page named beside each one.
 */

import { describe, expect, it } from 'vitest';
import { canon, content, correct, correctOrPassed, everything, options, paperOf, part, passesOf, question, stem } from './helpers.js';
import { CHEMISTRY, CHEMISTRY_MCQ, CHEMISTRY_MCQ_26 } from './preambles.js';

const ARROW = String.raw`$\rightarrow$`;
const BOTH_WAYS = String.raw`$\rightleftharpoons$`;

describe('chemistry: letters printed as pictures', () => {
  it('reads the l of Cl after a mass number and inside a formula', () => {
    // 5070/11/M/J/16 Q13, page 5
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{13}{Atomic Structure \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{1}
\mcq{38.0}{\textbf{13}}{Two isotopes of chlorine are $^{35}$C\swcut{3.09}{2.64}{5}{227.17bp 602.06bp 364.74bp 227.84bp} and $^{37}$C\swcut{3.09}{2.64}{5}{270.42bp 602.06bp 321.48bp 227.84bp}\,.}
\stem{25.5}{Using these isotopes, how many different relative molecular masses are possible for the\linebreak}
compound with molecular formula C$_{2}$H$_{3}$C\swcut{3.09}{2.64}{5}{269.97bp 563.85bp 321.94bp 266.05bp}\,$_{3}$?
\optrow{23.9}{2}{3}{4}{5}`);
    const q = question(paper, 13);
    correct(paper, 13, stem(q),
      `Two isotopes of chlorine are $^{35}$Cl and $^{37}$Cl. Using these isotopes, how many different relative molecular
       masses are possible for the compound with molecular formula C$_2$H$_3$Cl$_3$?`);
    expect(options(q)).toEqual(['A: 2', 'B: 3', 'C: 4', 'D: 5']);
  });

  it('reads the roman numerals of copper(II) and manganate(VII)', () => {
    // 5070/11/M/J/16 Q15, page 6
    const two = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{15}{Electrolysis}{1}
\mcq{1.2}{\textbf{15}}{Aqueous copper(\swcut{3.99}{2.88}{6}{154.60bp 765.44bp 436.41bp 63.37bp}\swcut{3.99}{2.88}{6}{158.59bp 765.44bp 432.42bp 63.37bp}) sulfate is electrolysed using carbon electrodes.}`);
    correct(two, 15, stem(question(two, 15)), 'Aqueous copper(II) sulfate is electrolysed using carbon electrodes.');
    // 5070/11/M/J/16 Q22, page 8
    const seven = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{22}{Redox}{1}
\mcq{0.3}{\textbf{22}}{Gaseous compound X is an oxidising agent. X is bubbled through separate solutions of aqueous\vadjust{\kern0.85bp}\linebreak}
potassium iodide and acidified potassium manganate(\swcut{8.65}{2.88}{8}{333.16bp 752.80bp 253.20bp 76.01bp}\swcut{3.99}{2.88}{8}{341.80bp 752.80bp 249.21bp 76.01bp}\swcut{3.99}{2.88}{8}{345.79bp 752.80bp 245.22bp 76.01bp}).`);
    correct(seven, 22, stem(question(seven, 22)),
      `Gaseous compound X is an oxidising agent. X is bubbled through separate solutions of aqueous potassium iodide and
       acidified potassium manganate(VII).`);
  });

  it('tells the I of KI from the l of Cl, in a whole row of equations', () => {
    // 5070/11/M/J/16 Q18, page 6
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{18}{Redox}{1}
\mcq{34.0}{\textbf{18}}{Which equation does \textbf{not }represent a redox reaction?}
\choice{24.4}{\textbf{A }}{2NH$_{3}$\kern6.11bp +\kern6.12bp H$_{2}$SO$_{4}$\kern6.12bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.12bp (NH$_{4}$)$_{2}$SO$_{4}$}
\choice{22.5}{\textbf{B }}{2SO$_{2}$\kern6.11bp +\kern6.12bp O$_{2}$\kern6.09bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.09bp 2SO$_{3}$}
\choice{22.4}{\textbf{C }}{2K\swcut{4.62}{2.64}{6}{105.56bp 195.72bp 484.82bp 634.18bp}\kern6.12bp +\kern6.12bp C\swcut{3.09}{2.64}{6}{136.80bp 195.72bp 455.11bp 634.18bp}\,$_{2}$\kern6.09bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.09bp 2KC\swcut{3.09}{2.64}{6}{189.75bp 195.72bp 402.16bp 634.18bp}\kern6.10bp +\kern6.12bp \swcut{4.62}{2.64}{6}{211.49bp 195.72bp 378.89bp 634.18bp}$_{2}$}
\choice{22.7}{\textbf{D }}{Zn\kern6.10bp +\kern6.10bp H$_{2}$SO$_{4}$\kern6.12bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.12bp ZnSO$_{4}$\kern6.11bp +\kern6.12bp H$_{2}$}`);
    const q = question(paper, 18);
    correct(paper, 18, stem(q), 'Which equation does not represent a redox reaction?');
    expect(options(q)).toEqual([
      `A: ${canon(`2NH$_3$ + H$_2$SO$_4$ ${ARROW} (NH$_4$)$_2$SO$_4$`)}`,
      `B: ${canon(`2SO$_2$ + O$_2$ ${ARROW} 2SO$_3$`)}`,
      `C: ${canon(`2KI + Cl$_2$ ${ARROW} 2KCl + I$_2$`)}`,
      `D: ${canon(`Zn + H$_2$SO$_4$ ${ARROW} ZnSO$_4$ + H$_2$`)}`,
    ]);
  });

  it('keeps the emphasis of "not"', () => {
    // 5070/11/M/J/16 Q18, page 6: "not" is printed bold
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/16}{18}{Redox}{1}
\mcq{34.0}{\textbf{18}}{Which equation does \textbf{not }represent a redox reaction?}
\choice{24.4}{\textbf{A }}{2NH$_{3}$\kern6.11bp +\kern6.12bp H$_{2}$SO$_{4}$\kern6.12bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.12bp (NH$_{4}$)$_{2}$SO$_{4}$}
\choice{22.5}{\textbf{B }}{2SO$_{2}$\kern6.11bp +\kern6.12bp O$_{2}$\kern6.09bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.09bp 2SO$_{3}$}
\choice{22.4}{\textbf{C }}{2K\swcut{4.62}{2.64}{6}{105.56bp 195.72bp 484.82bp 634.18bp}\kern6.12bp +\kern6.12bp C\swcut{3.09}{2.64}{6}{136.80bp 195.72bp 455.11bp 634.18bp}\,$_{2}$\kern6.09bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.09bp 2KC\swcut{3.09}{2.64}{6}{189.75bp 195.72bp 402.16bp 634.18bp}\kern6.10bp +\kern6.12bp \swcut{4.62}{2.64}{6}{211.49bp 195.72bp 378.89bp 634.18bp}$_{2}$}
\choice{22.7}{\textbf{D }}{Zn\kern6.10bp +\kern6.10bp H$_{2}$SO$_{4}$\kern6.12bp \makebox[10.86bp][c]{$\rightarrow$}\kern6.12bp ZnSO$_{4}$\kern6.11bp +\kern6.12bp H$_{2}$}`);
    expect(everything(question(paper, 18))).toMatch(/<(strong|b)>\s*not\s*<\/\1>/);
  });

  it('reads iodine(I) chloride, ICl, with its one state symbol', () => {
    // 5070/21/M/J/17 B8, page 14, and B8(e), page 15
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/17}{B8}{Reversible Reactions \textperiodcentered\ Covalent Bonding \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept \textperiodcentered\ Alkanes \textperiodcentered\ Alkenes}{10}
\row{0.4}{72.3}{\lab{22.7}{\textbf{B8}}Iodine reacts with chlorine to form iodine(\swf{ptm}{11.00}{I}) chloride, \swcut{4.63}{2.64}{14}{327.84bp 766.21bp 262.81bp 63.58bp}C\swcut{3.08}{2.64}{14}{340.41bp 766.21bp 251.79bp 63.58bp}.}
\row{0.3}{95.0}{\lab{22.7}{\textbf{(e)}}Iodine(\swf{ptm}{11.00}{I}) chloride reacts with chlorine to form iodine(\swf{ptm}{11.00}{III}) chloride.}
\row{32.0}{95.0}{\swcut{4.63}{2.64}{15}{94.95bp 636.37bp 495.69bp 193.42bp}C\swcut{3.08}{2.64}{15}{107.53bp 636.37bp 484.67bp 193.42bp}\,(g) is a dark brown gas.}
\row{26.0}{95.0}{\swcut{4.63}{2.64}{15}{94.95bp 610.37bp 495.69bp 219.42bp}C\swcut{3.08}{2.64}{15}{107.53bp 610.37bp 484.67bp 219.42bp}$_{3}$(g) is a yellow gas.}`);
    const q = question(paper, 8);
    correct(paper, 8, stem(q), 'Iodine reacts with chlorine to form iodine(I) chloride, ICl.');
    correct(paper, 8, content(part(q, 'e')),
      `Iodine(I) chloride reacts with chlorine to form iodine(III) chloride. ICl(g) is a dark brown gas.
       ICl$_3$(g) is a yellow gas.`);
  });

  it('reads a bold l and a bold I', () => {
    // 5070/21/M/J/22 Q1, page 3
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/22}{1}{Identification of Ions and Gases \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept \textperiodcentered\ Redox \textperiodcentered\ Preparation of Salts}{6}
\row{22.6}{72.3}{\lab{22.7}{\textbf{1 }}Choose from the following compounds to answer the questions.}
\row{25.5}{281.3}{\textbf{NH}$_{4}$\textbf{C\swcut{4.18}{2.64}{3}{309.76bp 664.61bp 281.34bp 165.18bp}}}
\row{25.5}{280.4}{\textbf{BaSO}$_{4}$}
\row{25.5}{290.7}{\textbf{K\swcut{6.00}{2.64}{3}{298.61bp 613.61bp 290.67bp 216.18bp}}}
\row{25.5}{281.1}{\textbf{K}$_{2}$\textbf{SO}$_{3}$}
\row{25.5}{273.2}{\textbf{Mg(NO}$_{3}$\textbf{)}$_{2}$}`);
    correct(paper, 1, stem(question(paper, 1)),
      'Choose from the following compounds to answer the questions. NH$_4$Cl BaSO$_4$ KI K$_2$SO$_3$ Mg(NO$_3$)$_2$');
  });

  it('reads a tick at the two sizes it is printed', () => {
    // 5070/41/M/J/17 Q4, page 7
    const a = paperOf(CHEMISTRY, String.raw`\examq{5070/41/M/J/17}{4}{Formulae, Stoichiometry and the Mole Concept \textperiodcentered\ Identification of Ions and Gases \textperiodcentered\ Redox}{17}
\row{26.0}{95.0}{T\kern-0.40bp ick (\swcut{8.30}{2.64}{7}{121.44bp 316.15bp 465.53bp 513.64bp}) the best titration results.}`);
    expect(everything(question(a, 4))).toMatch(/Tick \([✓✔]\) the best titration results\./);
    expect(passesOf(a, 4)).toEqual([]);
    // 5070/41/O/N/16 Q7, page 8 (same words, 12bp type)
    const b = paperOf(CHEMISTRY, String.raw`\examq{5070/41/O/N/16}{7}{Formulae, Stoichiometry and the Mole Concept}{16}
\row{26.0}{72.3}{T\kern-0.40bp ick (\swcut{9.06}{2.88}{8}{98.76bp 272.53bp 487.45bp 556.16bp}) the best titration results.}`);
    expect(everything(question(b, 7))).toMatch(/Tick \([✓✔]\) the best titration results\./);
    expect(passesOf(b, 7)).toEqual([]);
  });

  it('reads a picture of an ion, I with a charge, or flags it', () => {
    // 5070/21/M/J/24 Q7, page 11
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/24}{7}{Kinetic Particle Theory \textperiodcentered\ Atomic Structure}{9}
\row{25.9}{287.5}{${'$'}{}^{126}_{53}$\swcut{4.63}{2.64}{11}{299.16bp 389.61bp 291.49bp 440.18bp}\pow{\swcut{5.24}{1.98}{11}{303.63bp 394.12bp 286.40bp 438.69bp}}}`);
    const q = question(paper, 7);
    correctOrPassed(paper, 7, canon(everything(q)), '$^{126}_{53}$I$^-$');
  });

  it('reads the dot of water of crystallisation, or flags it', () => {
    // 5070/21/M/J/26 Q5(f), page 10
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/26}{5}{Preparation of Salts \textperiodcentered\ Identification of Ions and Gases \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{14}
\row{0.0}{95.0}{\lab{22.7}{\textbf{(f) }}The formula of aluminium sulfate crystals is A\textbf{l\kern0.46bp }$_{2}$(SO$_{4}$)$_{3}$\swcut{6.64}{2.64}{10}{356.21bp 766.63bp 232.42bp 63.16bp}16H$_{2}$O.}`);
    // The page prints a large ● (canon makes it •); a full stop is not what it prints.
    correctOrPassed(paper, 5, content(part(question(paper, 5), 'f')).replace(/[·•](?=16)/, '•'),
      'The formula of aluminium sulfate crystals is Al$_2$(SO$_4$)$_3$•16H$_2$O.');
  });

  it('does not take a drawn circle for a letter', () => {
    // 5070/12/M/J/20 Q7, page 6: "two particles, ○ and ●, present in"
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/12/M/J/20}{7}{Atomic Structure}{1}
\freerow{37.9}{%
  \at{49.62}{-0.04}{\textbf{7}}%
  \at{70.86}{-0.04}{The diagram shows the relative mass and the relative charge of two particles,}%
  \at{450.86}{0.00}{\swcut{7.96}{2.63}{6}{450.86bp 597.97bp 136.18bp 231.96bp}}%
  \at{461.94}{-0.04}{and}%
  \at{483.86}{0.00}{\swcut{6.93}{2.63}{6}{483.86bp 597.97bp 104.21bp 231.96bp}}%
  \at{491.34}{-0.04}{, present in}}`);
    const q = question(paper, 7);
    const read = canon(everything(q)).replace(/[○●•◦⚪⚫]/g, '');
    const drawn = q.stem.some((b) => b.type === 'figure');
    expect(passesOf(paper, 7).length > 0 || drawn || /[○◦⚪][^○●]*[●•⚫]/.test(everything(q)), 'shown or flagged').toBe(true);
    expect(read).not.toMatch(/particles,\s*[A-Za-z✓](?![a-z])|and [lIV✓],/);
  });
});

describe('chemistry: equations set in pieces', () => {
  // Each index is placed on its own, in one run with wide gaps between, so the
  // digits belong to whatever is printed above each gap.
  it('C8H18 to C4H10: the second index goes after the H', () => {
    // 5070/12/M/J/16 Q39, page 14
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/12/M/J/16}{39}{Alkenes}{1}
\mcq{37.9}{\textbf{39}}{How can the following reaction be described?}
\freerow{26.1}{%
  \at{234.37}{0.02}{C\kern3.88bp H}%
  \at{268.04}{0.03}{\makebox[10.86bp][c]{\swsy{AE}}}%
  \at{284.99}{0.03}{C\kern3.89bp H}%
  \at{318.66}{0.03}{+\kern6.11bp 2C\kern3.88bp H}%
  \at{242.31}{-1.48}{{\fontsize{7.00bp}{7.00bp}\selectfont 8\kern7.93bp 18}}%
  \at{292.93}{-1.48}{{\fontsize{7.00bp}{7.00bp}\selectfont 4\kern7.93bp 10}}%
  \at{345.26}{-1.48}{{\fontsize{7.00bp}{7.00bp}\selectfont 2\kern7.93bp 4}}}
\choice{25.3}{\textbf{A }}{combustion}
\choice{21.7}{\textbf{B }}{cracking}
\choice{21.6}{\textbf{C }}{oxidation}
\choice{21.7}{\textbf{D }}{reduction}`);
    const q = question(paper, 39);
    correct(paper, 39, stem(q),
      `How can the following reaction be described? C$_8$H$_{18}$ ${ARROW} C$_4$H$_{10}$ + 2C$_2$H$_4$`);
    expect(options(q)).toEqual(['A: combustion', 'B: cracking', 'C: oxidation', 'D: reduction']);
  });

  it('X2O3 + 3CO: the index of an element called X', () => {
    // 5070/12/M/J/16 Q29, page 10
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/12/M/J/16}{29}{Iron \textperiodcentered\ Extraction of Metals}{1}
\mcq{37.9}{\textbf{29}}{The final reaction in the extraction of metal X is represented by the following equation.}
\freerow{26.1}{%
  \at{224.36}{0.03}{X}%
  \at{235.59}{0.04}{O\kern10.00bp +\kern6.11bp 3CO}%
  \at{295.43}{0.04}{\makebox[10.86bp][c]{\swsy{AE}}}%
  \at{312.40}{0.04}{2}%
  \at{318.50}{0.04}{X}%
  \at{331.94}{0.04}{+\kern6.10bp 3CO}%
  \at{231.70}{-1.47}{{\fontsize{7.00bp}{7.00bp}\selectfont 2\kern8.56bp 3}}%
  \at{367.12}{-1.47}{{\fontsize{7.00bp}{7.00bp}\selectfont 2}}}
\stem{25.3}{What is X?}
\choice{23.7}{\textbf{A }}{aluminium}
\choice{21.6}{\textbf{B }}{copper}
\choice{21.7}{\textbf{C }}{iron}
\choice{21.6}{\textbf{D }}{sodium}`);
    const q = question(paper, 29);
    correct(paper, 29, stem(q),
      `The final reaction in the extraction of metal X is represented by the following equation.
       X$_2$O$_3$ + 3CO ${ARROW} 2X + 3CO$_2$ What is X?`);
    expect(options(q)).toEqual(['A: aluminium', 'B: copper', 'C: iron', 'D: sodium']);
  });

  it('zinc and sulfuric acid', () => {
    // 5070/12/M/J/17 Q18, page 8
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/12/M/J/17}{18}{Redox}{1}
\mcq{0.0}{\textbf{18}}{Zinc reacts with dilute sulfuric acid.}
\freerow{26.2}{%
  \at{223.02}{0.00}{Zn\kern6.14bp +\kern6.14bp H\kern3.89bp SO}%
  \at{292.26}{0.00}{\makebox[10.82bp][c]{\swsy{AE}}}%
  \at{309.24}{0.00}{ZnSO\kern10.00bp +\kern6.14bp H}%
  \at{262.44}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{282.24}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 4}}%
  \at{337.92}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 4}}%
  \at{368.40}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}}
\stem{25.3}{From this equation, what can be deduced about the reaction?}
\choice{23.6}{\textbf{A }}{It is a redox reaction.}
\choice{21.7}{\textbf{B }}{It is exothermic.}
\choice{21.6}{\textbf{C }}{Zinc is acting as a base.}
\choice{21.7}{\textbf{D }}{Zinc is acting as a catalyst.}`);
    correct(paper, 18, stem(question(paper, 18)),
      `Zinc reacts with dilute sulfuric acid. Zn + H$_2$SO$_4$ ${ARROW} ZnSO$_4$ + H$_2$
       From this equation, what can be deduced about the reaction?`);
  });

  it('photosynthesis: three indices in one run', () => {
    // 5070/12/M/J/18 Q18, page 8
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/12/M/J/18}{18}{Energy from Chemicals}{1}
\mcq{0.0}{\textbf{18}}{The equation for photosynthesis is shown.}
\freerow{26.2}{%
  \at{211.68}{0.00}{6CO\kern10.01bp +\kern6.14bp 6H\kern3.95bp O}%
  \at{289.44}{0.00}{\makebox[10.82bp][c]{\swsy{AE}}}%
  \at{306.42}{0.00}{6O\kern10.01bp +\kern6.14bp C\kern3.89bp H\kern7.80bp O}%
  \at{234.24}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{270.90}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{321.06}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{351.54}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 6\kern7.92bp 12\kern8.52bp 6}}}
\stem{25.3}{Which statement about photosynthesis is correct?}
\choice{23.6}{\textbf{A }}{It has a negative enthalpy change.}
\choice{21.7}{\textbf{B }}{It is catalysed by the presence of yeast.}
\choice{21.6}{\textbf{C }}{The products of photosynthesis are oxygen and starch.}
\choice{21.7}{\textbf{D }}{It occurs in green leaves.}`);
    correct(paper, 18, stem(question(paper, 18)),
      `The equation for photosynthesis is shown. 6CO$_2$ + 6H$_2$O ${ARROW} 6O$_2$ + C$_6$H$_{12}$O$_6$
       Which statement about photosynthesis is correct?`);
  });

  it('hydrated copper(II) sulfate, with state symbols and a bracketed note', () => {
    // 5070/11/O/N/17 Q12, page 5
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/O/N/17}{12}{Formulae, Stoichiometry and the Mole Concept}{1}
\mcq{38.8}{\textbf{12}}{25.0\,g of hydrated copper(\swf{ptm}{12.00}{II})\kern3.08bp sulfate crystals are heated to produce anhydrous copper(\swf{ptm}{12.00}{II})\kern3.07bp sulfate\vadjust{\kern0.35bp}\linebreak}
and water vapour.
\freerow{26.1}{%
  \at{195.42}{0.00}{CuSO\kern3.89bp .5H\kern3.95bp O(s)}%
  \at{277.74}{0.00}{\makebox[10.82bp][c]{\swsy{AE}}}%
  \at{294.72}{0.00}{CuSO\kern3.88bp (s)\kern6.14bp +\kern6.14bp 5H\kern3.90bp O(g)}%
  \at{225.30}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 4}}%
  \at{246.30}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{324.60}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 4}}%
  \at{374.04}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}}
\stem{26.2}{What is the mass of anhydrous copper(\swf{ptm}{12.00}{II}) sulfate formed?\vadjust{\kern0.35bp}\newline}
[$M_{\mathrm{r}}$: CuSO$_{4}$, 160;\kern6.14bp H$_{2}$O, 18]
\optrow{23.6}{9.0\,g}{16.0\,g}{22.5\,g}{25.0\,g}`);
    const q = question(paper, 12);
    correct(paper, 12, stem(q),
      `25.0 g of hydrated copper(II) sulfate crystals are heated to produce anhydrous copper(II) sulfate and water vapour.
       CuSO$_4$.5H$_2$O(s) ${ARROW} CuSO$_4$(s) + 5H$_2$O(g) What is the mass of anhydrous copper(II) sulfate formed?
       [M$_r$: CuSO$_4$, 160; H$_2$O, 18]`);
    expect(options(q)).toEqual(['9.0 g', '16.0 g', '22.5 g', '25.0 g'].map((t, i) => `${'ABCD'[i]}: ${canon(t)}`));
  });

  it('an equation with an enthalpy change', () => {
    // 5070/11/O/N/19 Q17, page 8
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/O/N/19}{17}{Redox \textperiodcentered\ Energy from Chemicals}{1}
\mcq{0.0}{\textbf{17}}{The equation for an industrial process is shown.}
\freerow{26.2}{%
  \at{134.70}{0.00}{C(s)\kern6.13bp +\kern6.13bp H\kern3.89bp O(g)}%
  \at{214.08}{0.00}{\makebox[10.82bp][c]{\swsy{AE}}}%
  \at{231.06}{0.00}{CO(g)\kern6.14bp +\kern6.14bp H\kern3.89bp (g)}%
  \at{337.62}{0.00}{\makebox[6.71bp][c]{\swsy{44}}}%
  \at{344.34}{0.00}{{\itshape H}}%
  \at{355.32}{0.00}{= +131\,kJ\,/\,mol}%
  \at{182.04}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}%
  \at{287.58}{-1.50}{{\fontsize{7.02bp}{7.02bp}\selectfont 2}}}`);
    correct(paper, 17, stem(question(paper, 17)),
      `The equation for an industrial process is shown. C(s) + H$_2$O(g) ${ARROW} CO(g) + H$_2$(g) ΔH = +131 kJ / mol`);
  });

  it('an equation half typed as maths is joined in order', () => {
    // 5070/11/M/J/21 Q19, page 8
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/21}{19}{Rate of Reaction \textperiodcentered\ Formulae, Stoichiometry and the Mole Concept}{1}
\mcq{0.0}{\textbf{19}}{Magnesium reacts with dilute sulfuric acid.}
\freerow{26.2}{%
  \at{187.92}{0.00}{Mg(s)}%
  \at{222.08}{0.00}{$+ \; \mathrm{H}_{2}\mathrm{SO}_{4}(\mathrm{aq}) \; \rightarrow \quad \mathrm{MgSO}_{4}(\mathrm{aq}) \; + \; \mathrm{H}_{2}(\mathrm{g})$}}`);
    correct(paper, 19, stem(question(paper, 19)),
      `Magnesium reacts with dilute sulfuric acid. Mg(s) + H$_2$SO$_4$(aq) ${ARROW} MgSO$_4$(aq) + H$_2$(g)`);
  });

  it('an equilibrium: never a one-way arrow', () => {
    // 5070/11/M/J/26 Q16, page 7
    const paper = paperOf(CHEMISTRY_MCQ_26, String.raw`\examq{5070/11/M/J/26}{16}{Reversible Reactions}{1}
\freerow{32.8}{%
  \at{49.59}{0.03}{\textbf{16}}%
  \at{72.25}{0.03}{When bismuth}%
  \at{142.49}{0.03}{\swf{ptm}{11.00}{(III)}}%
  \at{163.84}{0.03}{chloride, BiC}%
  \at{226.13}{0.03}{\swf{pbk}{11.00}{l}}%
  \at{235.01}{0.03}{, is added to water\kern-0.62bp , a reaction occurs and a white}%
  \at{230.85}{-2.97}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{72.25}{-13.45}{precipitate of BiOC}%
  \at{164.45}{-13.45}{\swf{pbk}{11.00}{l}}%
  \at{170.56}{-13.45}{is formed.}%
  \at{161.61}{-41.33}{BiC}%
  \at{179.32}{-41.33}{\swf{pbk}{11.00}{l}}%
  \at{188.20}{-41.33}{(aq)\kern4.39bp +\kern4.39bp H\kern4.18bp O(l)}%
  \at{257.77}{-41.33}{\swcut{10.85}{2.64}{7}{257.77bp 327.93bp 326.38bp 501.97bp}}%
  \at{273.02}{-41.33}{BiOC}%
  \at{299.26}{-41.33}{\swf{pbk}{11.00}{l}}%
  \at{303.98}{-41.33}{(s)\kern4.40bp +\kern4.39bp 2HC}%
  \at{354.00}{-41.33}{\swf{pbk}{11.00}{l}}%
  \at{358.71}{-41.33}{(aq)}%
  \at{184.03}{-44.33}{{\fontsize{7.50bp}{7.50bp}\selectfont 3}}%
  \at{230.89}{-44.33}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{72.25}{-68.41}{Which changes increase the mass of white precipitate formed?}%
  \at{116.17}{-95.77}{1}%
  \at{142.11}{-95.77}{adding more water}%
  \at{116.17}{-116.05}{2}%
  \at{142.11}{-116.05}{adding aqueous sodium hydroxide}%
  \at{116.17}{-136.33}{3}%
  \at{142.11}{-136.33}{adding dilute hydrochloric acid}%
  \at{72.25}{-162.27}{\textbf{A}}%
  \at{93.50}{-162.27}{1 and 2}%
  \at{172.84}{-162.27}{\textbf{B}}%
  \at{194.09}{-162.27}{1 and 3}%
  \at{273.42}{-162.27}{\textbf{C}}%
  \at{294.68}{-162.27}{1 only}%
  \at{374.01}{-162.27}{\textbf{D}}%
  \at{395.26}{-162.27}{2 and 3}%
  \swdepth{164.59}}`);
    const q = question(paper, 16);
    expect(canon(everything(q))).not.toContain('→');
    correctOrPassed(paper, 16, stem(q),
      `When bismuth(III) chloride, BiCl$_3$, is added to water, a reaction occurs and a white precipitate of BiOCl is
       formed. BiCl$_3$(aq) + H$_2$O(l) ${BOTH_WAYS} BiOCl(s) + 2HCl(aq)
       Which changes increase the mass of white precipitate formed?
       1 adding more water 2 adding aqueous sodium hydroxide 3 adding dilute hydrochloric acid`);
    expect(options(q)).toEqual(['1 and 2', '1 and 3', '1 only', '2 and 3'].map((t, i) => `${'ABCD'[i]}: ${canon(t)}`));
  });
});

describe('chemistry: ions and isotopes', () => {
  it('nuclides with a mass number over a proton number, and charges', () => {
    // 5070/11/M/J/17 Q4, page 2
    const paper = paperOf(CHEMISTRY_MCQ, String.raw`\examq{5070/11/M/J/17}{4}{Atomic Structure}{1}
\mcq{40.8}{\textbf{4 }}{Which\kern3.08bp statement\kern3.08bp about\kern3.08bp the\kern3.08bp particles\kern4.31bp\nuc{\raisebox{-0.40bp}{19}}{\raisebox{0.26bp}{9}}\kern0.62bpF\kern0.96bp \pow{\makebox[3.83bp][c]{\textminus}\kern1.81bp },\kern4.87bp\nuc{\raisebox{-0.40bp}{20}}{\raisebox{0.26bp}{10}}\kern0.62bpNe\kern4.79bp and\kern4.88bp\nuc{\raisebox{-0.40bp}{23}}{\raisebox{0.26bp}{11}}\kern0.62bpNa\kern1.13bp \scriptat{3.98}{7.00}{+}\kern5.82bp is\kern3.08bp correct?}
\choice{27.8}{\textbf{A }}{They all contain more electrons than protons.}
\choice{21.7}{\textbf{B }}{They all contain more neutrons than protons.}
\choice{21.6}{\textbf{C }}{They all contain the same number of electrons.}
\choice{21.6}{\textbf{D }}{They all contain the same number of protons.}`);
    const q = question(paper, 4);
    correct(paper, 4, stem(q),
      'Which statement about the particles $^{19}_{9}$F$^-$, $^{20}_{10}$Ne and $^{23}_{11}$Na$^+$ is correct?');
    expect(options(q)[0]).toBe('A: They all contain more electrons than protons.');
  });

  it('a minus drawn as an underscore is the charge of nitrate', () => {
    // 5070/42/M/J/16 Q2(a), page 4
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/42/M/J/16}{2}{Identification of Ions and Gases \textperiodcentered\ Energy from Chemicals \textperiodcentered\ Preparation of Salts}{10}
\row{0.6}{94.9}{\lab{45.3}{\textbf{2 }}\lab{22.6}{\textbf{(a)}}Give a test and obser\kern0.33bp vation to identify the presence of the nitrate ion, NO$_{3}$\scriptat{6.80}{8.25}{\_}(aq).}`);
    correct(paper, 2, content(part(question(paper, 2), 'a')),
      'Give a test and observation to identify the presence of the nitrate ion, NO$_3$$^-$(aq).');
  });

  it('typed ions in options inside one block', () => {
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
    expect(options(question(paper, 40))).toEqual(
      [
        ['A', 'Fe$^{3+}$ and NH$_4^+$'],
        ['B', 'Fe$^{3+}$ and NO$_3^-$'],
        ['C', 'Fe$^{2+}$ and NH$_4^+$'],
        ['D', 'Fe$^{2+}$ and NO$_3^-$'],
      ].map(([label, ion]) => `${label}: ${canon(ion)}`),
    );
  });
});

describe('chemistry: round 3, from the page', () => {
  it('an index right after a pictured l sits on it: PCl₃, PCl₅', () => {
    // 5070/21/M/J/19 Q8(d),(e), page 13. The LaTeX puts \, between the picture and $_{3}$; the page prints PCl₃.
    const paper = paperOf(CHEMISTRY, String.raw`\examq{5070/21/M/J/19}{8}{Equilibria}{3}
\row{0.3}{95.0}{\lab{22.7}{\textbf{(d)}}Draw the ${'`'}dot-and-cross' diagram for a molecule of PC\swcut{3.08}{2.64}{13}{359.27bp 766.37bp 232.93bp 63.42bp}\,$_{3}$.}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(e)}}PC\swcut{3.08}{2.64}{13}{110.24bp 467.36bp 481.96bp 362.43bp}\,$_{5}$ reacts with water to form hydrogen chloride and phosphoric acid, H$_{3}$PO$_{4}$.}`);
    const q = question(paper, 8);
    correct(paper, 8, content(part(q, 'd')), "Draw the 'dot-and-cross' diagram for a molecule of PCl$_3$.");
    correct(paper, 8, content(part(q, 'e')),
      'PCl$_5$ reacts with water to form hydrogen chloride and phosphoric acid, H$_3$PO$_4$.');
    // canon ignores a space before a script; the page shows none, so it is checked on the output.
    const shown = (p: string) => part(q, p).content.map((b) => (b.type === 'figure' ? '' : b.html)).join(' ').replace(/<[^>]+>/g, '');
    expect(shown('d')).not.toMatch(/l\s+(\$_|_)/);
    expect(shown('e')).not.toMatch(/l\s+(\$_|_)/);
  });

  it('a whole question in one placed block: stem, equilibrium, numbered statements, options', () => {
    // 5070/12/M/J/26 Q15, page 6
    const paper = paperOf(CHEMISTRY_MCQ_26, String.raw`\examq{5070/12/M/J/26}{15}{Reversible Reactions}{1}
\freerow{41.9}{%
  \at{49.58}{0.02}{\textbf{15}}%
  \at{72.25}{0.02}{Elements X and Y react together in a reversible reaction to form XY\kern4.23bp .}%
  \at{399.55}{-2.97}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{232.73}{-27.62}{X\kern4.39bp +\kern4.39bp 2Y}%
  \at{273.09}{-27.62}{\swcut{10.85}{2.64}{6}{273.09bp 358.24bp 311.06bp 471.66bp}}%
  \at{288.34}{-27.62}{XY}%
  \at{302.98}{-30.62}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{72.25}{-54.47}{1.0\,mol\kern2.48bp of\kern2.48bp X\kern2.47bp is\kern2.48bp mixed\kern2.48bp with\kern2.47bp 1.0\,mol\kern2.48bp of\kern2.48bp Y\kern2.47bp and\kern2.48bp the\kern2.47bp mixture\kern2.47bp is\kern2.48bp left\kern2.46bp to\kern2.47bp react\kern2.47bp until\kern2.47bp an\kern2.48bp equilibrium}%
  \at{72.25}{-67.66}{position is reached.}%
  \at{72.25}{-94.51}{Which statements about this reaction are correct?}%
  \at{116.17}{-121.87}{1}%
  \at{142.11}{-121.87}{After the equilibrium position has been reached, the reaction stops.}%
  \at{116.17}{-142.15}{2}%
  \at{142.11}{-142.15}{At equilibrium, there is more than 0.5\,mol of X present.}%
  \at{116.17}{-162.43}{3}%
  \at{142.11}{-162.43}{At equilibrium, there is less than 1.0\,mol of XY\kern7.25bp present.}%
  \at{365.41}{-165.42}{{\fontsize{7.50bp}{7.50bp}\selectfont 2}}%
  \at{72.25}{-188.37}{\textbf{A}}%
  \at{93.50}{-188.37}{1, 2 and 3}%
  \at{172.84}{-188.37}{\textbf{B}}%
  \at{194.09}{-188.37}{2\kern2.20bp and\kern2.20bp 3\kern2.20bp only}%
  \at{273.42}{-188.37}{\textbf{C}}%
  \at{294.67}{-188.37}{2 only}%
  \at{374.01}{-188.37}{\textbf{D}}%
  \at{395.26}{-188.37}{3 only}%
  \swdepth{190.69}}`);
    const q = question(paper, 15);
    correct(paper, 15, stem(q), `Elements X and Y react together in a reversible reaction to form XY$_2$.
      X + 2Y ⇌ XY$_2$
      1.0 mol of X is mixed with 1.0 mol of Y and the mixture is left to react until an equilibrium position is reached.
      Which statements about this reaction are correct?
      1 After the equilibrium position has been reached, the reaction stops.
      2 At equilibrium, there is more than 0.5 mol of X present.
      3 At equilibrium, there is less than 1.0 mol of XY$_2$ present.`);
    expect(options(q)).toEqual(['1, 2 and 3', '2 and 3 only', '2 only', '3 only'].map((t, i) => `${'ABCD'[i]}: ${canon(t)}`));
  });
});
