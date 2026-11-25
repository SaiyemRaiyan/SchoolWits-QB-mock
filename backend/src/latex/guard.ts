/**
 * Refuse to pass off garbage as a parsed paper.
 *
 * The parser drops commands it does not know and keeps their arguments. For
 * a file in the documented format that is harmless; for a file in another
 * format it turns every measurement into "text" and the result looks like a
 * successful parse. These checks name that situation so the admin sees it.
 *
 * They warn and never refuse: whether to save is the admin's decision.
 */

import type { Block, Part, Question, Warning, WarningCode } from './types.js';

/** Warnings that mean some text or maths is probably wrong. None stop a save. */
const SERIOUS: WarningCode[] = ['unsupported-layout', 'garbled-text'];

export function isSerious(warning: Warning): boolean {
  return SERIOUS.includes(warning.code);
}

// The page-layout dialect: every element carries its measured position.
const LAYOUT_COMMAND = /\\(?:mcq|stem|choice|optrow|freerow|row|dotline|dotgrid|at|lab)\s*\{/g;
// A handful could be coincidence; a layout file has hundreds.
const LAYOUT_THRESHOLD = 5;

/** Is this file written in the page-layout dialect? See layout.ts. */
export function isLayoutDialect(body: string): boolean {
  return (body.match(LAYOUT_COMMAND)?.length ?? 0) >= LAYOUT_THRESHOLD;
}

const list = (numbers: number[]) =>
  numbers.slice(0, 10).map((n) => `Q${n}`).join(', ') + (numbers.length > 10 ? ', …' : '');

/** Layout questions whose maths is drawn from images or paths: not readable. */
export function unreadableMaths(numbers: number[], unknown: string[]): Warning | null {
  if (numbers.length === 0 && unknown.length === 0) return null;
  const why = [
    numbers.length
      ? `${numbers.length} question${numbers.length === 1 ? '' : 's'} (${list(numbers)}) contain ` +
        'maths drawn from symbol images or paths, which cannot be read as an equation'
      : '',
    unknown.length ? `commands the parser does not know (${unknown.slice(0, 8).map((c) => `\\${c}`).join(', ')})` : '',
  ].filter(Boolean);
  return {
    code: 'unsupported-layout',
    message: `Some of this paper will be wrong: ${why.join('; and ')}.`,
  };
}

/** Layout questions rebuilt from positioned pieces: readable, but check them. */
export function positionedMaths(numbers: number[]): Warning | null {
  if (numbers.length === 0) return null;
  return {
    code: 'positioned-maths',
    message:
      `${list(numbers)}: a line was rebuilt from pieces placed on the page (fractions, options in a row). ` +
      'Check these against the paper before saving.',
  };
}

/** Visible text only: tags gone, and maths gone since it may hold anything. */
function visibleText(html: string): string {
  return html
    .replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

// "4.91bp" and "0pt" never appear in a real question; they are leaked TeX lengths.
const LEAKED_LENGTH = /\d(?:\.\d+)?(?:bp|pt)\b/;

function blocksText(blocks: Block[]): string {
  return blocks.map((b) => (b.type === 'figure' ? b.caption : b.html)).join(' ');
}

function partsText(parts: Part[]): string {
  return parts.map((p) => `${blocksText(p.content)} ${partsText(p.subparts)}`).join(' ');
}

/** Flags questions whose text contains leaked layout measurements. */
export function detectGarbledText(questions: Question[]): Warning | null {
  const bad = questions
    .filter((q) => {
      const options = q.options?.items.map((o) => o.content).join(' ') ?? '';
      return LEAKED_LENGTH.test(visibleText(`${blocksText(q.stem)} ${partsText(q.parts)} ${options}`));
    })
    .map((q) => q.number);
  if (bad.length === 0) return null;

  const shown = bad.slice(0, 8).map((n) => `Q${n}`).join(', ');
  return {
    code: 'garbled-text',
    message:
      `${bad.length} question${bad.length === 1 ? '' : 's'} (${shown}${bad.length > 8 ? ', …' : ''}) ` +
      'contain layout measurements such as "4.91bp" where text should be. ' +
      'The file is not in a format the parser fully understands.',
  };
}
