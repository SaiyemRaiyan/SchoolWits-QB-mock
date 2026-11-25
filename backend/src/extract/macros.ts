/**
 * The paper's own commands, read from its preamble.
 *
 * Every paper defines the commands it uses, in terms of a few primitives
 * (raise, shift, set in a font, cut from the PDF). Reading those definitions
 * is what lets a new paper bring a new command without a change here.
 */

import { readGroup, readOptional } from '../latex/scan.js';

export interface Macro {
  /** Mandatory and optional arguments together, as in \newcommand's [n]. */
  args: number;
  /** The default of a leading optional argument, or null when it has none. */
  optional: string | null;
  body: string;
  /**
   * For a \def with delimited parameters (`#1/#2\relax#3`): the text before
   * the first parameter, then the text that ends each one ('' = none).
   */
  delimiters?: string[];
}

/** A comment ends its line AND the line break: `{%` must not print a space. */
export function dropComments(src: string): string {
  return src.replace(/(?<!\\)((?:\\\\)*)%[^\n]*(?:\n[ \t]*|$)/g, '$1');
}

const DEFINITION =
  /\\(?:(newcommand|renewcommand|providecommand|DeclareRobustCommand)\*?|([gex]?def)|(let))(?![a-zA-Z@])/g;
// The name of a command: letters (and @, which a preamble makes a letter), or one sign.
const NAME = /\\([a-zA-Z@]+|[^a-zA-Z])/y;

export class MacroTable {
  private readonly table = new Map<string, Macro>();

  /** Lengths the preamble sets, e.g. the paper's word space. In bp. */
  readonly lengths = new Map<string, number>();

  static fromPreamble(preamble: string): MacroTable {
    const table = new MacroTable();
    table.scan(dropComments(preamble));
    return table;
  }

  has(name: string): boolean {
    return this.table.has(name.replace(/^\\/, ''));
  }

  get(name: string): Macro | undefined {
    return this.table.get(name.replace(/^\\/, ''));
  }

  /**
   * Conditionals are not evaluated: a definition inside one is taken, and the
   * last one wins, which is what a preamble that overrides itself means.
   */
  private scan(src: string): void {
    for (const m of src.matchAll(/\\([a-zA-Z@]+)=(-?[\d.]+)bp(?![a-zA-Z])/g)) {
      if (!this.lengths.has(m[1])) this.lengths.set(m[1], Number(m[2]));
    }
    DEFINITION.lastIndex = 0;
    for (let m = DEFINITION.exec(src); m; m = DEFINITION.exec(src)) {
      let at = m.index + m[0].length;
      const read = m[1] ? this.command(src, at) : m[2] ? this.def(src, at) : this.alias(src, at);
      if (read) at = read;
      // Past the body, so a definition INSIDE a body is not mistaken for ours.
      DEFINITION.lastIndex = at;
    }
  }

  private name(src: string, from: number): { name: string; end: number } | null {
    let i = from;
    while (/\s/.test(src[i] ?? '')) i++;
    const braced = src[i] === '{';
    if (braced) i++;
    while (/\s/.test(src[i] ?? '')) i++;
    NAME.lastIndex = i;
    const m = NAME.exec(src);
    if (!m) return null;
    i += m[0].length;
    if (braced) {
      while (/\s/.test(src[i] ?? '')) i++;
      if (src[i] !== '}') return null;
      i++;
    }
    return { name: m[1], end: i };
  }

  /** \newcommand{\name}[2][default]{body} */
  private command(src: string, from: number): number | null {
    const named = this.name(src, from);
    if (!named) return null;
    let i = named.end;
    const skip = () => {
      while (/\s/.test(src[i] ?? '')) i++;
    };
    skip();
    const count = readOptional(src, i);
    if (count) i = count.end;
    skip();
    const first = count ? readOptional(src, i) : null;
    if (first) i = first.end;
    skip();
    const body = readGroup(src, i);
    if (!body) return null;
    this.table.set(named.name, {
      args: count ? Number(count.value) || 0 : 0,
      optional: first ? first.value : null,
      body: body.value,
    });
    return body.end;
  }

  /** \def\name#1/#2\relax{body} */
  private def(src: string, from: number): number | null {
    const named = this.name(src, from);
    if (!named) return null;
    const open = src.indexOf('{', named.end);
    if (open === -1) return null;
    const body = readGroup(src, open);
    if (!body) return null;
    const pattern = src.slice(named.end, open).split(/#\d/);
    const macro: Macro = { args: pattern.length - 1, optional: null, body: body.value };
    if (pattern.some((p) => p !== '')) macro.delimiters = pattern;
    this.table.set(named.name, macro);
    return body.end;
  }

  /** \let\a=\b copies b's definition as it stands now. */
  private alias(src: string, from: number): number | null {
    const left = this.name(src, from);
    if (!left) return null;
    let i = left.end;
    while (/[\s=]/.test(src[i] ?? '')) i++;
    const right = this.name(src, i);
    if (!right) return i;
    const known = this.table.get(right.name);
    if (known) this.table.set(left.name, known);
    return right.end;
  }
}
