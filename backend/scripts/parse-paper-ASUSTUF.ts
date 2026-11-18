#!/usr/bin/env node
/**
 * Parse a paper folder and show what came out.
 *
 *   npm run parse -- "Physics MJ25 21"              # print a report
 *   npm run parse -- "Physics MJ25 21" --out r.md   # save it instead
 *   npm run parse -- "Physics MJ25 21" --json p.json
 *   npm run parse -- --all --out reports/           # every paper
 *   npm run parse -- --list
 *
 * A directory target writes both formats side by side:
 *   reports/md/<paper>.md      readable report, JSON embedded at the end
 *   reports/json/<paper>.json  the raw object, for diffing and jq
 * Pass --no-json to keep the .md lean once you're using the json/ copies.
 *
 * A folder is matched loosely, so "physics 21" finds "Physics MJ25 21".
 * Paths outside the default directory work too — pass a real path.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../src/latex/index.js';
import { renderReport } from '../src/latex/report.js';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = resolve(here, '..', '..', 'Updated Latex FIles For Web');

interface Args {
  target: string | null;
  out: string | null;
  json: string | null;
  all: boolean;
  list: boolean;
  /** Append the raw JSON to the saved report. On by default. */
  includeJson: boolean;
  /** Also print the JSON when writing to the console. */
  showJson: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    target: null,
    out: null,
    json: null,
    all: false,
    list: false,
    includeJson: true,
    showJson: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--list') args.list = true;
    else if (a === '--no-json') args.includeJson = false;
    else if (a === '--show-json') args.showJson = true;
    else if (a === '--out') args.out = argv[++i] ?? null;
    else if (a === '--json') args.json = argv[++i] ?? null;
    else if (!a.startsWith('--')) args.target = args.target ? `${args.target} ${a}` : a;
  }
  return args;
}

function paperFolders(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => statSync(join(root, d)).isDirectory())
    .filter((d) => readdirSync(join(root, d)).some((f) => f.endsWith('.tex')))
    .sort();
}

/**
 * Find the QP and QA files in a folder.
 *
 * Matching is on the QP/QA marker rather than a fixed name, because the
 * real filenames vary ("Add Maths S25QA11 .tex" has a stray space).
 */
function findPair(dir: string): { qp: string; qa: string | null } | null {
  const tex = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.tex'));
  const qp = tex.find((f) => /qp/i.test(f));
  const qa = tex.find((f) => /qa/i.test(f));
  if (!qp) return null;
  return { qp: join(dir, qp), qa: qa ? join(dir, qa) : null };
}

/** Loose folder match, so partial names and different casing both work. */
function resolveTarget(target: string): string | null {
  if (existsSync(target) && statSync(target).isDirectory()) return target;

  const folders = paperFolders(DEFAULT_DIR);
  const exact = folders.find((f) => f.toLowerCase() === target.toLowerCase());
  if (exact) return join(DEFAULT_DIR, exact);

  const words = target.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = folders.filter((f) => words.every((w) => f.toLowerCase().includes(w)));
  if (hits.length === 1) return join(DEFAULT_DIR, hits[0]);
  if (hits.length > 1) {
    console.error(`"${target}" matches ${hits.length} folders:\n  ${hits.join('\n  ')}`);
    process.exit(1);
  }
  return null;
}

/**
 * Assemble the saved file.
 *
 * For `.md` the readable report goes inside a fence — it relies on column
 * alignment and box characters that markdown would otherwise reflow — and
 * the JSON follows in its own ```json block so editors fold and highlight
 * it. For any other extension both are written plainly.
 */
function buildDocument(
  title: string,
  report: string,
  json: unknown,
  includeJson: boolean,
  markdown: boolean,
): string {
  if (!markdown) {
    if (!includeJson) return report;
    return `${report}\n${'='.repeat(64)}\nJSON\n${'='.repeat(64)}\n\n${JSON.stringify(json, null, 2)}\n`;
  }

  const parts = [`# ${title.split('\n')[0]}`, '', '```text', report.trimEnd(), '```'];
  if (includeJson) {
    parts.push(
      '',
      '## JSON',
      '',
      'This is the actual parser output — what would be stored.',
      '',
      '```json',
      JSON.stringify(json, null, 2),
      '```',
    );
  }
  return `${parts.join('\n')}\n`;
}

function run(dir: string): { report: string; json: unknown; warnings: number; title: string } {
  const pair = findPair(dir);
  if (!pair) throw new Error(`No .tex file with "QP" in its name found in ${dir}`);

  const qp = parseQuestionPaper(readFileSync(pair.qp, 'utf8'));
  // A questions file with no answers yet is a supported state, not an error.
  const merged = pair.qa ? mergePaper(qp, parseAnswerPaper(readFileSync(pair.qa, 'utf8'))) : qp;

  const title = pair.qa
    ? `${basename(dir)}\n${basename(pair.qp)}  +  ${basename(pair.qa)}`
    : `${basename(dir)}\n${basename(pair.qp)}  (no answers file found)`;

  return {
    report: renderReport(merged, { title }),
    json: merged,
    warnings: merged.warnings.length,
    title,
  };
}

function writeOut(target: string, name: string, body: string, isDir: boolean): string {
  const path = isDir ? join(target, name) : target;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
  return path;
}

const args = parseArgs(process.argv.slice(2));
const folders = paperFolders(DEFAULT_DIR);

if (args.list || (!args.target && !args.all)) {
  console.log(`Papers in ${DEFAULT_DIR}:\n`);
  for (const f of folders) console.log(`  ${f}`);
  console.log('\nUsage:');
  console.log('  npm run parse -- "Physics MJ25 21"                  print the report');
  console.log('  npm run parse -- "physics 21" --show-json           ...and the JSON');
  console.log('  npm run parse -- "physics 21" --out report.md       save report + JSON');
  console.log('  npm run parse -- "physics 21" --out r.md --no-json  save report only');
  console.log('  npm run parse -- --all --out reports/               every paper');
  console.log('  npm run parse -- "physics 21" --json paper.json     JSON on its own');
  console.log('');
  console.log('A directory target writes reports/md/*.md and reports/json/*.json.');
  process.exit(0);
}

const targets = args.all
  ? folders.map((f) => join(DEFAULT_DIR, f))
  : [resolveTarget(args.target!)].filter((t): t is string => t !== null);

if (targets.length === 0) {
  console.error(`No paper folder matching "${args.target}". Try --list.`);
  process.exit(1);
}

// With --all, --out/--json name a directory; with one paper they name a file.
const outIsDir = args.all || (args.out?.endsWith('/') ?? false);
let totalWarnings = 0;

for (const dir of targets) {
  const { report, json, warnings, title } = run(dir);
  totalWarnings += warnings;

  if (args.out) {
    if (outIsDir) {
      // A directory target splits the two formats: md/ to read, json/ to
      // diff, grep and pipe through jq. The .md still embeds its JSON
      // unless --no-json, so a single file stays self-contained.
      const mdPath = join(args.out, 'md', `${basename(dir)}.md`);
      const jsonPath = join(args.out, 'json', `${basename(dir)}.json`);
      mkdirSync(dirname(mdPath), { recursive: true });
      mkdirSync(dirname(jsonPath), { recursive: true });
      writeFileSync(mdPath, buildDocument(title, report, json, args.includeJson, true), 'utf8');
      writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
      console.log(
        `${basename(dir).padEnd(22)} -> ${mdPath}\n${' '.repeat(22)} -> ${jsonPath}  (${warnings} warning${warnings === 1 ? '' : 's'})`,
      );
    } else {
      const document = buildDocument(title, report, json, args.includeJson, args.out.endsWith('.md'));
      writeOut(args.out, `${basename(dir)}.md`, document, false);
      console.log(`${basename(dir).padEnd(22)} -> ${args.out}  (${warnings} warning${warnings === 1 ? '' : 's'})`);
    }
  } else {
    console.log(report);
    if (args.showJson) console.log(JSON.stringify(json, null, 2));
  }

  if (args.json) {
    const path = writeOut(args.json, `${basename(dir)}.json`, JSON.stringify(json, null, 2), args.all || args.json.endsWith('/'));
    console.log(`${basename(dir).padEnd(22)} -> ${path}`);
  }
}

if (args.all) console.log(`\n${targets.length} papers, ${totalWarnings} warnings total.`);
