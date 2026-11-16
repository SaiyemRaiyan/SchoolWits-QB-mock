/**
 * Refuse to pass off garbage as a parsed paper.
 *
 * The parser drops commands it does not know and keeps their arguments. For
 * a file in the documented format that is harmless; for a file in another
 * format it turns every measurement into "text" and the result looks like a
 * successful parse. These checks name that situation so the upload can stop.
 */

import type { Block, Part, Question, Warning, WarningCode } from './types.js';

/** Warnings that mean "do not save this", as opposed to "check this". */
const BLOCKING: WarningCode[] = ['unsupported-layout', 'garbled-text'];

export function isBlocking(warning: Warning): boolean {
  return BLOCKING.includes(warning.code);
}

// The page-layout dialect: every element carries its measured position.
const LAYOUT_COMMAND = /\\(?:mcq|stem|choice|optrow|freerow|row|dotline|dotgrid|at|lab)\s*\{/g;
// A handful could be coincidence; a layout file has hundreds.
const LAYOUT_THRESHOLD = 5;

/** Flags a file written in the page-layout dialect rather than the documented one. */
export function detectLayoutDialect(body: string): Warning | null {
  const hits = body.match(LAYOUT_COMMAND)?.length ?? 0;
  if (hits < LAYOUT_THRESHOLD) return null;
  return {
    code: 'unsupported-layout',
    message:
      `This file positions its text on the page (${hits} commands such as \\mcq, \\row, \\at) ` +
      'instead of using the documented question format, so the text cannot be read reliably. ' +
      'It cannot be saved. See templates/README.md for the format the site accepts.',
  };
}

/** Visible text only: tags gone, and maths gone since it may hold anything. */
function visibleText(html: string): string {
  return html
    .replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

// "4.91bp" never appears in a real question; it is a TeX length that leaked.
const LEAKED_LENGTH = /\d(?:\.\d+)?bp\b/;

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
      'The file is not in a format the parser understands, so it cannot be saved.',
  };
}
