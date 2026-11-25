/**
 * The element commands: read for what they ARE, not for how they look.
 *
 * Everything else in a paper is expanded from its own definition. These few
 * carry the structure (a line, an option, an answer line, a figure), which
 * their definitions, being about placement, do not say.
 */

import { readGroup, readOptional } from '../latex/scan.js';
import { dropComments } from './macros.js';

export type Role =
  | 'line' // a paragraph, or the first line of one
  | 'positioned' // pieces placed one by one
  | 'option' // one option of a multiple-choice question
  | 'options' // four options in a row
  | 'answer' // a dotted line to write on
  | 'mark' // marks on a line of their own
  | 'figure' // a region of the source PDF
  | 'total' // the end of a question
  | 'page' // a page break
  | 'skip'; // prints nothing a student reads

export interface RoleSpec {
  role: Role;
  args: number;
  /** Takes a leading [option]. */
  optional?: boolean;
  /** Which argument is the text, the left edge, the label. */
  text?: number;
  x?: number;
  label?: number;
}

/** Left edges of the elements that do not state theirs. */
export const COLUMN = { body: 72.3, option: 93.6, right: 545.7 };

export const ROLES: Record<string, RoleSpec> = {
  mcq: { role: 'line', args: 3, label: 1, text: 2 },
  stem: { role: 'line', args: 2, text: 1 },
  row: { role: 'line', args: 3, x: 1, text: 2 },
  prow: { role: 'line', args: 3, x: 1, text: 2 },
  freerow: { role: 'positioned', args: 2, text: 1 },
  choice: { role: 'option', args: 3, label: 1, text: 2 },
  optrow: { role: 'options', args: 5 },
  dotline: { role: 'answer', args: 5, x: 1, text: 2 },
  qmark: { role: 'mark', args: 2, text: 1 },
  qfig: { role: 'figure', args: 6, optional: true },
  total: { role: 'total', args: 1 },
  newpage: { role: 'page', args: 0 },
  clearpage: { role: 'page', args: 0 },
  swpage: { role: 'page', args: 0 },
  partbreak: { role: 'skip', args: 0 },
  pagestart: { role: 'skip', args: 0 },
  gap: { role: 'skip', args: 1 },
  hang: { role: 'skip', args: 1 },
  dotgrid: { role: 'skip', args: 3 },
  swtotalas: { role: 'skip', args: 1 },
  normalsize: { role: 'skip', args: 0 },
};

export interface Element {
  name: string;
  spec: RoleSpec;
  args: string[];
  optional: string | null;
}

export type Token = Element | { name: 'text'; raw: string };

export const isElement = (t: Token): t is Element => t.name !== 'text';

/** Cut a question body into its elements, keeping loose text between them. */
export function tokenize(body: string): Token[] {
  const src = dropComments(body);
  const out: Token[] = [];
  let text = '';
  const flush = () => {
    if (text.trim()) out.push({ name: 'text', raw: text.trim() });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    const m = src[i] === '\\' ? /^\\([a-zA-Z]+)/.exec(src.slice(i, i + 24)) : null;
    const spec = m && Object.hasOwn(ROLES, m[1]) ? ROLES[m[1]] : null;
    const read = m && spec ? readArgs(src, i + m[0].length, spec) : null;
    if (m && spec && read) {
      flush();
      out.push({ name: m[1], spec, args: read.args, optional: read.optional });
      i = read.end;
      continue;
    }
    // A command and the sign after its backslash go over together.
    const step = m ? m[0].length : src[i] === '\\' ? 2 : 1;
    text += src.slice(i, i + step);
    i += step;
  }
  flush();
  return out;
}

function readArgs(src: string, from: number, spec: RoleSpec): { args: string[]; optional: string | null; end: number } | null {
  let i = from;
  let optional: string | null = null;
  const opt = spec.optional ? readOptional(src, i) : null;
  if (opt) {
    optional = opt.value;
    i = opt.end;
  }
  const args: string[] = [];
  for (let n = 0; n < spec.args; n++) {
    while (/\s/.test(src[i] ?? '')) i++;
    const g = readGroup(src, i);
    if (!g) {
      // \total takes its argument only in some papers.
      if (spec.role === 'total') return { args, optional, end: from };
      return null;
    }
    args.push(g.value);
    i = g.end;
  }
  return { args, optional, end: i };
}
