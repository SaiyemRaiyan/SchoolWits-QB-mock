/**
 * A human-readable report of what the parser made of a paper.
 *
 * This exists to be *read*, not consumed — it's the fastest way to see
 * whether a new paper parsed sensibly before trusting it. The JSON is the
 * real output; this is a view onto it.
 *
 * Kept free of console/fs calls so it can be tested and reused; the CLI in
 * scripts/parse-paper.ts decides where the text goes.
 */

import type { Block, ParsedPaper, Part, Question } from './types.js';

/** Strip HTML tags for the plain-text view, keeping the math visible. */
function flatten(html: string, limit = 100): string {
  const text = html
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function describeBlock(block: Block, indent: string): string {
  switch (block.type) {
    case 'text':
      return `${indent}text   ${flatten(block.html)}`;
    case 'figure':
      // The resolved/unresolved distinction matters: most figures are
      // missing from the source folders, which is expected, not an error.
      return `${indent}figure ${block.file} ${block.src ? '[resolved]' : '[no image supplied]'}${
        block.caption ? ` "${flatten(block.caption, 40)}"` : ''
      }`;
    case 'table':
      return `${indent}table  ${flatten(block.html, 80)}`;
  }
}

function describePart(part: Part, indent: string): string[] {
  const lines: string[] = [];
  const marks = part.marks === null ? '?' : part.marks;
  const space = part.answerSpace
    ? part.answerSpace.kind === 'lines'
      ? `${part.answerSpace.lines} ruled lines`
      : part.answerSpace.kind === 'value'
        ? `value "${flatten(part.answerSpace.label, 24)}"${part.answerSpace.unit ? ` (${part.answerSpace.unit})` : ''}`
        : 'mark tag only'
    : 'no answer space';

  lines.push(`${indent}${part.ref}  [${marks} mark${marks === 1 ? '' : 's'}]  ${space}`);
  for (const block of part.content) lines.push(describeBlock(block, `${indent}    `));
  for (const sub of part.subparts) lines.push(...describePart(sub, `${indent}  `));
  return lines;
}

function describeQuestion(q: Question): string[] {
  const lines: string[] = [];
  lines.push('');
  lines.push(`── Q${q.number} ${'─'.repeat(Math.max(0, 60 - String(q.number).length))}`);
  lines.push(`   kind   ${q.kind}`);
  lines.push(`   topics ${q.topics.join(' · ')}`);
  lines.push(`   marks  ${q.marks}`);

  if (q.stem.length > 0) {
    lines.push('   stem');
    for (const block of q.stem) lines.push(describeBlock(block, '     '));
  }

  if (q.parts.length > 0) {
    lines.push('   parts');
    for (const part of q.parts) lines.push(...describePart(part, '     '));
  }

  if (q.options) {
    lines.push(`   options (${q.options.source})`);
    if (q.options.items.length === 0) {
      lines.push('     !! none extractable — the options exist only inside the figure image');
    }
    for (const item of q.options.items) {
      lines.push(`     ${item.label}. ${flatten(item.content, 70)}`);
    }
  }

  const answer = q.answer;
  if (!answer) {
    lines.push('   answer !! no matching question in the answers file');
    return lines;
  }

  if (answer.correct) lines.push(`   correct option: ${answer.correct}`);

  if (answer.markScheme.length > 0) {
    const total = answer.markScheme.reduce((a, r) => a + r.marks, 0);
    lines.push(`   mark scheme (${answer.markScheme.length} rows, ${total} marks)`);
    for (const row of answer.markScheme) {
      if (row.banner) {
        lines.push(`     ${(row.ref || '—').padEnd(10)} ▸ ${flatten(row.answer, 60)}`);
        continue;
      }
      const ref = row.ref || '!! UNATTACHED';
      lines.push(`     ${ref.padEnd(10)} ${row.code.padEnd(5)} ${flatten(row.answer, 62)}`);
      if (row.guidance) lines.push(`     ${' '.repeat(10)}       guidance: ${flatten(row.guidance, 56)}`);
      for (const alt of row.alternatives.slice(1)) {
        lines.push(`     ${' '.repeat(10)}       or: ${flatten(alt, 60)}`);
      }
    }
  }

  if (answer.workedSolution.length > 0) {
    lines.push(`   worked solution (${answer.workedSolution.length} segments)`);
    for (const seg of answer.workedSolution) {
      const ref = seg.ref ?? '—';
      lines.push(`     ${ref.padEnd(10)} ${seg.heading ? `${flatten(seg.heading, 40)}: ` : ''}${flatten(seg.html, 60)}`);
    }
  }

  return lines;
}

export interface ReportOptions {
  /** Shown in the header so a saved report says what it came from. */
  title?: string;
}

export function renderReport(paper: ParsedPaper, options: ReportOptions = {}): string {
  const lines: string[] = [];
  const p = paper.paper;

  lines.push('='.repeat(64));
  if (options.title) lines.push(options.title);
  lines.push(
    p
      ? `${p.paperId}   subject code ${p.subjectCode} · paper ${p.paper} · variant ${p.variant} · ${p.session} ${p.year}`
      : '!! paper id could not be read',
  );
  lines.push('='.repeat(64));

  // Totals first: this is the part worth scanning before reading detail.
  const totalMarks = paper.questions.reduce((a, q) => a + q.marks, 0);
  const msRows = paper.questions.reduce((a, q) => a + (q.answer?.markScheme.length ?? 0), 0);
  const unattached = paper.questions.reduce(
    (a, q) => a + (q.answer?.markScheme.filter((r) => !r.ref && !r.banner).length ?? 0),
    0,
  );
  const figures = paper.questions.reduce(
    (a, q) =>
      a +
      q.stem.filter((b) => b.type === 'figure').length +
      q.parts.reduce(
        (b, p2) =>
          b +
          p2.content.filter((x) => x.type === 'figure').length +
          p2.subparts.reduce((c, s) => c + s.content.filter((x) => x.type === 'figure').length, 0),
        0,
      ),
    0,
  );

  lines.push(`questions        ${paper.questions.length}`);
  lines.push(`  structured     ${paper.questions.filter((q) => q.kind === 'structured').length}`);
  lines.push(`  multiple choice${' '.repeat(1)}${paper.questions.filter((q) => q.kind === 'mcq').length}`);
  lines.push(`total marks      ${totalMarks}`);
  lines.push(`figures          ${figures}`);
  lines.push(`mark scheme rows ${msRows}`);
  lines.push(`  unattached     ${unattached}${unattached ? '   << rows not keyed to any part' : ''}`);
  lines.push(`warnings         ${paper.warnings.length}`);

  if (paper.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS');
    for (const w of paper.warnings) lines.push(`  [${w.code}] ${w.message}`);
  }

  for (const q of paper.questions) lines.push(...describeQuestion(q));

  lines.push('');
  return lines.join('\n');
}
