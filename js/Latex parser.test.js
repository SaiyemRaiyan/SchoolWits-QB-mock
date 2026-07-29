const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TexParse = require(path.join(__dirname, '..', 'js', 'latex.js'));
const questionsPath = path.join(__dirname, '..', 'Physics-questions.tex');
const answersPath = path.join(__dirname, '..', 'Physics-answers.tex');

test('parses the sample physics questions file with document wrappers and enumerate blocks', () => {
  const questionsTex = fs.readFileSync(questionsPath, 'utf8');
  const parsed = TexParse.parse(questionsTex, {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  assert.ok(parsed.questions.length >= 9, `expected at least 9 parsed questions, got ${parsed.questions.length}`);
  assert.equal(parsed.questions[0].hasQtext, true);
});

test('parses the sample physics answers file with custom question blocks', () => {
  const answersTex = fs.readFileSync(answersPath, 'utf8');
  const parsed = TexParse.parse(answersTex, {}, {
    expectQtext: false, expectMarkscheme: true, expectExemplar: true, label: 'answers file'
  });
  assert.ok(parsed.questions.length >= 9, `expected at least 9 parsed questions, got ${parsed.questions.length}`);
  assert.ok(parsed.questions[0].markScheme.length > 0);
});

test('a document-wrapped TEMPLATE-style answers file parses with zero warnings', () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'samples', 'TEMPLATE-answers.tex'), 'utf8');
  const parsed = TexParse.parse(tpl, {}, {
    expectQtext: false, expectMarkscheme: true, expectExemplar: true, label: 'answers file'
  });
  assert.ok(parsed.questions.length >= 3, `expected at least 3 questions, got ${parsed.questions.length}`);
  assert.deepEqual(parsed.warnings, []);
});

test('a document-wrapped TEMPLATE-style questions file parses with zero warnings', () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'samples', 'TEMPLATE-questions.tex'), 'utf8');
  const parsed = TexParse.parse(tpl, {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  assert.ok(parsed.questions.length >= 3, `expected at least 3 questions, got ${parsed.questions.length}`);
  assert.deepEqual(parsed.warnings, []);
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