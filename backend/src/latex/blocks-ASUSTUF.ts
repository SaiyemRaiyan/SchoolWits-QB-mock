/**
 * Splitting a document body into per-question blocks, and reading the
 * `\examq` header.
 *
 * `\examq{paper-id}{number}{topics}{marks}` is the ONLY question delimiter
 * (templates/README.md). Everything from one call to the next belongs to
 * that question. The old parser tried five different extraction strategies
 * in a fallback cascade because it accepted several dialects; this one
 * accepts the documented format, which is what makes it simple enough to
 * reason about.
 */

import { findCommand } from './scan.js';
import type { PaperMeta } from './types.js';

export interface QuestionBlock {
  number: number;
  paperId: string;
  topicsRaw: string;
  marksRaw: string;
  /** Everything between this \examq and the next (or end of document). */
  body: string;
}

/**
 * Decompose `5054/21/M/J/25`.
 *
 * The middle segment packs paper and variant into two digits: "21" is
 * paper 2, variant 1. Returns null when the shape doesn't match, so the
 * caller can warn rather than emit a half-filled record.
 */
export function parsePaperId(paperId: string): PaperMeta | null {
  const parts = paperId.trim().split('/');
  if (parts.length < 3) return null;

  const subjectCode = parts[0].trim();
  const pv = parts[1].trim();
  const year = parts[parts.length - 1].trim();
  const session = parts.slice(2, parts.length - 1).join('/').trim();

  if (!/^\d+$/.test(subjectCode) || !/^\d{1,2}$/.test(pv)) return null;

  // A single digit means paper only, no variant (rare, but harmless to allow).
  const paper = pv.length === 2 ? pv[0] : pv;
  const variant = pv.length === 2 ? pv[1] : '';

  return {
    paperId: paperId.trim(),
    subjectCode,
    paper,
    variant,
    session,
    // Source years are two-digit; everything here is 20xx.
    year: /^\d{2}$/.test(year) ? `20${year}` : year,
  };
}

/**
 * Split a topic string on `\textperiodcentered`.
 *
 * Maths D 4024/22 writes `\,\textperiodcentered\,` in the answer file and
 * `\textperiodcentered\` in the question file for the same questions
 * (templates/README.md, issue 4). Both collapse to the same list here, so
 * the QP/QA join survives that inconsistency instead of silently dropping
 * two questions.
 */
export function splitTopics(raw: string): string[] {
  // The optional `\,` thin spaces on either side are what differ between the
  // two Maths D files; both forms have to collapse to the same split. The
  // leading group must stay optional — `\textperiodcentered` brings its own
  // backslash, so requiring one here would swallow it and never match.
  return raw
    .split(/(?:\\,)?\s*\\textperiodcentered\s*(?:\\,|\\)?/)
    .map((t) =>
      t
        .replace(/^[\s\\,]+|[\s\\,]+$/g, '')
        .replace(/\\&/g, '&')
        .trim(),
    )
    .filter((t) => t.length > 0);
}

/** Marks as an integer; 0 when the field isn't numeric. */
export function parseMarks(raw: string): number {
  const m = /-?\d+/.exec(raw ?? '');
  return m ? Number(m[0]) : 0;
}

/**
 * Pull `[2]`-style mark tags out of a run, e.g. from \Alines{3}{[1]}.
 * Returns the number only; the brackets are presentation.
 */
export function parseMarkTag(raw: string): number | null {
  const m = /\[\s*(\d+)\s*\]/.exec(raw ?? '');
  return m ? Number(m[1]) : null;
}

/** Split a document body into question blocks on `\examq`. */
export function splitQuestions(body: string): QuestionBlock[] {
  const calls = findCommand(body, 'examq', 4);
  return calls.map((call, i) => {
    const next = i + 1 < calls.length ? calls[i + 1].start : body.length;
    return {
      number: parseMarks(call.args[1]),
      paperId: call.args[0].trim(),
      topicsRaw: call.args[2],
      marksRaw: call.args[3],
      body: body.slice(call.end, next),
    };
  });
}
