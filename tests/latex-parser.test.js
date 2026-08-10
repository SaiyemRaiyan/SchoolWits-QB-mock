const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const latexPath = path.join(__dirname, '..', 'js', 'latex.js');
// Real, user-authored Cambridge past-paper source using the common
// \examq{...}{...}{...}{...} template (see "Updated Latex FIles For Web")
// — the canonical dialect every uploaded paper is expected to use.
const sampleDir = path.join(__dirname, '..', 'Updated Latex FIles For Web', 'Physics MJ25 11');
const questionsPath = path.join(sampleDir, 'Physics S25QP11.tex');
const answersPath = path.join(sampleDir, 'Physics S25QA11.tex');

const source = fs.readFileSync(latexPath, 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source + '\nthis.TexParse = TexParse;', sandbox);

const TexParse = sandbox.TexParse;

test('parses a real \\examq-template question paper (Physics 5054/11 MCQ) into 40 clean questions', () => {
  const questionsTex = fs.readFileSync(questionsPath, 'utf8');
  const parsed = TexParse.parse(questionsTex, {}, {
    expectQtext: true,
    expectMarkscheme: false,
    expectExemplar: false,
    label: 'questions file'
  });

  assert.equal(parsed.questions.length, 40);
  const q1 = parsed.questions[0];
  assert.equal(q1.hasQtext, true);
  assert.equal(q1.topic, 'Physical Quantities and Measurements');
  assert.equal(q1.marks, '1');
  // No raw LaTeX control sequences should ever leak into rendered HTML.
  parsed.questions.forEach(q => {
    assert.doesNotMatch(q.qHTML, /\\examq|\\begin\{choices\}|\\qfig|\\textbf\{|\\makecell/);
  });
  // \begin{choices} (Q3/Q4) renders as bare A/B/C/D labels, no parens.
  const q3 = parsed.questions.find(q => q.id === 3);
  assert.match(q3.qHTML, /<span class="pmark">A<\/span>/);
  // \makecell{...\\...} inside a \begin{tabular} cell must not corrupt the
  // table into extra bogus rows.
  const q1Rows = (q1.qHTML.match(/<tr>/g) || []).length;
  assert.equal(q1Rows, 5); // header + A/B/C/D
});

test('parses the matching real \\examq-template answers file (ansbox-only MCQ solutions)', () => {
  const answersTex = fs.readFileSync(answersPath, 'utf8');
  const parsed = TexParse.parse(answersTex, {}, {
    expectQtext: false,
    expectMarkscheme: false,
    expectExemplar: true,
    label: 'answers file'
  });

  assert.equal(parsed.questions.length, 40);
  const a1 = parsed.questions[0];
  assert.ok(a1.exemplarHTML.length > 0);
  // Real math ($\boxed{\text{D}}$) must survive untouched for KaTeX —
  // only structural macros (never real content) should be stripped.
  assert.match(a1.exemplarHTML, /\$\\boxed\{\\text\{D\}\}\$/);
  assert.doesNotMatch(a1.exemplarHTML, /\\examq|\\begin\{ansbox\}|\\end\{ansbox\}/);
});

test('merging the real question+answer pair keys every question by number with topic/marks intact', () => {
  const qParsed = TexParse.parse(fs.readFileSync(questionsPath, 'utf8'), {}, {
    expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
  });
  const aParsed = TexParse.parse(fs.readFileSync(answersPath, 'utf8'), {}, {
    expectQtext: false, expectMarkscheme: false, expectExemplar: true, label: 'answers file'
  });
  const merged = TexParse.mergeQuestionsAndAnswers(qParsed, aParsed);

  assert.equal(merged.questions.length, 40);
  merged.questions.forEach(q => {
    assert.notEqual(q.topic, 'Uncategorised');
    assert.ok(q.exemplarHTML.length > 0);
  });
});
