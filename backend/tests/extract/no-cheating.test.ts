/**
 * Nothing in the extractor may know one particular paper. A rule that names a
 * paper, a place on one page or a question number makes a test pass and
 * teaches the extractor nothing about the next paper.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../src/extract', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

/** Comments may cite a paper; code may not. Strings and regexes are kept. */
function code(source: string): string {
  return source.replace(
    /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|(^|[^:\\])\/\/[^\n]*/g,
    (_, text: string | undefined, before: string | undefined) => text ?? before ?? '',
  );
}

const CHEATS: [string, RegExp][] = [
  ['a paper id', /\d{4}\\?\/\d\d\\?\/[MO]\b|\d{4}\\?\/\d\d\\?\/[MO]\\?\//],
  ['a paper file name', /\d{4}_[swm]\d\d_q[pa]/i],
  ['a place on a page', /(?:-?\d+(?:\.\d+)?\s*bp\s+){3}-?\d+(?:\.\d+)?\s*bp/],
  ['four page measurements in a row', /(?:\b\d{2,3}\.\d{2}\b[\s,:a-z]*){4}/],
  ['a page number', /\bpage\s*(?:===?|!==?)\s*\d{1,2}\b/],
  ['a question number', /\b(?:number|questionNumber|question|qNumber|qn)\s*(?:===?|!==?|>=?|<=?)\s*[1-9]\d*\b/],
  ['a list of question numbers', /\[[\d,\s]+\]\.includes\(\s*(?:\w+\.)?(?:number|questionNumber)\b/],
  ['a session of one year', /\byear\s*(?:===?|!==?)\s*['"]?(?:20)?\d\d\b/],
];

describe('the scan itself', () => {
  it.each([
    ["if (id === '5070/11/M/J/16') x();", 'a paper id'],
    [String.raw`/4037\/23\/O\/N/`, 'a paper id'],
    ["const T = '150.08bp 755.03bp 435.99bp 65.66bp';", 'a place on a page'],
    ['const T = [150.08, 755.03, 435.99, 65.66];', 'four page measurements in a row'],
    ['const T = { left: 150.08, bottom: 755.03, right: 435.99, top: 65.66 };', 'four page measurements in a row'],
    ['if (block.number === 20) x();', 'a question number'],
    ['if ([12, 20].includes(q.number)) x();', 'a list of question numbers'],
    ["read('5070_s16_qp_11.tex')", 'a paper file name'],
  ])('catches %s', (line, name) => {
    const [, pattern] = CHEATS.find(([n]) => n === name)!;
    expect(code(line)).toMatch(pattern);
  });

  it('leaves comments and honest code alone', () => {
    const honest = code(`// 5070/11/M/J/16 Q13
/* trim 150.08bp 755.03bp 435.99bp 65.66bp */
const SUBJECTS = { '5054': Physics, '5070': Chemistry };
if (questions.length === 0 || number > 0) return;
const WIDTHS = { l: 0.278, I: 0.333, V: 0.722, W: 0.944 };`);
    for (const [, pattern] of CHEATS) expect(honest).not.toMatch(pattern);
  });
});

describe('src/extract knows no paper', () => {
  const sources = files(ROOT).map((path) => ({ path: path.slice(ROOT.length + 1), text: code(readFileSync(path, 'utf8')) }));

  it('has something to scan', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(CHEATS)('has no %s in its code', (_, pattern) => {
    const found = sources.flatMap(({ path, text }) =>
      text.split('\n').filter((line) => pattern.test(line)).map((line) => `${path}: ${line.trim()}`),
    );
    expect(found).toEqual([]);
  });

  it('imports nothing but its own folder and src/latex (it runs inside Deno)', () => {
    const bad = files(ROOT).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)]
        .map((m) => m[1])
        .filter((name) => !name.startsWith('.') || !name.endsWith('.js'))
        .map((name) => `${path.slice(ROOT.length + 1)}: ${name}`),
    );
    expect(bad).toEqual([]);
  });

  it('touches no browser or Node global', () => {
    const bad = sources.filter(({ text }) => /\b(?:document\.|window\.|process\.|require\(|Buffer\b|__dirname)/.test(text.replace(/\{document\}/g, '')));
    expect(bad.map((s) => s.path)).toEqual([]);
  });

  it('names no word of a question', () => {
    // Sentences of the fixtures: an extractor that holds one has been taught the test.
    const words = /sledge|amphoteric|manganate|bismuth|photosynthesis|skydiver|conclusion 1|experiment 1|graphite|coordinates of the vertex/i;
    expect(sources.filter(({ text }) => words.test(text)).map((s) => s.path)).toEqual([]);
  });
});
