/**
 * npm run check-papers [-- options]
 *
 * Runs the paper extractor over every paper in the question-paper folders and
 * reports, per subject: questions clean, rebuilt, passed (by reason) and
 * suspicious (by kind). Writes one JSON dump per paper, so rounds can be
 * diffed, and compares with the current reader's output when given it.
 *
 *   --papers DIR     the folders' parent (default ~/Documents/Question_Papers)
 *   --subject NAME   only folders whose name contains NAME (Physics, Chem, Maths)
 *   --only TEXT      only papers whose file name contains TEXT
 *   --out DIR        where the dump goes (default <tmp>/check-papers)
 *   --baseline DIR   the current reader's output, <DIR>/<folder>/<qp>.json
 *   --show KIND      print every question with this suspicion or pass reason
 *
 * Nothing in the repository is written.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExtractor } from '../src/extract/index.js';
import type { ExtractedPaper, Pass } from '../src/extract/types.js';
import type { Block, ParsedPaper, Part, Question } from '../src/latex/types.js';

const FOLDERS = ['Physics_5054', 'Chem_5070', 'Add_Maths_4037'];

function option(name: string, fallback: string | null = null): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const papersDir = option('papers', join(homedir(), 'Documents/Question_Papers'))!;
const outDir = option('out', join(tmpdir(), 'check-papers'))!;
const baselineDir = option('baseline');
const subjectFilter = option('subject');
const only = option('only');
const show = option('show');

// ---- KaTeX with the site's macros -----------------------------------------

const repo = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** The MACROS literal of lib/katex.ts, read as text: that file is the app's, not ours to import. */
function siteMacros(): Record<string, string> {
  const src = readFileSync(join(repo, 'lib/katex.ts'), 'utf8');
  const m = /const MACROS[^=]*=\s*(\{[\s\S]*?\n\});/.exec(src);
  if (!m) throw new Error('MACROS not found in lib/katex.ts');
  return Function(`return ${m[1]}`)() as Record<string, string>;
}

type Katex = { renderToString(tex: string, options: object): string };
const katex = ((await import('katex' as string)) as { default: Katex }).default;
const MACROS = siteMacros();

function katexError(tex: string, display: boolean): string | null {
  try {
    katex.renderToString(tex, { throwOnError: true, displayMode: display, macros: { ...MACROS } });
    return null;
  } catch (e) {
    return String((e as Error).message).slice(0, 120);
  }
}

const MATH = /\$\$([\s\S]*?)\$\$|\$((?:\\[\s\S]|[^$\\])*)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;

// ---- flattening a question to its text ------------------------------------

function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/g, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const blocksText = (blocks: Block[]) =>
  blocks
    .map((b) => (b.type === 'figure' ? `[fig${b.caption ? `: ${decode(b.caption)}` : ''}]` : decode(b.html)))
    .join(' ¶ ')
    .replace(/\s+/g, ' ')
    .trim();

/** One line per stem, part and option: what a reader sees, for diffing. */
export function questionLines(q: Question): string[] {
  const out: string[] = [];
  const stem = blocksText(q.stem);
  if (stem) out.push(`stem: ${stem}`);
  const parts = (list: Part[]) => {
    for (const p of list) {
      out.push(`${p.ref} [${p.marks ?? '-'}]: ${blocksText(p.content)}`);
      parts(p.subparts);
    }
  };
  parts(q.parts);
  for (const o of q.options?.items ?? []) out.push(`${o.label}: ${decode(o.content).replace(/\s+/g, ' ').trim()}`);
  if (q.options?.source === 'figure') out.push('options: [figure]');
  return out;
}

const allHtml = (q: Question): string[] => {
  const html: string[] = [];
  const add = (blocks: Block[]) => blocks.forEach((b) => html.push(b.type === 'figure' ? b.caption : b.html));
  add(q.stem);
  const parts = (list: Part[]) => list.forEach((p) => (add(p.content), parts(p.subparts)));
  parts(q.parts);
  q.options?.items.forEach((o) => html.push(o.content));
  return html;
};

/** For comparing with the old reader: quote style and spacing are not differences of text. */
// A script as $_{2}$ or as <sub>2</sub> (flattened to 2) prints the same.
const loose = (lines: string[]) => lines.join('\n').replace(/\$([_^])\{([^{}$]*)\}\$/g, '$2').replace(/\$([_^])\{([^{}$]*)\}([_^])\{([^{}$]*)\}\$/g, '$2$4').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
const spaceless = (lines: string[]) => loose(lines).replace(/ /g, '');

// ---- judging one question --------------------------------------------------

type Suspicion = 'leaked-length' | 'leaked-command' | 'katex' | 'katex-answer' | 'mcq-not-4' | 'mcq-figure' | 'marks' | 'empty' | 'furniture';

function suspicions(q: Question, paper: ParsedPaper): { kind: Suspicion; detail: string }[] {
  const out: { kind: Suspicion; detail: string }[] = [];
  const html = allHtml(q);
  const prose = html.map((h) => decode(h.replace(MATH, ' '))).join('\n');
  const length = /\d(?:\.\d+)?(?:bp|pt)\b/.exec(prose);
  if (length) out.push({ kind: 'leaked-length', detail: around(prose, length.index) });
  const command = /\\[a-zA-Z]+/.exec(prose);
  if (command) out.push({ kind: 'leaked-command', detail: around(prose, command.index) });
  for (const h of html) {
    for (const m of h.matchAll(MATH)) {
      const tex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
      const err = katexError(tex, m[1] !== undefined || m[4] !== undefined);
      if (err) out.push({ kind: 'katex', detail: `${m[0].slice(0, 80)} -> ${err}` });
    }
  }
  const answerHtml = [
    ...(q.answer?.markScheme ?? []).flatMap((r) => [r.answer, r.guidance ?? '']),
    ...(q.answer?.workedSolution ?? []).map((w) => w.html),
  ];
  for (const h of answerHtml) {
    for (const m of h.matchAll(MATH)) {
      const tex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
      const err = katexError(tex, m[1] !== undefined || m[4] !== undefined);
      if (err) out.push({ kind: 'katex-answer', detail: `${m[0].slice(0, 80)} -> ${err}` });
    }
  }
  if (q.kind === 'mcq') {
    if (q.options?.source === 'figure') out.push({ kind: 'mcq-figure', detail: 'options only in a figure' });
    else if ((q.options?.items.length ?? 0) !== 4) out.push({ kind: 'mcq-not-4', detail: `${q.options?.items.length ?? 0} options` });
  }
  if (paper.warnings.some((w) => w.code === 'marks-mismatch' && w.questionNumber === q.number)) {
    out.push({ kind: 'marks', detail: paper.warnings.find((w) => w.code === 'marks-mismatch' && w.questionNumber === q.number)!.message });
  }
  const text = questionLines(q).join(' ').replace(/\[fig[^\]]*\]/g, '');
  if (!/[\p{L}\p{N}]/u.test(text.replace(/^stem: |\S+ \[[\d-]+\]: /gm, '')) && !q.stem.some((b) => b.type === 'figure')) {
    out.push({ kind: 'empty', detail: 'nothing printed' });
  }
  // Page furniture, not mentions: "in Group II of the Periodic Table" is a question's own words.
  const furniture =
    /BLANK\s*PAGE|The Periodic Table of (?:the )?Elements|Turn over|(?:^|¶|\n)\s*Section [A-D]\s*(?:$|¶|\n)|is printed on the next page|Notes for use in|Answer (?:one|all|any \w+) questions? (?:from|in) this section|Permission to reproduce/i.exec(
      prose.replace(/\s*\n\s*/g, '\n'),
    );
  if (furniture) out.push({ kind: 'furniture', detail: around(prose, furniture.index) });
  return out;
}

function around(s: string, at: number): string {
  return s.slice(Math.max(0, at - 40), at + 40).replace(/\s+/g, ' ');
}

// ---- the run ---------------------------------------------------------------

interface Totals {
  papers: number;
  crashed: string[];
  questions: number;
  clean: number;
  rebuilt: number;
  passed: number;
  passedBy: Record<string, number>;
  passesBy: Record<string, number>;
  suspicious: number;
  suspiciousBy: Record<string, number>;
  details: Map<string, number>;
  baselineChanged: number;
  baselineMissing: number;
  /** Differs from the baseline only in where spaces are. */
  baselineSpacing: number;
  /** Questions with no answer attached although there is an answers file. */
  noAnswer: number;
}

const bump = (r: Record<string, number>, k: string, n = 1) => (r[k] = (r[k] ?? 0) + n);

mkdirSync(outDir, { recursive: true });
const report: Record<string, Omit<Totals, 'details'>> = {};
const shown: string[] = [];

for (const folder of FOLDERS) {
  if (subjectFilter && !folder.toLowerCase().includes(subjectFilter.toLowerCase())) continue;
  const root = join(papersDir, folder);
  if (!existsSync(root)) {
    console.error(`missing: ${root}`);
    continue;
  }
  const t: Totals = {
    papers: 0, crashed: [], questions: 0, clean: 0, rebuilt: 0, passed: 0, passedBy: {}, passesBy: {}, suspicious: 0,
    suspiciousBy: {}, details: new Map(), baselineChanged: 0, baselineMissing: 0, baselineSpacing: 0, noAnswer: 0,
  };
  const diffs: string[] = [];
  mkdirSync(join(outDir, folder), { recursive: true });

  for (const dir of readdirSync(root).sort()) {
    const files = readdirSync(join(root, dir));
    const qp = files.find((f) => /_qp_.*\.tex$/.test(f));
    if (!qp || (only && !qp.includes(only))) continue;
    const qa = files.find((f) => /_qa_.*\.tex$/.test(f));
    t.papers++;
    let paper: ExtractedPaper;
    let rebuilt: readonly number[];
    try {
      const extractor = createExtractor({
        questions: readFileSync(join(root, dir, qp), 'utf8'),
        answers: qa ? readFileSync(join(root, dir, qa), 'utf8') : null,
      });
      paper = extractor.extract();
      rebuilt = extractor.rebuilt;
    } catch (e) {
      t.crashed.push(`${qp}: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`);
      continue;
    }

    const base = baselineDir ? join(baselineDir, folder, qp.replace(/\.tex$/, '.json')) : null;
    const old: ParsedPaper | null = base && existsSync(base) ? JSON.parse(readFileSync(base, 'utf8')) : null;
    const dump = paper.questions.map((q) => {
      t.questions++;
      if (qa && !q.answer) t.noAnswer++;
      const passes = paper.passes.filter((p) => p.question === q.number);
      const sus = suspicions(q, paper);
      const lines = questionLines(q);
      if (passes.length) {
        t.passed++;
        new Set(passes.map((p) => p.reason)).forEach((r) => bump(t.passedBy, r));
        passes.forEach((p: Pass) => {
          bump(t.passesBy, p.reason);
          const key = `${p.reason}: ${p.detail.replace(/\d+(?:\.\d+)?/g, 'N').slice(0, 70)}`;
          t.details.set(key, (t.details.get(key) ?? 0) + 1);
        });
      } else if (rebuilt.includes(q.number)) t.rebuilt++;
      else t.clean++;
      if (sus.length) {
        t.suspicious++;
        new Set(sus.map((s) => s.kind)).forEach((k) => bump(t.suspiciousBy, k));
      }
      if (show && (sus.some((s) => s.kind === show) || passes.some((p) => p.reason === show))) {
        shown.push(`${qp} Q${q.number}: ${[...sus.filter((s) => s.kind === show).map((s) => s.detail), ...passes.filter((p) => p.reason === show).map((p) => p.detail)].join(' || ')}`);
      }
      const oldQ = old?.questions.find((x) => x.number === q.number);
      const oldLines = oldQ ? questionLines(oldQ) : null;
      if (old) {
        if (!oldQ) t.baselineMissing++;
        else if (loose(oldLines!) !== loose(lines)) {
          t.baselineChanged++;
          if (spaceless(oldLines!) === spaceless(lines)) t.baselineSpacing++;
          diffs.push(`=== ${qp} Q${q.number}\n--- old\n${oldLines!.join('\n')}\n+++ new\n${lines.join('\n')}\n`);
        }
      }
      return {
        paper: qp.replace(/\.tex$/, ''), number: q.number, kind: q.kind, marks: q.marks, lines,
        passes: passes.map((p) => `${p.reason}: ${p.detail}`), suspicious: sus.map((s) => `${s.kind}: ${s.detail}`),
        rebuilt: rebuilt.includes(q.number), ...(oldLines ? { baseline: oldLines } : null),
      };
    });
    writeFileSync(join(outDir, folder, qp.replace(/\.tex$/, '.json')), JSON.stringify(dump, null, 1));
  }
  if (diffs.length) writeFileSync(join(outDir, folder, '_diff-vs-baseline.txt'), diffs.join('\n'));

  const { details, ...rest } = t;
  report[folder] = rest;
  console.log(`\n== ${folder}: ${t.papers} papers, ${t.questions} questions${t.crashed.length ? `, ${t.crashed.length} CRASHED` : ''}`);
  console.log(`   clean ${t.clean} | rebuilt ${t.rebuilt} | passed ${t.passed} | suspicious ${t.suspicious}`);
  console.log(`   passed by reason (questions): ${JSON.stringify(t.passedBy)}  (passes: ${JSON.stringify(t.passesBy)})`);
  console.log(`   suspicious by kind (questions): ${JSON.stringify(t.suspiciousBy)}`);
  if (baselineDir) console.log(`   vs baseline: ${t.baselineChanged} questions' text differs (${t.baselineSpacing} only in spacing), ${t.baselineMissing} not in baseline`);
  console.log(`   no answer attached (answers file present): ${t.noAnswer}`);
  t.crashed.forEach((c) => console.log(`   crash: ${c}`));
  const top = [...details].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) console.log(`   most frequent passes:\n${top.map(([k, n]) => `     ${n}x ${k}`).join('\n')}`);
}

writeFileSync(join(outDir, '_summary.json'), JSON.stringify(report, null, 1));
if (shown.length) console.log(`\n-- ${show}:\n${shown.join('\n')}`);
console.log(`\ndump: ${outDir}`);
