/**
 * LaTeX -> placed pieces, by carrying out what the paper's own commands say.
 *
 * A small interpreter: the paper's macros are expanded from their definitions
 * until only primitives are left (kern, raise, box, set in a font, rule, cut
 * from the PDF), and those place pieces. So "f\kern-0.33bp orce" comes out as
 * one word and a subscript comes out as small print below the line, whatever
 * the command that made it was called.
 *
 * It sets a single line. Page-making (glue, penalties, skips, leaders) prints
 * nothing here. A command with no definition is reported and swallowed WITH
 * its arguments: a length leaking as text is worse than a gap that is flagged.
 */

import { parseClipOptions } from '../latex/clip.js';
import { readGroup, readOptional } from '../latex/scan.js';
import { accented, CHARACTERS, decode, MATH_CHARACTERS } from './encodings.js';
import { dropComments, MacroTable, type Macro } from './macros.js';
import { advance, type Family } from './metrics.js';
import type { Line, PathPiece, Piece, Problem, TextPiece } from './types.js';

/** A4, which every Cambridge paper is. Only a picture's size depends on it. */
const PAGE = { width: 595.276, height: 841.89 };

// Closer than this is the same word; a kern wider than it is a space. The
// paper's thin space between a number and its unit (0.125em) is a space.
export const WORD_GAP = 0.118;

const TO_BP: Record<string, number> = {
  bp: 1, pt: 72 / 72.27, in: 72, mm: 72 / 25.4, cm: 72 / 2.54, pc: 12 * (72 / 72.27), sp: 0, dd: 1.07,
};

interface Font {
  family: Family;
  /** Whether the family is a serif one the surrounding paper is not set in. */
  foreign: boolean;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/** Stretchable space, by strength: \hss and \hfil before \hfill. */
interface Glue {
  index: number;
  order: number;
}

interface Box {
  pieces: Piece[];
  width: number;
  glue: Glue[];
}

export class Typesetter {
  private readonly base: Font;
  readonly wordSpace: number;
  /** Baseline to baseline, for text that runs over a line break. */
  readonly leading: number;

  constructor(readonly macros: MacroTable) {
    const serif = /rmdefault/.test(macros.get('familydefault')?.body ?? '');
    const size = /\{([\d.]+)bp\}\s*\{([\d.]+)bp\}/.exec(macros.get('normalsize')?.body ?? '');
    this.base = {
      family: serif ? 'times' : 'helvetica',
      foreign: false,
      size: size ? Number(size[1]) : 11,
      bold: false,
      italic: false,
      underline: false,
    };
    this.leading = size ? Number(size[2]) : 13;
    this.wordSpace = macros.lengths.get('spaceskip') ?? advance(' ', this.base.size, this.base.family, false, false);
  }

  get size(): number {
    return this.base.size;
  }

  /** Text that runs over a line break comes out one leading lower per line. */
  line(tex: string): Line {
    const setter = new Setter(this, { ...this.base });
    setter.run(dropComments(tex));
    const { pieces } = setter.finish();
    return { pieces, size: commonSize(pieces) ?? this.base.size, ...(setter.problems.length ? { problems: setter.problems } : null) };
  }
}

function commonSize(pieces: Piece[]): number | null {
  const weight = new Map<number, number>();
  for (const p of pieces) {
    if (p.kind === 'text') weight.set(p.size, (weight.get(p.size) ?? 0) + p.text.trim().length);
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// ---- what each primitive takes ------------------------------------------

// Print nothing and take nothing.
const NOTHING = new Set([
  'relax', 'nobreak', 'allowbreak', 'strut', 'null', 'leavevmode', 'ignorespaces', 'noindent', 'protect',
  'selectfont', 'makeatletter', 'makeatother', 'pdfsave', 'pdfrestore', 'par', 'centering', 'raggedright',
  'smash', 'normalsize', 'small', 'footnotesize', 'noexpand', 'expandafter', 'global', 'ignorespacesafterend',
  'boldmath', 'unboldmath', 'displaystyle', 'textstyle', 'frenchspacing', 'sloppy', 'break', 'nolinebreak',
]);
// Take arguments and print nothing.
const SWALLOW: Record<string, number> = {
  vadjust: 1, pdfsetmatrix: 1, color: 1, vspace: 1, vphantom: 1, label: 1, detokenize: 1, setlength: 2,
  addtolength: 2, marks: 1, hypertarget: 2, fontencoding: 1, fontseries: 1, fontshape: 1, pagecolor: 1, smallskip: 0,
};
// Take arguments and print the last of them.
const WRAPPER: Record<string, number> = {
  mbox: 1, textcolor: 2, textls: 1, colorbox: 2, fbox: 1, textnormal: 1, textup: 1, ensurefont: 1, resizebox: 3,
  scalebox: 2, textlnum: 1, centerline: 1,
};
const FAMILIES: Record<string, Family> = {
  psy: 'symbol', pzd: 'dingbats', ptm: 'times', utm: 'times', pbk: 'times', pnc: 'times', ppl: 'times',
  cmr: 'times', phv: 'helvetica', uhv: 'helvetica', pag: 'helvetica',
};

class Setter {
  private font: Font;
  private x = 0;
  private y = 0;
  private lineStart = 0;
  private pieces: Piece[] = [];
  private glue: Glue[] = [];
  private input = '';
  private at = 0;
  /** \setbox0=..., \dimen0=...; shared by the boxes inside a line. */
  private boxes = new Map<string, Box>();
  private dimens = new Map<string, number>();
  private fonts = new Map<string, Family>();
  private steps = { left: 4000 };
  problems: Problem[] = [];

  constructor(
    private readonly setting: Typesetter,
    font: Font,
  ) {
    this.font = font;
  }

  finish(): Box {
    // Trailing word space is not part of what was printed.
    return { pieces: this.pieces.filter((p) => p.kind !== 'text' || p.text.trim() !== ''), width: this.x, glue: this.glue };
  }

  run(tex: string): void {
    const outer = { input: this.input, at: this.at };
    this.input = tex;
    this.at = 0;
    while (this.at < this.input.length) this.step();
    this.input = outer.input;
    this.at = outer.at;
  }

  /** A group: whatever it changes about the font ends with it. */
  private group(tex: string, change: Partial<Font> = {}, dy = 0): void {
    const font = this.font;
    const y = this.y;
    this.font = { ...font, ...change };
    this.y += dy;
    this.run(tex);
    this.font = font;
    this.y = y;
  }

  private box(tex: string, change: Partial<Font> = {}): Box {
    const inner = new Setter(this.setting, { ...this.font, ...change });
    inner.boxes = this.boxes;
    inner.dimens = this.dimens;
    inner.fonts = this.fonts;
    inner.steps = this.steps;
    inner.problems = this.problems;
    inner.run(tex);
    return inner.finish();
  }

  /** Stretch a box to a width, the strongest glue taking up the difference. */
  private stretch(box: Box, width: number, pos = ''): Box {
    const glue = [...box.glue];
    if (pos === 'r' || pos === 'c') glue.push({ index: 0, order: 1 });
    if (pos === 'l' || pos === 'c') glue.push({ index: box.pieces.length, order: 1 });
    const order = Math.max(0, ...glue.map((g) => g.order));
    const active = glue.filter((g) => g.order === order);
    const share = active.length ? (width - box.width) / active.length : 0;
    const pieces = box.pieces.map((p, i) => moved(p, share * active.filter((g) => g.index <= i).length, 0));
    return { pieces, width, glue: [] };
  }

  private place(box: Box, dx = 0): void {
    for (const p of box.pieces) this.add(moved(p, this.x + dx, this.y));
  }

  // ---- input -----------------------------------------------------------

  private skipSpaces(): void {
    while (/\s/.test(this.input[this.at] ?? '')) this.at++;
  }

  /** The next argument: a group, a command, or one character. */
  private argument(): string {
    this.skipSpaces();
    const ch = this.input[this.at];
    if (ch === undefined) return '';
    if (ch === '{') {
      const g = readGroup(this.input, this.at);
      if (g) {
        this.at = g.end;
        return g.value;
      }
    }
    const m = ch === '\\' ? /^\\(?:[a-zA-Z@]+|[\s\S])/.exec(this.input.slice(this.at, this.at + 40)) : null;
    const token = m ? m[0] : ch;
    this.at += token.length;
    return token;
  }

  private optional(): string | null {
    const from = this.at;
    this.skipSpaces();
    const opt = readOptional(this.input, this.at);
    if (!opt) {
      this.at = from;
      return null;
    }
    this.at = opt.end;
    return opt.value;
  }

  private take(re: RegExp): RegExpExecArray | null {
    const sticky = new RegExp(re.source, 'y');
    sticky.lastIndex = this.at;
    const m = sticky.exec(this.input);
    if (m) this.at += m[0].length;
    return m;
  }

  /** A dimension, with \dimexpr arithmetic, off the input. In bp. */
  private dimension(): number {
    this.take(/\s*=?\s*/);
    // \dimen0=\ifdim..: whichever branch holds is the dimension.
    if (this.take(/\\ifdim(?![a-zA-Z@])/)) this.conditional('ifdim');
    if (this.take(/\\dimexpr(?![a-zA-Z@])/)) {
      const v = this.sum();
      // After a command word TeX skips every blank, a line end included.
      this.take(/\s*\\relax(?![a-zA-Z@])[ \t]*\n?[ \t]*/);
      return v;
    }
    return this.factor();
  }

  private sum(): number {
    let v = this.product();
    for (;;) {
      const op = this.take(/\s*([+-])/);
      if (!op) return v;
      v += (op[1] === '-' ? -1 : 1) * this.product();
    }
  }

  private product(): number {
    let v = this.factor();
    for (;;) {
      const op = this.take(/\s*([*/])\s*(-?[\d.]+)/);
      if (!op) return v;
      v = op[1] === '*' ? v * Number(op[2]) : v / Number(op[2]);
    }
  }

  private factor(): number {
    let sign = 1;
    for (let m = this.take(/\s*([+-])/); m; m = this.take(/\s*([+-])/)) if (m[1] === '-') sign = -sign;
    if (this.take(/\s*\(/)) {
      const v = this.sum();
      this.take(/\s*\)/);
      return sign * v;
    }
    const n = this.take(/\s*(\d*\.?\d+|\d+\.)/);
    const factor = n ? Number(n[1]) : 1;
    // A unit eats one space after it: "\kern3bp squad" prints no space.
    const unit = this.take(/\s*(?:true)?(bp|pt|in|mm|cm|pc|sp|dd|em|ex|mu|fil+|px)\s?/);
    if (unit) return sign * factor * this.unit(unit[1]);
    const reg = this.take(/\s*\\([a-zA-Z@]+)\s?(\d*)/);
    if (reg) return sign * factor * this.register(reg[1], reg[2]);
    return n ? sign * factor : 0;
  }

  private unit(name: string): number {
    if (name === 'em') return this.font.size;
    if (name === 'ex') return this.font.size * 0.5;
    if (name === 'mu') return this.font.size / 18;
    return TO_BP[name] ?? 0;
  }

  private register(name: string, index: string): number {
    if (name === 'wd') return this.boxes.get(index)?.width ?? 0;
    if (name === 'dimen') return this.dimens.get(index) ?? 0;
    return this.dimens.get(name) ?? this.setting.macros.lengths.get(name) ?? 0;
  }

  private measure(tex: string): number {
    const outer = { input: this.input, at: this.at };
    this.input = tex;
    this.at = 0;
    this.take(/\s*\\dimexpr(?![a-zA-Z@])/);
    const v = this.sum();
    this.input = outer.input;
    this.at = outer.at;
    return v;
  }

  // ---- printing --------------------------------------------------------

  private print(ch: string): void {
    const f = this.font;
    const width =
      ch === ' ' && f.size >= this.setting.size * 0.8
        ? this.setting.wordSpace
        : advance(ch, f.size, f.family, f.bold, f.italic);
    this.add({
      kind: 'text',
      text: ch,
      x: this.x,
      y: this.y,
      width,
      size: f.size,
      bold: f.bold,
      italic: f.italic,
      underline: f.underline,
      ...(f.foreign ? { serif: true } : null),
    });
    this.x += width;
  }

  private code(code: number): void {
    const ch = decode(code, this.font.family);
    if (ch) this.print(ch);
    else this.problems.push({ reason: 'unknown-symbol', detail: `character ${code.toString(16)} of ${this.font.family}` });
  }

  /** Letters that run on are one piece; a gap or a new style starts another. */
  private add(p: Piece): void {
    const last = this.pieces[this.pieces.length - 1];
    if (p.kind === 'text' && last?.kind === 'text' && sameStyle(p, last) && Math.abs(p.y - last.y) < 0.01) {
      const gap = p.x - (last.x + last.width);
      if (Math.abs(gap) < WORD_GAP * p.size) {
        last.text += p.text;
        last.width = p.x + p.width - last.x;
        return;
      }
    }
    this.pieces.push({ ...p });
  }

  private space(): void {
    const last = this.pieces[this.pieces.length - 1];
    if (last?.kind === 'text' && last.text.endsWith(' ') && last.y === this.y) return;
    if (this.x === this.lineStart && !this.pieces.some((p) => p.y === this.y)) return;
    this.print(' ');
  }

  private breakLine(): void {
    this.x = this.lineStart;
    this.y -= this.setting.leading;
  }

  private math(tex: string): void {
    const t = tex.trim();
    if (!t) return;
    const width = mathWidth(t, this.font.size);
    this.add({ kind: 'math', tex: t, x: this.x, y: this.y, width, size: this.font.size });
    this.x += width;
  }

  // ---- one token -------------------------------------------------------

  private step(): void {
    const ch = this.input[this.at];
    if (ch === '\\') return this.command();
    if (ch === '{') {
      const g = readGroup(this.input, this.at);
      if (g) {
        this.at = g.end;
        return this.group(g.value);
      }
      this.at++;
      return;
    }
    if (ch === '}') {
      this.at++;
      return;
    }
    if (ch === '$') return this.typedMath();
    this.at++;
    if (/\s/.test(ch)) {
      this.skipSpaces();
      return this.space();
    }
    if (ch === '~') return this.print(' ');
    const two = this.input.slice(this.at - 1, this.at + 2);
    if (two === '---') {
      this.at += 2;
      return this.print('—');
    }
    if (two.startsWith('--')) {
      this.at++;
      return this.print('–');
    }
    if (ch === '`') return this.print('‘');
    if (ch === "'") return this.print('’');
    if (this.font.family === 'symbol' || this.font.family === 'dingbats') return this.code(ch.charCodeAt(0));
    this.print(ch);
  }

  private typedMath(): void {
    const display = this.input[this.at + 1] === '$';
    const open = this.at + (display ? 2 : 1);
    let i = open;
    while (i < this.input.length && this.input[i] !== '$') i += this.input[i] === '\\' ? 2 : 1;
    this.at = Math.min(this.input.length, i + (display ? 2 : 1));
    this.math(this.input.slice(open, i));
  }

  private command(): void {
    const word = this.take(/\\([a-zA-Z@]+)/);
    if (!word) {
      this.at++;
      const sign = this.input[this.at] ?? '';
      this.at++;
      return this.sign(sign);
    }
    let name = word[1];
    // "@" is a letter only to the preamble's own commands.
    if (name.includes('@') && !this.setting.macros.has(name) && !PRIMITIVE_AT.has(name)) {
      const short = name.slice(0, name.indexOf('@'));
      this.at -= name.length - short.length;
      name = short;
    }
    this.take(/[ \t]*\n?[ \t]*/);
    this.named(name);
  }

  private sign(sign: string): void {
    if (sign === '(' || sign === '[') {
      const close = this.input.indexOf(sign === '(' ? '\\)' : '\\]', this.at);
      const end = close === -1 ? this.input.length : close;
      this.math(this.input.slice(this.at, end));
      this.at = end + 2;
    } else if (sign === ',') this.x += this.setting.size * 0.139;
    else if (sign === ';' || sign === ':') this.x += this.font.size * 0.25;
    else if (sign === '!') this.x -= this.font.size * 0.16;
    else if (sign === '\\') {
      this.optional();
      this.breakLine();
    } else if (sign === '_' && this.y !== 0) {
      // A raised underscore is a drawn line: the paper's minus sign. An
      // underscore hangs 0.1em below its baseline, a minus 0.31em above.
      const y = this.y;
      this.y -= this.font.size * 0.41;
      this.print('−');
      this.y = y;
    } else if (/[%&#_${}]/.test(sign)) this.print(sign);
    else if (/\s/.test(sign)) this.print(' ');
    else if (/["'`^~]/.test(sign)) {
      const letter = this.argument();
      const ch = accented(sign, letter.replace('\\i', 'i'));
      if (ch) this.print(ch);
    }
    // \/ \- \@ print nothing.
  }

  private named(name: string): void {
    if (this.steps.left-- <= 0) {
      // A definition that never ends: what is left of the line is not set.
      if (this.steps.left === -1) this.problems.push({ reason: 'unknown-command', detail: `\\${name} expands without end` });
      this.at = this.input.length;
      return;
    }
    const f = this.font;
    if (name in STYLES) return void (this.font = { ...f, ...STYLES[name] });
    if (name in STYLED) return this.group(this.argument(), STYLED[name]);
    if (NOTHING.has(name)) return;

    switch (name) {
      case 'kern':
      case 'hskip':
      case 'mskip':
      case 'mkern': {
        this.x += this.dimension();
        while (this.take(/\s*(?:plus|minus)/)) this.dimension();
        return;
      }
      case 'hspace': {
        this.take(/\*/);
        this.x += this.measure(this.argument());
        return;
      }
      case 'quad':
        return void (this.x += f.size);
      case 'qquad':
        return void (this.x += 2 * f.size);
      case 'enspace':
        return void (this.x += f.size / 2);
      case 'hfill':
      case 'hfil':
      case 'hss':
      case 'dotfill':
      case 'hrulefill':
        this.glue.push({ index: this.pieces.length, order: name === 'hfill' ? 2 : 1 });
        return;
      case 'unskip': {
        const last = this.pieces[this.pieces.length - 1];
        if (last?.kind === 'text' && / $/.test(last.text)) {
          last.text = last.text.trimEnd();
          last.width -= this.setting.wordSpace;
          this.x -= this.setting.wordSpace;
        }
        return;
      }
      case 'raisebox': {
        const dy = this.measure(this.argument());
        this.optional();
        this.optional();
        return this.group(this.argument(), {}, dy);
      }
      case 'raise':
      case 'lower': {
        const dy = this.dimension();
        const box = this.readBox();
        if (box) this.placeRaised(box, name === 'raise' ? dy : -dy);
        return;
      }
      case 'makebox':
      case 'framebox': {
        const width = this.optional();
        const pos = this.optional() ?? 'c';
        const box = this.box(this.argument());
        const set = width === null ? box : this.stretch(box, this.measure(width), pos);
        this.place(set);
        this.x += set.width;
        return;
      }
      case 'hbox':
      case 'hb@xt@':
      case 'vbox':
      case 'vtop': {
        const box = this.readBox(name);
        if (box) {
          this.place(box);
          this.x += box.width;
        }
        return;
      }
      case 'rlap': {
        this.place(this.box(this.argument()));
        return;
      }
      case 'llap': {
        const box = this.box(this.argument());
        this.place(box, -box.width);
        return;
      }
      case 'clap': {
        const box = this.box(this.argument());
        this.place(box, -box.width / 2);
        return;
      }
      case 'phantom':
      case 'hphantom':
        this.x += this.box(this.argument()).width;
        return;
      case 'setbox': {
        const m = this.take(/\s*(\\?[a-zA-Z@]+|\d+)\s*=?\s*/);
        const box = this.readBox();
        if (m && box) this.boxes.set(m[1], box);
        return;
      }
      case 'box':
      case 'copy':
      case 'unhbox':
      case 'unhcopy': {
        const m = this.take(/\s*(\\?[a-zA-Z@]+|\d+)\s?/);
        const box = m ? this.boxes.get(m[1]) : null;
        if (box) {
          this.place(box);
          this.x += box.width;
        }
        return;
      }
      case 'dimen':
      case 'wd':
      case 'ht':
      case 'dp': {
        const m = this.take(/\s*(\d+)/);
        const v = this.dimension();
        if (m && name === 'dimen') this.dimens.set(m[1], v);
        return;
      }
      case 'fontsize': {
        const size = this.measure(this.argument());
        this.argument();
        if (size > 0) this.font = { ...f, size };
        return;
      }
      case 'fontfamily':
        return this.family(this.argument());
      case 'usefont': {
        this.argument();
        this.family(this.argument());
        const series = this.argument();
        const shape = this.argument();
        this.font = { ...this.font, bold: /^b/.test(series), italic: /it|sl/.test(shape) };
        return;
      }
      case 'font': {
        const m = this.take(/\\?([a-zA-Z@]+)\s*=?\s*([a-z0-9-]+)(?:\s+(?:at|scaled)\s*([\d.]+)(?:bp|pt)?)?\s?/);
        if (m) this.fonts.set(m[1], /^.(?:tm|bk|nc|pl)/.test(m[2]) ? 'times' : 'helvetica');
        return;
      }
      case 'char': {
        const m = this.take(/\s*(?:"([0-9A-Fa-f]+)|'([0-7]+)|`\\?(.)|(\d+))\s?/);
        if (m) this.code(m[1] ? parseInt(m[1], 16) : m[2] ? parseInt(m[2], 8) : m[3] ? m[3].charCodeAt(0) : Number(m[4]));
        return;
      }
      case 'rule': {
        const raise = this.optional();
        const width = this.measure(this.argument());
        const thickness = this.measure(this.argument());
        this.ruleAt(width, thickness, raise ? this.measure(raise) : 0);
        this.x += width;
        return;
      }
      case 'vrule':
      case 'hrule': {
        const size: Record<string, number> = {};
        for (let m = this.take(/\s*(width|height|depth)/); m; m = this.take(/\s*(width|height|depth)/)) size[m[1]] = this.dimension();
        this.ruleAt(size.width ?? 0.4, (size.height ?? 0) + (size.depth ?? 0), -(size.depth ?? 0));
        this.x += size.width ?? 0.4;
        return;
      }
      case 'underline':
        return this.group(this.argument(), { underline: true });
      case 'textsuperscript':
        return this.group(this.argument(), { size: f.size * 0.73 }, f.size * 0.36);
      case 'textsubscript':
        return this.group(this.argument(), { size: f.size * 0.73 }, -f.size * 0.16);
      case 'ensuremath': {
        const tex = this.argument();
        const one = /^\s*\\([a-zA-Z]+)\s*$/.exec(tex);
        const ch = one && MATH_CHARACTERS[one[1]];
        return ch ? this.print(ch) : this.math(tex);
      }
      case 'linebreak':
      case 'newline':
        this.optional();
        return this.breakLine();
      case 'leaders':
      case 'cleaders':
      case 'xleaders': {
        // A dotted line to write on. It fills, it does not say anything.
        this.readBox();
        return;
      }
      case 'advance': {
        this.take(/\\[a-zA-Z@]+\d*\s*(?:by)?/);
        this.dimension();
        return;
      }
      case 'penalty':
      case 'hangafter':
      case 'looseness':
        this.take(/\s*=?\s*(?:-?\d+|\\[a-zA-Z@]+)\s?/);
        return;
      case 'IfFileExists': {
        this.argument();
        const then = this.argument();
        this.argument();
        return this.group(then);
      }
      case 'includegraphics':
        return this.picture(this.optional(), this.argument());
      case 'begin':
        return this.environment(this.argument());
      case 'end':
        this.argument();
        return;
      case 'begingroup':
      case 'bgroup': {
        const close = this.endOfGroup();
        const inner = this.input.slice(this.at, close.from);
        this.at = close.to;
        return this.group(inner);
      }
      case 'endgroup':
      case 'egroup':
        return;
      case 'gdef':
      case 'def':
      case 'edef':
      case 'xdef':
        this.take(/\\[a-zA-Z@]+[^{]*/);
        this.argument();
        return;
      case 'else':
        return this.skipTo(['fi']);
      case 'fi':
        return;
    }
    if (/^if[a-z@]*$/i.test(name) && !this.setting.macros.has(name)) return this.conditional(name);
    if (name === 'at' && !this.setting.macros.has('at')) return this.builtin('\\rlap{\\kern\\dimexpr #1bp-49.6bp\\relax\\raisebox{#2bp}{#3}}', 3);
    if (name === 'ruleat' && !this.setting.macros.has('ruleat')) {
      return this.builtin(
        '\\rlap{\\kern\\dimexpr #1bp-49.6bp\\relax\\raisebox{\\dimexpr #3bp-#4bp/2\\relax}{\\rule{\\dimexpr #2bp-#1bp\\relax}{#4bp}}}',
        4,
      );
    }
    if ((name === 'lab' || name === 'plab') && !this.setting.macros.has(name)) {
      return this.builtin('\\llap{\\makebox[#1bp][l]{#2}}', 2);
    }
    if (name in SWALLOW) {
      this.take(/\*/);
      this.optional();
      for (let i = 0; i < SWALLOW[name]; i++) this.argument();
      return;
    }
    if (name in WRAPPER) {
      this.optional();
      for (let i = 1; i < WRAPPER[name]; i++) this.argument();
      return this.group(this.argument());
    }
    const own = this.fonts.get(name);
    if (own) return void (this.font = { ...f, family: own, foreign: own === 'times' && this.setting.macros.get('familydefault')?.body !== '\\rmdefault' });
    const macro = this.setting.macros.get(name);
    if (macro) return this.expand(macro);
    if (name in CHARACTERS) {
      for (const ch of CHARACTERS[name]) this.print(ch);
      return;
    }
    if (name in HOUSE) return this.expand(HOUSE[name]);
    // A length being set: the number must not print.
    if (/(?:skip|glue|indent|margin|penalty|width|space)$/.test(name)) {
      if (this.take(/\s*=?\s*(?=-?[\d.]|\\)/)) {
        this.dimension();
        while (this.take(/\s*(?:plus|minus)/)) this.dimension();
      }
      return;
    }
    this.unknown(name);
  }

  private builtin(body: string, args: number): void {
    this.expand({ args, optional: null, body });
  }

  private family(code: string): void {
    const family = FAMILIES[code.trim().slice(0, 3)] ?? this.font.family;
    this.font = { ...this.font, family, foreign: family === 'times' && !/rmdefault/.test(this.setting.macros.get('familydefault')?.body ?? '') };
  }

  private expand(macro: Macro): void {
    const args: string[] = [];
    if (macro.delimiters) {
      const [before, ...after] = macro.delimiters;
      if (before && this.input.startsWith(before, this.at)) this.at += before.length;
      for (const stop of after) {
        if (stop === '') {
          args.push(this.argument());
          continue;
        }
        const end = this.input.indexOf(stop, this.at);
        args.push(this.input.slice(this.at, end === -1 ? this.input.length : end));
        this.at = end === -1 ? this.input.length : end + stop.length;
      }
    } else {
      let wanted = macro.args;
      if (macro.optional !== null) {
        args.push(this.optional() ?? macro.optional);
        wanted--;
      }
      for (let i = 0; i < wanted; i++) args.push(this.argument());
    }
    // TeX reads the body into commands before it puts the arguments in, so
    // "\\ignorespaces#2" with "the" stays a command and a word.
    const body = macro.body.replace(/(\\[a-zA-Z@]+)?#(\d)/g, (_, before: string | undefined, n: string) => {
      const arg = args[Number(n) - 1] ?? '';
      return before ? `${before}${/^[a-zA-Z@]/.test(arg) ? ' ' : ''}${arg}` : arg;
    });
    // Put back on the input, not run apart: a body may end in a command
    // whose argument is what follows the call.
    const rest = this.input.slice(this.at);
    // A body that ends in a command word must not run into a word after the call.
    this.input = body + (/\\[a-zA-Z@]+$/.test(body) && /^[a-zA-Z@]/.test(rest) ? ' ' : '') + rest;
    this.at = 0;
  }

  /** \hbox{..}, \hbox to 12bp{..}, \hb@xt@ 12bp{..}; or a box register. */
  private readBox(name?: string): Box | null {
    this.skipSpaces();
    if (!name) {
      const m = this.take(/\\(hbox|hb@xt@|vbox|vtop|box|copy)\s*/);
      if (!m) return null;
      if (m[1] === 'box' || m[1] === 'copy') {
        const reg = this.take(/(\\?[a-zA-Z@]+|\d+)\s?/);
        return (reg && this.boxes.get(reg[1])) || null;
      }
      name = m[1];
    }
    let width: number | null = null;
    if (name === 'hb@xt@' || this.take(/\s*to(?![a-z])/)) width = this.dimension();
    this.skipSpaces();
    const g = readGroup(this.input, this.at);
    if (!g) return null;
    this.at = g.end;
    const box = this.box(g.value);
    return width === null ? box : this.stretch(box, width);
  }

  private placeRaised(box: Box, dy: number): void {
    const y = this.y;
    this.y += dy;
    this.place(box);
    this.y = y;
    this.x += box.width;
  }

  private ruleAt(width: number, thickness: number, raise: number): void {
    // An invisible strut.
    if (width <= 0.05 || thickness <= 0.01) return;
    if (width < thickness) {
      const x = this.x + width / 2;
      const y = this.y + raise;
      this.add({ kind: 'path', x, y, width: 0, stroke: width, points: [{ x, y }, { x, y: y + thickness }] });
    } else this.add({ kind: 'rule', x: this.x, y: this.y + raise + thickness / 2, width, thickness });
  }

  private picture(options: string | null, file: string): void {
    const clip = parseClipOptions(options);
    if (!clip || !file) {
      this.problems.push({ reason: 'unknown-shape', detail: 'a picture that is not cut from the PDF' });
      return;
    }
    const width = round(PAGE.width - clip.left - clip.right);
    const height = round(PAGE.height - clip.bottom - clip.top);
    this.add({ kind: 'glyph', clip, x: this.x, y: this.y, width, height });
    this.x += width;
  }

  private environment(name: string): void {
    const close = `\\end{${name}}`;
    const end = this.input.indexOf(close, this.at);
    const body = this.input.slice(this.at, end === -1 ? this.input.length : end);
    const after = end === -1 ? this.input.length : end + close.length;
    if (/^(tikzpicture|pgfpicture|picture)\*?$/.test(name)) {
      this.at = after;
      return this.drawing(body);
    }
    if (/^(align|equation|gather|displaymath|math)\*?$/.test(name)) {
      this.at = after;
      return this.math(/^(align|gather)/.test(name) ? `\\begin{${name.replace('*', '')}ed}${body}\\end{${name.replace('*', '')}ed}` : body);
    }
    // Anything else (center, scope) wraps content that is set as it stands.
    this.optional();
  }

  /** Paths of a picture drawn over the line, in the line's own coordinates. */
  private drawing(body: string): void {
    const clean = body.replace(/^\s*\[[^\]]*\]/, '');
    for (const m of clean.matchAll(/\\(path|draw|fill|filldraw|node|clip)(?![a-zA-Z])\s*(?:\[([^\]]*)\])?([^;]*);/g)) {
      const [, verb, style = '', path] = m;
      // A clip only trims the ends of a stroke: the shape stays what it was.
      if (verb === 'clip') continue;
      if (verb === 'node' || /controls|arc|circle|node/.test(path)) {
        this.problems.push({ reason: 'unknown-shape', detail: 'a drawn curve or label' });
        continue;
      }
      const points = [...path.matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map((p) => ({
        x: round(this.x + Number(p[1])),
        y: round(this.y + Number(p[2])),
      }));
      if (points.length < 2) continue;
      if (/rectangle/.test(path)) {
        const [a, b] = points;
        points.splice(0, points.length, a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y });
      }
      const xs = points.map((p) => p.x);
      const piece: PathPiece = {
        kind: 'path',
        x: Math.min(...xs),
        y: Math.min(...points.map((p) => p.y)),
        width: Math.max(...xs) - Math.min(...xs),
        points,
      };
      const stroke = /line width\s*=\s*([\d.]+)/.exec(style);
      if (verb === 'draw' || /draw/.test(style)) piece.stroke = stroke ? Number(stroke[1]) : 0.4;
      this.add(piece);
    }
  }

  // ---- conditionals ----------------------------------------------------

  private conditional(name: string): void {
    let truth = false;
    if (name === 'ifdim') {
      const a = this.dimension();
      const op = this.take(/\s*([<>=])/);
      const b = this.dimension();
      truth = op?.[1] === '<' ? a < b : op?.[1] === '>' ? a > b : a === b;
    } else if (name === 'ifx' || name === 'if') {
      const a = this.argument();
      const b = this.argument();
      truth = a === b;
    } else if (name === 'ifnum') this.take(/[^\\]*(?:\\[a-zA-Z@]+\s*)?[<>=][^\\]*?(?=\\|\s)/);
    else if (name === 'iftrue') truth = true;
    else if (name === 'ifdefined' || name === 'ifcsname') truth = this.setting.macros.has(this.argument());
    if (!truth) this.skipTo(['else', 'fi']);
  }

  private skipTo(stops: string[]): void {
    let depth = 0;
    const re = /\\([a-zA-Z@]+)/g;
    re.lastIndex = this.at;
    for (let m = re.exec(this.input); m; m = re.exec(this.input)) {
      if (depth === 0 && stops.includes(m[1])) {
        this.at = re.lastIndex;
        this.take(/\s?/);
        return;
      }
      if (/^if/.test(m[1]) && m[1] !== 'iff') depth++;
      else if (m[1] === 'fi') depth--;
    }
    this.at = this.input.length;
  }

  private endOfGroup(): { from: number; to: number } {
    let depth = 1;
    const re = /\\(begingroup|bgroup|endgroup|egroup)(?![a-zA-Z@])/g;
    re.lastIndex = this.at;
    for (let m = re.exec(this.input); m; m = re.exec(this.input)) {
      depth += m[1].startsWith('b') ? 1 : -1;
      if (depth === 0) return { from: m.index, to: re.lastIndex };
    }
    return { from: this.input.length, to: this.input.length };
  }

  /** No definition: report it, and take its arguments away with it. */
  private unknown(name: string): void {
    const from = this.at;
    while (this.input[this.at] === '[' || this.input[this.at] === '{' || this.input[this.at] === '*') {
      if (this.input[this.at] === '*') {
        this.at++;
        continue;
      }
      const g = this.input[this.at] === '[' ? readOptional(this.input, this.at) : readGroup(this.input, this.at);
      if (!g) break;
      this.at = g.end;
    }
    const took = this.input.slice(from, this.at);
    // \foo{} is how a command is ended before a space; it takes nothing.
    this.problems.push({ reason: 'unknown-command', detail: `\\${name}${took.length > 40 ? `${took.slice(0, 40)}...` : took}` });
  }
}

const PRIMITIVE_AT = new Set(['hb@xt@']);

const STYLES: Record<string, Partial<Font>> = {
  bfseries: { bold: true }, bf: { bold: true }, mdseries: { bold: false }, itshape: { italic: true }, it: { italic: true },
  em: { italic: true }, slshape: { italic: true }, upshape: { italic: false }, normalfont: { bold: false, italic: false },
  rmfamily: {}, sffamily: {}, ttfamily: {}, rm: {}, sf: {},
};
const STYLED: Record<string, Partial<Font>> = {
  textbf: { bold: true }, textit: { italic: true }, emph: { italic: true }, textsl: { italic: true }, textmd: { bold: false },
  textrm: {}, textsf: {}, texttt: {}, text: {},
};

// The documented format's own commands, for a fragment with no preamble.
const HOUSE: Record<string, Macro> = {
  pow: { args: 1, optional: null, body: '\\textsuperscript{#1}' },
  ohms: { args: 0, optional: null, body: 'Ω' },
  dg: { args: 0, optional: null, body: '\\textdegree{}' },
  degC: { args: 0, optional: null, body: '\\textdegree{}C' },
  x: { args: 0, optional: null, body: '\\texttimes{}' },
};

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function sameStyle(a: TextPiece, b: TextPiece): boolean {
  return a.size === b.size && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.serif === b.serif;
}

function moved<P extends Piece>(p: P, dx: number, dy: number): P {
  const out = { ...p, x: p.x + dx, y: p.y + dy };
  if (out.kind === 'path') out.points = out.points.map((q) => ({ x: q.x + dx, y: q.y + dy }));
  return out;
}

/** Roughly how wide typed maths prints; order is what matters, not the bp. */
function mathWidth(tex: string, size: number): number {
  const frac = /\\d?frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}/;
  let t = tex;
  for (let m = frac.exec(t); m; m = frac.exec(t)) t = t.replace(m[0], m[1].length > m[2].length ? m[1] : m[2]);
  const plain = t
    .replace(/\\(?:mathrm|mathbf|text|left|right|begin\{[a-z]*\}|end\{[a-z]*\})/g, '')
    .replace(/\\(?:quad)/g, 'mm')
    .replace(/\\[a-zA-Z]+/g, 'm')
    .replace(/[_^{}&\s]|\\./g, '');
  return plain.length * size * 0.5;
}
