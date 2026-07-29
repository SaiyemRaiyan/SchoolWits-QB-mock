const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const latexPath = path.join(__dirname, '..', 'js', 'latex.js');
const questionsPath = path.join(__dirname, '..', 'Physics-questions.tex');
const answersPath = path.join(__dirname, '..', 'Physics-answers.tex');

const source = fs.readFileSync(latexPath, 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source + '\nthis.TexParse = TexParse;', sandbox);

const TexParse = sandbox.TexParse;

test('parses the sample physics questions file with document wrappers and enumerate blocks', () => {
  const questionsTex = fs.readFileSync(questionsPath, 'utf8');
  const parsed = TexParse.parse(questionsTex, {}, {
    expectQtext: true,
    expectMarkscheme: false,
    expectExemplar: false,
    label: 'questions file'
  });

  assert.ok(parsed.questions.length >= 9, `expected at least 9 parsed questions, got ${parsed.questions.length}`);
  assert.equal(parsed.questions[0].hasQtext, true);
});

test('parses the sample physics answers file with custom question blocks', () => {
  const answersTex = fs.readFileSync(answersPath, 'utf8');
  const parsed = TexParse.parse(answersTex, {}, {
    expectQtext: false,
    expectMarkscheme: true,
    expectExemplar: true,
    label: 'answers file'
  });

  assert.ok(parsed.questions.length >= 9, `expected at least 9 parsed questions, got ${parsed.questions.length}`);
  assert.ok(parsed.questions[0].markScheme.length > 0);
});
