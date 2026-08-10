const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TexParse = require(path.join(__dirname, '..', 'js', 'latex.js'));
// Real, user-authored Cambridge past-paper source using the common
// \examq{...}{...}{...}{...} template (see "Updated Latex FIles For Web").
const mcqDir = path.join(__dirname, '..', 'Updated Latex FIles For Web', 'Physics MJ25 11');
const structuredDir = path.join(__dirname, '..', 'Updated Latex FIles For Web', 'Physics MJ25 21');
const questionsPath = path.join(mcqDir, 'Physics S25QP11.tex');
const answersPath = path.join(mcqDir, 'Physics S25QA11.tex');

test('parses a real \\examq-template MCQ question paper (Physics 5054/11) into 40 clean questions', () => {
  const questionsTex = fs.readFileSync(questionsPath, 'utf8');
  const parsed = TexParse.parse(questionsTex, {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  assert.equal(parsed.questions.length, 40);
  assert.equal(parsed.questions[0].hasQtext, true);
  assert.equal(parsed.questions[0].topic, 'Physical Quantities and Measurements');
});

test('parses the matching real \\examq-template MCQ answers file (ansbox-only)', () => {
  const answersTex = fs.readFileSync(answersPath, 'utf8');
  const parsed = TexParse.parse(answersTex, {}, {
    expectQtext: false, expectMarkscheme: false, expectExemplar: true, label: 'answers file'
  });
  assert.equal(parsed.questions.length, 40);
  assert.ok(parsed.questions[0].exemplarHTML.length > 0);
});

test('a real structured \\examq paper (Physics 5054/21) renders \\begin{parts}/\\begin{subparts}, \\ansval, \\markright and multi-topic \\examq cleanly', () => {
  const qTex = fs.readFileSync(path.join(structuredDir, 'Physics S25QP21.tex'), 'utf8');
  const parsed = TexParse.parse(qTex, {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  assert.equal(parsed.questions.length, 9);

  const q1 = parsed.questions[0];
  // \examq's 3rd arg joined two topics with \textperiodcentered.
  assert.deepEqual(q1.topics, ['Motion or Kinematics', 'Forces or Dynamics']);
  assert.equal(q1.topic, 'Motion or Kinematics · Forces or Dynamics');
  assert.equal(q1.marks, '9');

  // \begin{parts} -> 4 alpha-lettered top-level parts, one containing a
  // nested \begin{subparts} with 2 roman-numeral items.
  const topParts = (q1.qHTML.match(/class="qpart qpart--sub"/g) || []).length;
  assert.equal(topParts, 6); // 4 \part items + 2 nested \subpart items, all rendered with the same wrapper class
  assert.ok(q1.qHTML.includes('<span class="pmark">(a)</span>'));
  assert.ok(q1.qHTML.includes('<span class="pmark">(d)</span>'));
  assert.ok(q1.qHTML.includes('<span class="pmark">(i)</span>'));
  assert.ok(q1.qHTML.includes('<span class="pmark">(ii)</span>'));

  // \markright{[2]} / \markright{[3]} -> mark badges, \total stripped.
  assert.ok(q1.qHTML.includes('<span class="markbadge">[2]</span>'));
  assert.ok(q1.qHTML.includes('<span class="markbadge">[3]</span>'));
  assert.doesNotMatch(q1.qHTML, /\\total|\\markright|\\examq|\\begin\{parts\}|\\begin\{subparts\}/);

  // \ansval{label}{unit}{marks} -> label + short inline blank + unit.
  assert.ok(q1.qHTML.includes('class="ansblank"'));
  assert.ok(q1.qHTML.includes('magnitude of resultant ='));
  // \dg{} (bare degree symbol macro) inside an \ansval unit arg.
  assert.ok(q1.qHTML.includes('° to vertical'));
});

test('the matching real structured mark scheme (Physics 5054/21 QA) fixes ungrouped single mstab rows and renders \\altrow banners', () => {
  const aTex = fs.readFileSync(path.join(structuredDir, 'Physics S25QA21.tex'), 'utf8');
  const rows = TexParse.extractMstabRows(aTex, {});

  // "1(b) & gradient / slope decreases ... & B1" is an ungrouped single
  // row (no \multirow, no leading blank "&") — its own label must be
  // captured as the part, not swallowed into the answer/marks columns.
  const row1b = rows.find(r => r.part === '1(b)');
  assert.ok(row1b, `expected a row with part "1(b)", got parts: ${JSON.stringify(rows.map(r => r.part))}`);
  assert.match(row1b.answer, /gradient \/ slope decreases/);
  assert.equal(row1b.marks, 'B1');

  // Multirow-grouped rows (e.g. 1(a) spanning 2 rows) still work.
  const row1a = rows.find(r => r.part === '1(a)');
  assert.ok(row1a);
});

test('\\altrow{color}{label} (Add Maths mark scheme "Alternative method" banner) renders as a distinct banner row, not a corrupted part label', () => {
  const altDir = path.join(__dirname, '..', 'Updated Latex FIles For Web', 'Add Maths MJ25 11');
  const aTex = fs.readFileSync(path.join(altDir, 'Add Maths S25QA11 .tex'), 'utf8');
  const rows = TexParse.extractMstabRows(aTex, {});
  const banner = rows.find(r => r.isBanner);
  assert.ok(banner, 'expected at least one \\altrow banner row to be found');
  assert.match(banner.answer, /Alternative/);
  assert.equal(banner.part, '');
  assert.equal(banner.marks, '');
  // The raw macro call must never leak as visible text.
  assert.ok(!rows.some(r => /\\altrow/.test(r.part) || /\\altrow/.test(r.answer)));
});

test('missing \\end{question} produces a specific, actionable warning instead of a silent zero', () => {
  const broken = `\\documentclass[11pt]{article}
\\begin{document}
\\subject{Physics}
\\paper{2}
\\variant{1}
\\session{M/J}
\\year{2025}

\\begin{question}{1}
\\markscheme
\\row{1(a)}{Answer}{B1}
\\endms
\\exemplar
Text.
\\endexemplar

\\begin{question}{2}
\\markscheme
\\row{2(a)}{Answer}{B1}
\\endms
\\exemplar
Text.
\\endexemplar

\\end{document}
`;
  const parsed = TexParse.parse(broken, {}, {
    expectQtext: false, expectMarkscheme: true, expectExemplar: true, label: 'answers file'
  });
  assert.equal(parsed.questions.length, 0);
  const hasSpecificWarning = parsed.warnings.some(w => w.includes('no matching') && w.includes('\\end{question}'));
  assert.ok(hasSpecificWarning, `expected an actionable \\end{question} warning, got: ${JSON.stringify(parsed.warnings)}`);
});

test('parseFragment renders a raw pasted CIE-style question with no preamble needed', () => {
  const frag = [
    '\\textbf{Question 4} \\textit{[Pure Mathematics]}',
    '',
    '(a) Solve $2x^2 - 5x - 3 = 0$. [3]',
    '',
    '\\begin{enumerate}',
    '\\item[(i)] Find $\\dfrac{dy}{dx}$. [3]',
    '\\item[(ii)] Determine the nature of each point. [2]',
    '\\end{enumerate}',
    '',
    '\\begin{center}',
    '\\includegraphics[width=6cm]{graph_curve.png}',
    '\\end{center}',
    '',
    '\\begin{tabular}{|c|c|}',
    '\\hline',
    '$x$ & $y$ \\\\',
    '\\hline',
    '1 & 2 \\\\',
    '\\hline',
    '\\end{tabular}'
  ].join('\n');

  const result = TexParse.parseFragment(frag, ['data:image/png;base64,ABC']);
  assert.equal(result.imageCount, 1);
  assert.deepEqual(result.imageRefs, ['graph_curve.png']);
  assert.ok(result.html.includes('<b>Question 4</b>'));
  assert.ok(result.html.includes('$2x^2 - 5x - 3 = 0$'), 'math delimiters must survive untouched for KaTeX');
  assert.ok(result.html.includes('<span class="pmark">(i)</span>'), 'explicit \\item[(i)] label must be honored');
  assert.ok(result.html.includes('<span class="pmark">(ii)</span>'));
  assert.ok(result.html.includes('src="data:image/png;base64,ABC"'), 'image must map by upload order, not filename');
  assert.ok(result.html.includes('<table class="datatable">'), '\\tabular must convert to a table');
});

test('parseFragment strips an accidentally-pasted full document wrapper', () => {
  const frag = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Just the question text with $x + 1$.
\\end{document}`;
  const result = TexParse.parseFragment(frag, []);
  assert.ok(!result.html.includes('documentclass'));
  assert.ok(result.html.includes('Just the question text'));
  assert.ok(result.html.includes('$x + 1$'));
});

test('parseFragment flags an \\includegraphics with no corresponding upload yet', () => {
  const result = TexParse.parseFragment('\\includegraphics{missing.png}', []);
  assert.ok(result.html.includes('data-missing="1"'));
  assert.ok(result.html.includes('Image not uploaded'));
});

test('parseFragment strips exam-booklet print-layout commands instead of leaking raw code', () => {
  const frag = [
    '(ii) \\quad Calculate the average speed. [2]',
    '\\vspace{2cm} \\hfill speed = \\answerline[2in] cm/s',
    '\\vspace{1cm} \\hrule \\vspace{0.8cm} \\hrule \\hfill [2]',
    '\\newpage',
    '2 \\quad Fig. 2.1 shows a fork-lift truck.'
  ].join('\n');
  const result = TexParse.parseFragment(frag, []);
  ['\\vspace', '\\hfill', '\\hrule', '\\quad', '\\answerline', '\\newpage'].forEach(cmd => {
    assert.ok(!result.html.includes(cmd), `expected ${cmd} to be stripped/converted, got: ${result.html}`);
  });
  // answerline and workinglines are now silently removed (no rendered HTML artifact)
  assert.ok(!result.html.includes('\\answerline'));
  assert.ok(!result.html.includes('\\hrule'));
  assert.ok(result.html.includes('Calculate the average speed'));
  assert.ok(result.html.includes('fork-lift truck'));
});

test('a raw numbered exam-paper file (no \\begin{question}, no \\qsection, no enumerate) splits into separate questions instead of one giant block', () => {
  const src = `\\documentclass[11pt]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\pagestyle{empty}
\\newcommand{\\answerline}[1][3in]{\\makebox[#1]{\\hrulefill}}
\\begin{document}
\\textbf{1} \\quad A ball is dropped by the side of a vertical scale.

\\textbf{(a)} \\quad Calculate the average speed.

\\vspace{2cm}
\\hfill speed = \\answerline[2in] cm/s [2]

\\hfill [Total: 10]

\\newpage

\\textbf{2} \\quad Fig. 2.1 shows a fork-lift truck used to lift a load.

\\textbf{(a)} \\quad Define \`power'.

\\hfill [Total: 8]

\\end{document}
`;
  const parsed = TexParse.parse(src, {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[0].id, 1);
  assert.equal(parsed.questions[0].marks, '10');
  assert.ok(parsed.questions[0].qHTML.includes('ball is dropped'));
  assert.ok(!parsed.questions[0].qHTML.includes('fork-lift'), 'question 1 must not swallow question 2\'s text');
  assert.equal(parsed.questions[1].id, 2);
  assert.equal(parsed.questions[1].marks, '8');
  assert.ok(parsed.questions[1].qHTML.includes('fork-lift truck'));
  assert.ok(!parsed.questions[0].qHTML.includes('newcommand'), 'preamble noise must not leak into question 1');
});

test('a full custom-macro exam booklet (definecolor/newcommand/newenvironment/mstab) renders clean, with no leaked definitions', () => {
  const src = fs.readFileSync(path.join(__dirname, 'fixtures-userexample.tex'), 'utf8');
  const result = TexParse.parseFragment(src, []);

  // None of the preamble/definition machinery should leak into the output.
  ['\\definecolor', '\\newcommand', '\\newenvironment', '\\newtcolorbox',
   '\\titleformat', '\\pagestyle', '\\fancyhf', '\\fancyhead', '\\hbadness',
   '\\vbadness', '\\geometry', '\\label', '\\arrayrulecolor', '\\Needspace',
   '\\markboth'].forEach(cmd => {
    assert.ok(!result.html.includes(cmd), `expected ${cmd} to be stripped, got: ${result.html}`);
  });
  // Comments must not leak as visible text.
  assert.ok(!result.html.includes('Short forced heading lines'));

  // Content macros must actually render.
  assert.ok(result.html.includes('sessionbanner'));
  assert.ok(result.html.includes('5054/22/M/J/25'));
  assert.ok(result.html.includes('qsection-heading'));
  assert.ok(result.html.includes('<table class="mstable">'));
  assert.ok(result.html.includes('smooth curve drawn'));

  const rows = TexParse.extractMstabRows(src);
  assert.equal(rows.length, 11);
  assert.equal(rows[0].part, '1(a)(i)');
  assert.equal(rows[0].marks, 'B1');
  assert.equal(rows[8].part, ''); // continuation row of the 3-row 1(b)(i) group
  assert.ok(!rows.some(r => r.answer.includes('\\newline')), 'newline must be converted, not leaked');
});