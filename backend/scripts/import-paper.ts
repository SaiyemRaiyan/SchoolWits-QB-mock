#!/usr/bin/env node
/**
 * Parse a paper folder and write it to Supabase.
 *
 *   npm run import -- "Physics MJ25 21"
 *   npm run import -- --all
 *   npm run import -- "physics 21" --dry-run     parse + report, write nothing
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (backend/.env). The
 * service role bypasses RLS, which is what lets this run without a logged-in
 * admin — it is why this script is terminal-only and the key must never
 * reach a browser.
 *
 * Order matters and is not arbitrary: figures upload FIRST, because their
 * public URLs are an INPUT to the parse. The parser resolves \qfig against
 * the { filename: url } map and writes real URLs into the content, so
 * nothing has to rewrite image paths afterwards.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServiceRoleClient } from '../src/client.js';
import { SchoolWitsDB, type PaperMeta, type QuestionRow } from '../src/db.js';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../src/latex/index.js';
import type { Block, ImageMap, ParsedPaper, Part, Question } from '../src/latex/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '..', '..');
const PAPERS_DIR = join(REPO, 'Updated Latex FIles For Web');

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/** Load the repo's .env without adding a dependency for it. */
function loadEnv(): void {
  const path = join(REPO, 'backend', '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

function findPair(dir: string): { qp: string; qa: string | null } | null {
  const tex = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.tex'));
  const qp = tex.find((f) => /qp/i.test(f));
  const qa = tex.find((f) => /qa/i.test(f));
  if (!qp) return null;
  return { qp: join(dir, qp), qa: qa ? join(dir, qa) : null };
}

function figureFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => MIME[extname(f).toLowerCase()]);
}

/**
 * Flatten a question to plain text for the search vector.
 *
 * Body text now lives inside content's block tree, so without this a
 * question would only be findable by its topic and ref. Math is dropped
 * rather than indexed — "$\frac{1}{2}$" makes no useful search terms.
 */
function flattenQuestion(q: Question): string {
  const out: string[] = [];

  const fromBlocks = (blocks: Block[] | undefined) => {
    for (const b of blocks ?? []) {
      if (b.type === 'text') out.push(b.html);
      else if (b.type === 'figure' && b.caption) out.push(b.caption);
      else if (b.type === 'table') out.push(b.html);
    }
  };
  const fromParts = (parts: Part[] | undefined) => {
    for (const p of parts ?? []) {
      fromBlocks(p.content);
      fromParts(p.subparts);
    }
  };

  fromBlocks(q.stem);
  fromParts(q.parts);
  for (const item of q.options?.items ?? []) out.push(item.content);
  for (const row of q.answer?.markScheme ?? []) out.push(row.answer);
  for (const seg of q.answer?.workedSolution ?? []) {
    if (seg.heading) out.push(seg.heading);
    out.push(seg.html);
  }

  return out
    .join(' ')
    .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]*\$|\\\([\s\S]*?\\\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

function toPaperMeta(paper: NonNullable<ParsedPaper['paper']>, subject: string): PaperMeta {
  return {
    subject,
    subjectCode: paper.subjectCode,
    paper: paper.paper,
    variant: paper.variant,
    session: paper.session,
    year: paper.year,
  };
}

/**
 * Subject name is not in the .tex — \examq carries only the syllabus code.
 * The folder name is the only place it appears, so it is read from there.
 */
function subjectFromFolder(name: string): string {
  return name.replace(/\s*(MJ|ON|FM)?\d{2,}.*$/i, '').trim() || name;
}

async function importFolder(dir: string, dryRun: boolean): Promise<number> {
  const name = basename(dir);
  const pair = findPair(dir);
  if (!pair) throw new Error(`No QP .tex in ${dir}`);

  const db = dryRun ? null : new SchoolWitsDB(createServiceRoleClient());

  // --- 1. parse once with no images, purely to learn the paper's identity.
  // upsertPaper needs the paper row before figures can be attached to it.
  const probe = parseQuestionPaper(readFileSync(pair.qp, 'utf8'));
  if (!probe.paper) throw new Error(`${name}: could not read the paper id from \\examq`);
  const meta = toPaperMeta(probe.paper, subjectFromFolder(name));

  let images: ImageMap = {};
  let paperId: number | null = null;

  if (db) {
    const paper = await db.upsertPaper(meta);
    paperId = paper.id;

    // --- 2. figures to the bucket, collecting the map the parser needs.
    for (const file of figureFiles(dir)) {
      const bytes = readFileSync(join(dir, file));
      // The Blob must carry its own type: supabase-js sends a Blob as
      // multipart form data and takes the part's content type from the Blob
      // itself, so an untyped one arrives as application/octet-stream and
      // the bucket's MIME allow-list (0013) rejects it. figureFiles() only
      // returns extensions present in MIME, so this lookup always hits.
      const type = MIME[extname(file).toLowerCase()];
      const { publicUrl } = await db.uploadPaperImage(
        paper.id,
        paper.paper_key,
        file,
        new Blob([new Uint8Array(bytes)], { type }),
        type,
      );
      images[file] = publicUrl;
    }
  }

  // --- 3. the real parse, now with figures resolvable to bucket URLs.
  const parsed = mergePaper(
    parseQuestionPaper(readFileSync(pair.qp, 'utf8'), images),
    pair.qa
      ? parseAnswerPaper(readFileSync(pair.qa, 'utf8'), images)
      : { paper: null, byNumber: new Map(), warnings: [] },
  );

  const rows: QuestionRow[] = parsed.questions.map((q) => ({
    questionNumber: q.number,
    kind: q.kind,
    topics: q.topics,
    marks: q.marks,
    ref: `${probe.paper!.paperId} -- Q${q.number}`,
    qText: flattenQuestion(q),
    content: q as unknown as QuestionRow['content'],
  }));

  const figures = Object.keys(images).length;
  const warn = parsed.warnings.length;
  console.log(
    `${name.padEnd(20)} ${String(parsed.questions.length).padStart(2)} questions  ` +
      `${String(figures).padStart(2)} figures  ${warn} warning${warn === 1 ? '' : 's'}` +
      (dryRun ? '   [dry run — nothing written]' : ''),
  );
  for (const w of parsed.warnings) console.log(`${' '.repeat(22)}! ${w.code}: ${w.message}`);

  if (db && paperId !== null) await db.addQuestions(meta, rows);
  return warn;
}

loadEnv();

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const all = argv.includes('--all');
const target = argv.filter((a) => !a.startsWith('--')).join(' ');

const folders = readdirSync(PAPERS_DIR)
  .filter((d) => statSync(join(PAPERS_DIR, d)).isDirectory())
  .sort();

let chosen: string[];
if (all) {
  chosen = folders.map((f) => join(PAPERS_DIR, f));
} else if (target) {
  const words = target.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = folders.filter((f) => words.every((w) => f.toLowerCase().includes(w)));
  if (hits.length !== 1) {
    console.error(hits.length ? `"${target}" matches ${hits.length}` : `No paper matching "${target}".`);
    console.error(`\nAvailable:\n  ${folders.join('\n  ')}`);
    process.exit(1);
  }
  chosen = [join(PAPERS_DIR, hits[0])];
} else {
  console.log('Usage: npm run import -- "Physics MJ25 21" [--dry-run]   (or --all)\n');
  console.log(`Papers:\n  ${folders.join('\n  ')}`);
  process.exit(0);
}

let total = 0;
for (const dir of chosen) total += await importFolder(dir, dryRun);
console.log(`\n${chosen.length} paper${chosen.length === 1 ? '' : 's'}, ${total} warnings.`);
