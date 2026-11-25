/**
 * Physics 5054: drawn fractions, symbols, units. Expected values were typed
 * from the printed PDF page named beside each one.
 */

import { describe, expect, it } from 'vitest';
import { canon, content, correct, everything, options, paperOf, part, passesOf, question, sentences, stem } from './helpers.js';
import { PHYSICS, PHYSICS_MCQ } from './preambles.js';

const raw = (blocks: { type: string; html?: string }[]) => blocks.map((b) => (b.type === 'figure' ? '' : b.html)).join('\n');
const lettered = (...texts: string[]) => texts.map((t, i) => `${'ABCD'[i]}: ${canon(t)}`);

describe('physics: options that are fractions drawn piece by piece', () => {
  it('equal ratios with indices: p1 over V1', () => {
    // 5054/12/M/J/17 Q20, page 9
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/12/M/J/17}{20}{Kinetic Model of Matter \textperiodcentered\ Pressure}{1}
\mcq{0.3}{\textbf{20}}{A fixed mass of gas is enclosed in a cylinder with a movable piston.}
\qfig{9}{175.62bp 692.03bp 175.34bp 85.21bp}{}{12.41}{0}{175.62}
\stem{21.73}{The gas is initially at pressure $p_{1}$ and has a volume $V_{1}$.}
\stem{25.3}{The temperature is kept constant. The piston is moved so that the pressure becomes $p_{2}$ and the\linebreak}
volume becomes $V_{2}$.
\stem{25.3}{Which equation is correct?}
\freerow{24.7}{%
  \at{95.41}{-0.02}{{\itshape p}}%
  \at{123.93}{-0.02}{{\itshape p}}%
  \at{101.99}{-1.12}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{131.05}{-1.12}{{\fontsize{6.99bp}{6.99bp}\selectfont 2}}%
  \at{70.90}{-7.53}{\textbf{A}}%
  \at{111.14}{-7.53}{=}%
  \at{93.57}{-16.91}{{\itshape V}}%
  \at{122.09}{-16.91}{{\itshape V}}%
  \at{102.16}{-18.05}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{131.22}{-18.05}{{\fontsize{6.99bp}{6.99bp}\selectfont 2}}%
  \at{95.95}{-40.98}{{\itshape p}}%
  \at{123.82}{-41.04}{{\itshape V}}%
  \at{102.53}{-42.08}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{132.41}{-42.14}{{\fontsize{6.99bp}{6.99bp}\selectfont 1}}%
  \at{70.89}{-48.52}{\textbf{B}}%
  \at{112.16}{-48.52}{=}%
  \at{95.24}{-57.87}{{\itshape p}}%
  \at{123.14}{-57.93}{{\itshape V}}%
  \at{102.39}{-59.01}{{\fontsize{6.99bp}{6.99bp}\selectfont 2}}%
  \at{132.26}{-59.06}{{\fontsize{6.99bp}{6.99bp}\selectfont 2}}%
  \ruleat{94.11}{105.79}{-4.58}{0.50}%
  \ruleat{122.63}{135.72}{-4.58}{0.50}%
  \ruleat{94.11}{106.89}{-45.51}{0.50}%
  \ruleat{123.68}{136.77}{-45.60}{0.50}%
  \swdepth{60.46}}
\choice{81.9}{\textbf{C }}{$p$\,$_{1}V_{1}=p$\,$_{2}V_{2}$\,}
\choice{21.6}{\textbf{D }}{$p$\,$_{1}V_{2}=p$\,$_{2}V_{1}$\,}`);
    const q = question(paper, 20);
    expect(options(q)).toEqual(
      lettered(
        String.raw`$\frac{p_1}{V_1}=\frac{p_2}{V_2}$`,
        String.raw`$\frac{p_1}{p_2}=\frac{V_1}{V_2}$`,
        '$p_1V_1=p_2V_2$',
        '$p_1V_2=p_2V_1$',
      ),
    );
    expect(passesOf(paper, 20)).toEqual([]);
    expect(sentences(q.stem).at(-1)).toBe('Which equation is correct?');
  });

  it('words over words, options split between two kinds of line', () => {
    // 5054/11/M/J/18 Q12, page 5
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/18}{12}{Work Energy and Power}{1}
\mcq{36.38}{\textbf{12}}{A student calculates his power in running up a flight of stairs. He measures the vertical height of\linebreak}
the stairs, the time taken to run up the stairs and his weight.
\stem{25.3}{How does he calculate his power?}
\choice{24.5}{\textbf{A }}{height × time × weight}
\freerow{22.4}{%
  \at{94.44}{0.00}{height}%
  \at{126.72}{0.00}{×}%
  \at{135.11}{0.00}{weight}%
  \at{70.86}{-7.02}{\textbf{B}}%
  \at{120.72}{-15.60}{time}%
  \at{94.92}{-37.86}{time}%
  \at{117.78}{-37.86}{×}%
  \at{126.17}{-37.86}{weight}%
  \at{70.86}{-44.94}{\textbf{C}}%
  \at{111.24}{-53.52}{height}%
  \at{109.38}{-78.90}{weight}%
  \at{70.86}{-85.92}{\textbf{D}}%
  \at{94.44}{-94.56}{height}%
  \at{126.72}{-94.56}{×}%
  \at{135.00}{-94.56}{time}%
  \ruleat{94.08}{168.06}{-4.26}{0.50}%
  \ruleat{94.08}{159.12}{-42.12}{0.50}%
  \ruleat{94.08}{156.54}{-83.16}{0.50}%
  \swdepth{96.97}}`);
    expect(options(question(paper, 12))).toEqual(
      lettered(
        'height × time × weight',
        String.raw`$\frac{\text{height}\times\text{weight}}{\text{time}}$`,
        String.raw`$\frac{\text{time}\times\text{weight}}{\text{height}}$`,
        String.raw`$\frac{\text{weight}}{\text{height}\times\text{time}}$`,
      ),
    );
    expect(passesOf(paper, 12)).toEqual([]);
  });

  it('a minus sign printed apart from the words it stands between', () => {
    // 5054/12/M/J/20 Q10, page 4
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/12/M/J/20}{10}{Mass Weight and Density}{1}
\mcq{30.56}{\textbf{10}}{The diagram shows the equipment used to determine the density of a liquid.}
\qfig{4}{254.46bp 427.26bp 253.82bp 306.78bp}{}{12.68}{0}{254.46}
\stem{20.36}{Which equation is used to calculate the density of the liquid?}
\freerow{17.8}{%
  \at{220.32}{-0.04}{\_}%
  \at{94.44}{-4.54}{mass\kern2.39bp of beaker and\,liquid\kern11.04bp mass\kern2.39bp of beaker}%
  \at{70.86}{-11.50}{\textbf{A}}%
  \at{161.82}{-20.14}{volume\kern2.70bp of liquid}%
  \at{220.32}{-37.00}{\_}%
  \at{94.44}{-41.50}{mass\kern2.34bp of beaker and\,liquid\kern10.99bp mass\kern2.34bp of liquid}%
  \at{70.86}{-48.52}{\textbf{B}}%
  \at{157.20}{-57.16}{volume\kern2.57bp of liquid}%
  \at{161.82}{-78.58}{volume\kern2.63bp of liquid}%
  \at{70.86}{-85.54}{\textbf{C}}%
  \at{220.32}{-89.68}{\_}%
  \at{94.44}{-94.18}{mass\kern2.34bp of beaker and\,liquid\kern10.99bp mass\kern2.34bp of beaker}%
  \at{157.20}{-115.66}{volume\kern2.57bp of liquid}%
  \at{70.86}{-122.56}{\textbf{D}}%
  \at{220.32}{-126.70}{\_}%
  \at{94.44}{-131.20}{mass\kern2.34bp of beaker and\,liquid\kern10.99bp mass\kern2.34bp of liquid}%
  \ruleat{94.08}{304.92}{-8.74}{0.50}%
  \ruleat{94.08}{295.62}{-45.70}{0.50}%
  \ruleat{94.08}{304.92}{-82.78}{0.50}%
  \ruleat{94.08}{295.62}{-119.80}{0.50}%
  \swdepth{133.53}}`);
    const [beaker, liquid] = ['beaker', 'liquid'].map((x) => String.raw`\text{mass of beaker and liquid}-\text{mass of ${x}}`);
    const volume = String.raw`\text{volume of liquid}`;
    expect(options(question(paper, 10))).toEqual(
      lettered(
        String.raw`$\frac{${beaker}}{${volume}}$`,
        String.raw`$\frac{${liquid}}{${volume}}$`,
        String.raw`$\frac{${volume}}{${beaker}}$`,
        String.raw`$\frac{${volume}}{${liquid}}$`,
      ),
    );
    expect(passesOf(paper, 10)).toEqual([]);
  });

  it('sin i = a fraction with degrees', () => {
    // 5054/11/M/J/23 Q21, page 10
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/23}{21}{Light (Reflection/Refraction/Lenses)}{1}
\mcq{0.0}{\textbf{21}}{A ray of light is incident on a plastic block in air, at an angle of incidence $i$. The refractive index of\linebreak}
the plastic is $n$.
\stem{25.3}{The light ray refracts along the plastic-air boundary when it reaches X.}
\qfig{10}{150.42bp 526.98bp 150.50bp 123.18bp}{}{12.68}{0}{150.42}
\stem{21.48}{Which equation is correct?}
\freerow{26.0}{%
  \at{126.72}{0.04}{sin\kern2.35bp 41}%
  \at{153.78}{0.04}{\swsy{B0}}%
  \at{70.86}{-5.42}{\textbf{A}}%
  \at{92.10}{-5.42}{sin}%
  \at{109.26}{-5.42}{{\itshape i}}%
  \at{114.77}{-5.42}{=}%
  \at{139.14}{-13.64}{{\itshape n}}%
  \at{139.92}{-32.96}{{\itshape n}}%
  \at{70.86}{-38.42}{\textbf{B}}%
  \at{92.10}{-38.42}{sin}%
  \at{109.26}{-38.42}{{\itshape i}}%
  \at{114.77}{-38.42}{=}%
  \at{126.72}{-46.64}{sin\kern2.29bp 49}%
  \at{155.28}{-46.64}{\swsy{B0}}%
  \ruleat{126.18}{158.40}{-2.66}{0.50}%
  \ruleat{126.18}{159.90}{-35.66}{0.50}%
  \swdepth{49.05}}
\choice{64.5}{\textbf{C }}{sin $i=n$ $\times$ sin\,$41^{\circ}$}
\choice{22.4}{\textbf{D }}{sin $i=n$ $\times$ sin\,$49^{\circ}$}`);
    expect(options(question(paper, 21))).toEqual(
      lettered(
        String.raw`$\sin i=\frac{\sin41°}{n}$`,
        String.raw`$\sin i=\frac{n}{\sin49°}$`,
        String.raw`$\sin i=n\times\sin41°$`,
        String.raw`$\sin i=n\times\sin49°$`,
      ),
    );
    expect(passesOf(paper, 21)).toEqual([]);
  });
});

describe('physics: fractions stacked inside a line', () => {
  it('R = V / I', () => {
    // 5054/41/M/J/17 Q4(d), page 8
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/41/M/J/17}{4}{Electrical Quantities}{6}
\row{25.4}{95.0}{\lab{22.7}{\textbf{(d)}}Use your readings to find the value of the resistance $R$ using the equation}
\row{25.4}{280.8}{$R$ = \rlap{\kern0.00bp\raisebox{5.80bp}[0pt][0pt]{$V$}}\rlap{\kern1.35bp\raisebox{-7.20bp}[0pt][0pt]{\makebox[4.63bp][c]{\swf{ptm}{12.08}{I}}}}\rlap{\kern0.00bp\raisebox{3.08bp}[0pt][0pt]{\rule{7.34bp}{0.50bp}}}\kern7.34bp \kern2.09bp .}
\dotline{53.7}{329.8}{$R$ =}{[1]}{545.7}`);
    const d = part(question(paper, 4), 'd');
    correct(paper, 4, content(d),
      String.raw`Use your readings to find the value of the resistance R using the equation $R=\frac VI$.`);
    expect(d.marks).toBe(1);
  });

  it('p = W / A, with a kern in every second letter of the sentence', () => {
    // 5054/42/M/J/18 Q3(c), page 7
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/42/M/J/18}{3}{Pressure}{5}
\row{26.0}{95.0}{\lab{22.7}{\textbf{(\kern-0.41bp\relax c\kern0.20bp\relax )\kern-0.41bp\relax }}Use\kern-0.21bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ e\kern-0.21bp\relax q\kern0.41bp\relax ua\kern-0.21bp\relax t\kern0.41bp\relax io\kern0.20bp\relax n}
\row{39.0}{282.3}{{\itshape p\kern0.41bp\relax \ }=\kern0.18bp\relax \ \rlap{\kern0.00bp\raisebox{3.60bp}[0pt][0pt]{{\itshape W\kern-0.20bp\relax }}}\rlap{\kern1.43bp\raisebox{-9.40bp}[0pt][0pt]{$A$}}\rlap{\kern0.00bp\raisebox{0.80bp}[0pt][0pt]{\rule{10.19bp}{0.50bp}}}\kern10.19bp}
\row{39.0}{95.0}{t\kern0.41bp\relax o\kern0.20bp\relax \ c\kern0.41bp\relax a\kern-0.21bp\relax lc\kern0.41bp\relax ula\kern-0.21bp\relax t\kern0.41bp\relax e\kern-0.21bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ p\kern0.41bp\relax re\kern-0.21bp\relax ssure\kern-0.21bp\relax \ {\itshape p\kern0.41bp\relax \ }d\kern0.41bp\relax ue\kern-0.21bp\relax \ t\kern0.41bp\relax o\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ w\kern0.40bp\relax e\kern-0.21bp\relax ig\kern0.20bp\relax ht\kern0.41bp\relax \ o\kern0.20bp\relax f\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ b\kern0.41bp\relax lo\kern0.20bp\relax c\kern0.41bp\relax k\kern0.21bp\relax \ o\kern0.20bp\relax n t\kern0.41bp\relax he\kern-0.21bp\relax \ t\kern0.41bp\relax a\kern-0.21bp\relax b\kern0.41bp\relax le\kern-0.21bp\relax .}
\dotline{80.3}{331.1}{{\itshape p\kern0.41bp\relax \ }=\kern0.18bp\relax}{N\,/\kern0.60bp\relax \,c\kern0.41bp\relax m\kern0.22bp\relax $^{2}$\kern-2.44bp [1]}{545.7}
\row{2.8}{95.0}{\lab{22.7}{\textbf{(\kern-0.41bp\relax d)\kern-0.41bp\relax }}A\kern-0.21bp\relax no\kern0.20bp\relax t\kern0.41bp\relax he\kern-0.21bp\relax r st\kern0.41bp\relax ud\kern0.41bp\relax e\kern-0.21bp\relax nt\kern0.41bp\relax \ sa\kern-0.21bp\relax ys t\kern0.41bp\relax ha\kern-0.21bp\relax t\kern0.41bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ a\kern-0.21bp\relax c\kern0.41bp\relax t\kern0.41bp\relax ua\kern-0.21bp\relax l p\kern0.41bp\relax re\kern-0.21bp\relax ssure\kern-0.21bp\relax \ d\kern0.41bp\relax ue\kern-0.21bp\relax \ t\kern0.41bp\relax o\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ w\kern0.40bp\relax e\kern-0.21bp\relax ig\kern0.20bp\relax ht\kern0.41bp\relax \ o\kern0.20bp\relax f\kern0.20bp\relax \ t\kern0.41bp\relax he\kern-0.21bp\relax \ b\kern0.41bp\relax lo\kern0.20bp\relax c\kern0.41bp\relax k\kern0.21bp\relax \ o\kern0.20bp\relax n t\kern0.41bp\relax he\kern-0.21bp\relax \ t\kern0.41bp\relax a\kern-0.21bp\relax b\kern0.41bp\relax le\kern-0.21bp\relax \ is\linebreak}
g\kern0.20bp\relax re\kern-0.21bp\relax a\kern-0.21bp\relax t\kern0.41bp\relax e\kern-0.21bp\relax r t\kern0.41bp\relax ha\kern-0.21bp\relax n t\kern0.41bp\relax he\kern-0.21bp\relax \ va\kern-0.21bp\relax lue\kern-0.21bp\relax \ c\kern0.41bp\relax a\kern-0.21bp\relax lc\kern0.41bp\relax ula\kern-0.21bp\relax t\kern0.41bp\relax e\kern-0.21bp\relax d\kern0.41bp\relax \ in \textbf{(\kern-0.41bp\relax c\kern0.20bp\relax )\kern-0.41bp\relax }.`);
    const c = part(question(paper, 3), 'c');
    expect(content(c)).toContain(canon(String.raw`Use the equation $p=\frac WA$`));
    expect(sentences(c.content).at(-1)).toBe('to calculate the pressure p due to the weight of the block on the table.');
    expect(c.answerSpace).toMatchObject({ kind: 'value' });
    const space = c.answerSpace as { label: string; unit: string };
    expect(canon(space.label)).toBe('p=');
    expect(canon(space.unit)).toBe(canon('N / cm$^2$'));
  });

  it('1 / V in the middle of a letter-spaced line, and an italic l', () => {
    // 5054/42/M/J/21 Q1(c), page 4
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/42/M/J/21}{1}{Electrical Quantities \textperiodcentered\ Electric Circuits}{14}
\row{26.0}{94.9}{\lab{22.6}{\textbf{(c)}}{\advance\spaceskip0.05bp\advance\xspaceskip0.05bp\textls[+5]{On the grid provided in Fig. 1.3 on page 5, plot a graph of \rlap{\kern1.19bp\raisebox{6.20bp}[0pt][0pt]{1}}\rlap{\kern0.01bp\raisebox{-6.80bp}[0pt][0pt]{{\itshape V}}}\rlap{\kern0.00bp\raisebox{3.06bp}[0pt][0pt]{\rule{8.50bp}{0.30bp}}}\kern8.50bp {} on the {\itshape y}-axis against {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }on the}}\linebreak}
$x$-axis.
\row{26.0}{95.0}{Start both axes from the origin (0, 0).}
\row{26.0}{95.0}{Draw the best-fit straight line.\swmark{[4]}}`);
    const c = part(question(paper, 1), 'c');
    correct(paper, 1, content(c),
      String.raw`On the grid provided in Fig. 1.3 on page 5, plot a graph of $\frac1V$ on the y-axis against l on the x-axis.
       Start both axes from the origin (0, 0). Draw the best-fit straight line.`);
    expect(c.marks).toBe(4);
  });
});

describe('physics: symbols', () => {
  it('a slanted rho, printed once', () => {
    // 5054/12/M/J/21 Q12, page 6
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/12/M/J/21}{12}{Pressure}{1}
\mcq{38.7}{\textbf{12}}{An object is placed at a depth $d$ below the surface of a liquid of density \mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{$\rho$}\pdfrestore\phantom{$\rho$}}.}
\stem{25.3}{On which expression does the pressure on the object depend?}
\freerow{24.5}{%
  \at{70.86}{-0.02}{\textbf{A}}%
  \at{92.10}{-0.02}{{\itshape d}}%
  \at{101.27}{-0.02}{+}%
  \at{110.76}{-0.02}{\mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{\swsy{72}}\pdfrestore\phantom{\swsy{72}}}}%
  \at{170.10}{-0.02}{\textbf{B}}%
  \at{191.40}{-0.02}{{\itshape d}}%
  \at{200.58}{-0.02}{\swsy{B4} \mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{\swsy{72}}\pdfrestore\phantom{\swsy{72}}}}%
  \at{269.40}{-0.02}{\textbf{C}}%
  \at{290.64}{-0.02}{{\itshape d}}%
  \at{299.82}{-0.02}{\swsy{B8} \mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{\swsy{72}}\pdfrestore\phantom{\swsy{72}}}}%
  \at{368.58}{-0.02}{\textbf{D}}%
  \at{389.82}{-0.02}{\mbox{\pdfsave\pdfsetmatrix{1 0 0.342 1}\rlap{\swsy{72}}\pdfrestore\phantom{\swsy{72}}} \swsy{B8}}%
  \at{407.93}{-0.02}{d}}`);
    const q = question(paper, 12);
    expect(canon(everything({ ...q, options: null }))).toContain(
      canon(String.raw`An object is placed at a depth d below the surface of a liquid of density $\rho$.`),
    );
    expect(options(q)).toEqual(lettered('$d+ρ$', '$d×ρ$', '$d÷ρ$', '$ρ÷d$'));
    expect(passesOf(paper, 12)).toEqual([]);
  });

  it('a tick from the dingbats font', () => {
    // 5054/21/M/J/18 Q9, page 10
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/21/M/J/18}{9}{Electromagnetic Spectrum \textperiodcentered\ Light (Reflection/Refraction/Lenses) \textperiodcentered\ Electrical Quantities \textperiodcentered\ Radioactivity}{15}
\row{26.0}{95.0}{Put a tick ({\usefont{U}{pzd}{m}{n}\char"33}) in the box after each statement to show whether it is true or false.}`);
    const text = sentences(question(paper, 9).stem).concat(question(paper, 9).parts.flatMap((p) => sentences(p.content)));
    expect(text.join(' ').replace('✔', '✓')).toBe(
      'Put a tick (✓) in the box after each statement to show whether it is true or false.',
    );
    expect(passesOf(paper, 9)).toEqual([]);
  });

  it('units with powers, as options in a row', () => {
    // 5054/11/M/J/16 Q5, page 3
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/16}{5}{Forces or Dynamics}{1}
\mcq{38.0}{\textbf{5 }}{A man pulls a sledge of mass 25\,kg across level ground with a horizontal force of 60\,N.\linebreak}
A constant force of friction of 20\,N acts on the sledge.
\stem{25.3}{What is the acceleration of the sledge?}
\optrow{23.7}{0.63\,m\,/\,s$^{2}$}{1.6\,m\,/\,s$^{2}$}{2.4\,m\,/\,s$^{2}$}{3.2\,m\,/\,s$^{2}$}`);
    const q = question(paper, 5);
    expect(sentences(q.stem)).toEqual([
      'A man pulls a sledge of mass 25 kg across level ground with a horizontal force of 60 N. A constant force of friction of 20 N acts on the sledge.',
      'What is the acceleration of the sledge?',
    ]);
    expect(options(q)).toEqual(lettered('0.63 m / s$^2$', '1.6 m / s$^2$', '2.4 m / s$^2$', '3.2 m / s$^2$'));
  });

  it('an index on a resistor', () => {
    // 5054/22/M/J/21 Q8, page 12
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/22/M/J/21}{8}{Electric Circuits}{6}
\row{0.0}{72.3}{\lab{22.7}{\textbf{8 }}Fig. 8.1 shows a potential divider circuit containing two resistors R$_{1}$ and R$_{2}$.}`);
    correct(paper, 8, stem(question(paper, 8)),
      'Fig. 8.1 shows a potential divider circuit containing two resistors R$_1$ and R$_2$.');
  });
});

describe('physics: underlined words', () => {
  it('the question asks about the underlined words, so they are underlined or it is flagged', () => {
    // 5054/11/M/J/17 Q2, page 2: acceleration, speed, mass and force are underlined
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
    const q = question(paper, 2);
    const printed = everything({ ...q, options: null });
    expect(sentences(q.stem)[0]).toBe(
      "A car's acceleration and maximum speed are improved by using an engine of smaller mass and greater driving force.",
    );
    const underlined = [...printed.matchAll(/<u>(.*?)<\/u>|\\underline\{(.*?)\}/g)].map((m) => (m[1] ?? m[2]).replace(/<[^>]+>/g, '').trim());
    if (passesOf(paper, 2).length > 0) expect(passesOf(paper, 2).map((p) => p.reason)).toContain('lost-underline');
    else expect(underlined).toEqual(['acceleration', 'speed', 'mass', 'force']);
    expect(options(q)).toEqual(['A: 1', 'B: 2', 'C: 3', 'D: 4']);
  });
});

describe('physics: typed nuclides and subparts inside answer lines (round 1)', () => {
  it('nuclides typed as maths, and (i)-(iv) set in their answer lines sharing one [4]', () => {
    // 5054/22/M/J/16 Q11, pages 14 and 15. Printed: (a)[2]; (b) "Using Fig. 11.1, state" (i)-(iv), one [4] for all four;
    // (c)[2]; (d)[3]; (e)(i)[2] (ii)[2]. Worth 15. How a shared [4] is stored is not settled by the contract,
    // so only the total and the reading are asserted here.
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/22/M/J/16}{11}{The Nuclear Atom \textperiodcentered\ Radioactivity \textperiodcentered\ The Stars \& Universe}{15}
\row{0.6}{72.3}{\lab{22.7}{\textbf{11}}Fig. 11.1 represents a nuclear fusion reaction.}
\row{27.4}{412.2}{par\kern0.44bp ticle B}
\qfig{14}{133.50bp 582.98bp 162.24bp 102.44bp}{}{1.8}{0}{133.50}
\row{25.8}{275.8}{\textbf{Fig. 11.1}}
\row{26.0}{72.3}{At ver\kern0.33bp y high temperatures, nuclei of the two isotopes\kern2.95bp ${'$'}{}^{2}_{1}\mathrm{H}$ and\kern2.95bp ${'$'}{}^{3}_{1}\mathrm{H}$ fuse together\kern-0.55bp . Energy is produced\linebreak}
and two new par\kern0.44bp ticles are f\kern-0.33bp ormed, par\kern0.44bp ticle A and par\kern0.44bp ticle B.
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}Explain what is meant by {\itshape isotopes }of h\kern-0.33bp ydrogen.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.68}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.4}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}Using Fig. 11.1, state}
\dotgrid{395.13}{514.39}{3.0580}
\dotline{26.0}{95.9}{\textbf{(i)\kern11.34bp }the number of neutrons in a nucleus of the isotope\kern3.03bp ${'$'}{}^{3}_{1}\mathrm{H}$,}{}{517.5}
\dotgrid{395.13}{514.39}{3.0580}
\dotline{26.0}{92.8}{\textbf{(ii)\kern11.34bp }the name of par\kern0.44bp ticle A,}{}{517.5}
\dotgrid{395.13}{514.39}{3.0580}
\dotline{26.0}{89.8}{\textbf{(iii)\kern11.34bp }the proton number of par\kern0.44bp ticle B,}{}{517.5}
\dotgrid{395.13}{514.39}{3.0580}
\dotline{26.0}{89.8}{\textbf{(iv)\kern11.34bp }the nucleon number (mass number) of par\kern0.44bp ticle B.}{}{517.5}
\qmark{13.0}{[4]}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(c)}}A ver\kern0.33bp y high temperature is needed to f\kern-0.33bp orce nuclei together\kern-0.55bp .}
\row{26.0}{94.9}{Explain wh\kern-0.33bp y\kern-1.10bp .}
\dotgrid{95.45}{541.91}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.91}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.68}{3.0580}
\dotline{26.0}{94.9}{}{[2]}{545.4}
\newpage
\pagestart
\partbreak
\row{0.6}{94.9}{\lab{22.6}{\textbf{(d)}}A star f\kern-0.33bp orms from a large cloud of gas and dust in space.}
\row{26.0}{94.9}{Describe what happens as the star f\kern-0.33bp orms.}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{541.92}{3.0580}
\dotline{26.0}{94.9}{}{}{545.0}
\dotgrid{95.45}{529.68}{3.0580}
\dotline{26.0}{94.9}{}{[3]}{545.4}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(e)}}The isotope of h\kern-0.33bp ydrogen\kern3.03bp ${'$'}{}^{3}_{1}\mathrm{H}$ has a half-lif\kern-0.33bp e of 12 years.}
\partbreak
\row{26.0}{117.6}{\lab{21.7}{\textbf{(i) }}State what is meant by {\itshape half-lif\kern-0.33bp e}.}
\dotgrid{119.91}{541.92}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[2]}{545.4}
\partbreak
\row{26.0}{117.6}{\lab{24.8}{\textbf{(ii) }}A sample contains 16\,000 atoms of\kern3.02bp ${'$'}{}^{3}_{1}\mathrm{H}$.}
\row{26.0}{117.6}{Calculate the number of atoms of\kern3.03bp ${'$'}{}^{3}_{1}\mathrm{H}$ present in the sample after 48 years.}
\dotgrid{352.32}{529.68}{3.0580}
\dotline{169.0}{300.6}{number =}{[2]}{545.4}`);
    const q = question(paper, 11);
    expect(raw(q.stem)).toContain(String.raw`${'$'}{}^{2}_{1}\mathrm{H}$`);
    // "particle B" and "Fig. 11.1" belong to the figure; only the sentences are asserted.
    expect(stem(q)).toContain(canon('Fig. 11.1 represents a nuclear fusion reaction.'));
    expect(stem(q)).toContain(canon(`At very high temperatures, nuclei of the two isotopes $^2_1$H and $^3_1$H fuse together. Energy is produced
      and two new particles are formed, particle A and particle B.`));
    expect(passesOf(paper, 11), 'everything is typed or plain text').toEqual([]);
    expect(q.marks).toBe(15);
    expect(q.parts.map((p) => p.label)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(paper.warnings.filter((w) => w.code === 'marks-mismatch' && w.questionNumber === 11)).toEqual([]);
    const b = part(q, 'b');
    const bMarks = b.marks ?? b.subparts.reduce((n, s) => n + (s.marks ?? 0), 0);
    expect(bMarks).toBe(4);
    const lines = canon(everything({ ...q, stem: [], parts: [b] }));
    const order = ['Using Fig. 11.1, state', 'the number of neutrons in a nucleus of the isotope $^3_1$H,', 'the name of particle A,',
      'the proton number of particle B,', 'the nucleon number (mass number) of particle B.'].map((t) => lines.indexOf(canon(t)));
    expect(order.every((n) => n >= 0), `all four printed: ${order}`).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(part(q, 'e', 'ii').marks).toBe(2);
    correct(paper, 11, content(part(q, 'e', 'ii')),
      'A sample contains 16 000 atoms of $^3_1$H. Calculate the number of atoms of $^3_1$H present in the sample after 48 years.');
  });
});

describe('physics: round 3, from the page', () => {
  it('a nuclide set as a stacked pair in an MCQ stem', () => {
    // 5054/11/M/J/16 Q40, page 16: "Which statement about a nucleus of ¹⁵₇N is correct?"
    const paper = paperOf(PHYSICS_MCQ, String.raw`\examq{5054/11/M/J/16}{40}{The Nuclear Atom}{1}
\mcq{3.0}{\textbf{40}}{Which statement about a nucleus of\kern4.24bp\nuc{15}{7}\kern1.25bpN\kern4.81bp is correct?}
\choice{24.3}{\textbf{A }}{The nucleus contains 7 neutrons and 8 protons.}
\choice{21.6}{\textbf{B }}{The nucleus contains 7 neutrons and 15 protons.}
\choice{21.7}{\textbf{C }}{The nucleus contains 7 protons and 8 neutrons.}
\choice{21.6}{\textbf{D }}{The nucleus contains 7 protons and 15 neutrons.}`);
    const q = question(paper, 40);
    correct(paper, 40, stem(q), 'Which statement about a nucleus of $^{15}_{7}$N is correct?');
    expect(options(q)).toEqual(lettered('The nucleus contains 7 neutrons and 8 protons.', 'The nucleus contains 7 neutrons and 15 protons.',
      'The nucleus contains 7 protons and 8 neutrons.', 'The nucleus contains 7 protons and 15 neutrons.'));
  });

  it('R = V/I prints an italic I, though the LaTeX sets it in upright Times', () => {
    // 5054/41/M/J/17 Q4(d), page 8 (300 dpi): the I under the bar is slanted like the V and R.
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/41/M/J/17}{4}{Electrical Quantities}{1}
\row{25.4}{95.0}{\lab{22.7}{\textbf{(d)}}Use your readings to find the value of the resistance $R$ using the equation}
\row{25.4}{280.8}{$R$ = \rlap{\kern0.00bp\raisebox{5.80bp}[0pt][0pt]{$V$}}\rlap{\kern1.35bp\raisebox{-7.20bp}[0pt][0pt]{\makebox[4.63bp][c]{\swf{ptm}{12.08}{I}}}}\rlap{\kern0.00bp\raisebox{3.08bp}[0pt][0pt]{\rule{7.34bp}{0.50bp}}}\kern7.34bp \kern2.09bp .}`);
    const d = part(question(paper, 4), 'd');
    correct(paper, 4, content(d), 'Use your readings to find the value of the resistance $R$ using the equation $R=\\frac{V}{I}$.');
    // canon reads \mathrm{I} as I, so the shape is checked on the output itself.
    expect(raw(d.content)).not.toMatch(/\\(mathrm|textrm|text|rm|mathup|upright)\s*\{?\s*I\b/);
  });

  it('marks printed under a figure go to the part that names it', () => {
    // 5054/42/M/J/16 Q1(d), pages 3 to 5: (i) no mark; (ii) "On Fig. 1.6, plot ..."; (iii) [2]; (iv) [1];
    // Fig. 1.6 is on page 5 with [4] under it. (d) is worth 7.
    const paper = paperOf(PHYSICS, String.raw`\examq{5054/42/M/J/16}{1}{Measurement Techniques}{7}
\row{26.0}{95.9}{\lab{22.6}{\textbf{(d)}}The student is given one square piece of card of side {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}}}. He attaches the centre of the card to\linebreak}
the end A of the metre rule with a small piece of Blu-tack, as shown in Fig. 1.4.
\row{30.2}{370.3}{Blu-tack}
\qfig{3}{166.62bp 73.41bp 163.32bp 671.41bp}{}{2.7}{0}{166.62}
\row{14.2}{279.9}{\textbf{Fig. 1.4}}
\newpage
\pagestart
\row{0.6}{94.9}{The value of {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }is 19.0\,cm.\newline}
The student repeats the e\kern-0.33bp xperiment in \textbf{(c) }to obtain a value f\kern-0.33bp or $N_{\mathrm{av}}$\kern1.03bp .\newline
He then cuts the card to make the square smaller and repeats the e\kern-0.33bp xperiment with smaller\linebreak
values of {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}}}. Fig. 1.5 shows the student'\kern-0.55bp s results.
\qfig{4}{188.94bp 570.87bp 188.16bp 126.81bp}{}{14.6}{0}{188.94}
\row{19.5}{278.9}{\textbf{Fig. 1.5}}
\partbreak
\row{25.9}{117.6}{\lab{21.7}{\textbf{(i) }}Complete Fig. 1.5 by recording your value f\kern-0.33bp or $N_{\mathrm{av}}$ from \textbf{(c)(ii) }f\kern-0.33bp or {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }= 0.}
\partbreak
\row{26.1}{117.6}{\lab{24.8}{\textbf{(ii) }}On Fig. 1.6, plot the graph of {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }/\,cm on the $y$-axis against $N_{\mathrm{av}}$ on the $x$-axis.\newline}
Star\kern0.44bp t your ax\kern-0.33bp es from (0,0). Draw the smooth cur\kern0.33bp ve of best fit.
\partbreak
\row{26.0}{117.6}{\lab{27.8}{\textbf{(iii) }}The graph shows that as {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }decreases, $N_{\mathrm{av}}$ increases.}
\row{26.0}{117.6}{T\kern-1.32bp wo quantities $x$ and $y$ are inversely propor\kern0.44bp tional if they obey the equation}
\qfig{4}{160.86bp 394.68bp 399.48bp 418.92bp}{}{11.3}{0}{160.86}
\row{12.3}{117.6}{where k is a constant.}
\row{26.0}{117.6}{By taking two pairs of values from the graph, show that $N_{\mathrm{av}}$ is \textbf{not }inversely propor\kern0.44bp tional\linebreak}
to {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}}}.
\dotgrid{119.91}{541.92}{3.0580}
\dotline{65.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{541.92}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{541.92}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[2]}{545.6}
\partbreak
\row{26.0}{117.6}{\lab{27.8}{\textbf{(iv) }}Suggest wh\kern-0.33bp y the student star\kern0.44bp ts with {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }= 19\,cm and then reduces {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}}}, rather than star\kern0.44bp ts with\linebreak}
{\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}} }= 3\,cm and then increases {\itshape \makebox[3.08bp][l]{\swf{ptm}{11.00}{l}}}.
\dotgrid{119.91}{541.91}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{541.91}{3.0580}
\dotline{26.0}{117.6}{}{}{545.0}
\dotgrid{119.91}{529.68}{3.0580}
\dotline{26.0}{117.6}{}{[1]}{545.6}
\newpage
\pagestart
\qfig{5}{125.94bp 135.66bp 113.28bp 64.50bp}{}{-8.1}{0}{125.94}
\row{31.1}{278.9}{\textbf{Fig. 1.6}}
\qmark{13.0}{[4]}
\newpage
\pagestart`);
    const d = part(question(paper, 1), 'd');
    expect(d.subparts.map((p) => [p.label, p.marks])).toEqual([['i', null], ['ii', 4], ['iii', 2], ['iv', 1]]);
    const fig16 = (blocks: { type: string; caption?: string; html?: string }[]) =>
      blocks.some((b) => b.type === 'figure') && blocks.some((b) => /Fig\. 1\.6/.test(b.html ?? b.caption ?? ''));
    expect(fig16(part(question(paper, 1), 'd', 'ii').content), 'Fig. 1.6 is with (ii)').toBe(true);
    expect(fig16(part(question(paper, 1), 'd', 'iv').content), 'not with (iv)').toBe(false);
    expect(paper.warnings.filter((w) => w.code === 'marks-mismatch' && w.questionNumber === 1)).toEqual([]);
  });
});
