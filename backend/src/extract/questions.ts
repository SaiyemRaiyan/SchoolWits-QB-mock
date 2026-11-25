/**
 * The elements of one question -> its stem, parts, marks and options.
 *
 * Part labels are written in these papers, so they are read, not generated:
 * a bold "(a)" or "(ii)" at the start of a line opens a part, wherever on the
 * page and by whatever command it was put there.
 */

import { inlineToHtml } from '../latex/inline.js';
import { toBlocks } from '../latex/content.js';
import { findCommand } from '../latex/scan.js';
import type { AnswerSpace, ImageMap, Options, Part, Block } from '../latex/types.js';
import { bands, type Band } from './bands.js';
import type { EquationChain } from './equations/chain.js';
import { isText, right } from './equations/geometry.js';
import { isDrawing } from './equations/symbol.js';
import { COLUMN, isElement, tokenize, type Element } from './roles.js';
import type { Typesetter } from './typesetter.js';
import type { Line, Pass, PassReason, Piece, TextPiece } from './types.js';

export interface QuestionSource {
  number: number;
  /** As printed: "7", "A1". */
  label: string;
  marks: number;
  body: string;
  /** The last of its paper: what follows it may be a data page. */
  last: boolean;
}

export interface QuestionRead {
  stem: Block[];
  parts: Part[];
  options: Options | null;
  passes: Pass[];
  rebuilt: boolean;
  /** Marks of the parts, an EITHER/OR pair counted once. */
  partMarks: number;
}

/** What a subject may change about a line before it is read, and after. */
export interface ReadingRules {
  pieces(line: Line): Line;
  tidy(tex: string): string;
}

interface Draft {
  label: string;
  ref: string;
  paras: Para[];
  marks: number | null;
  lines: number;
  value: { label: string; unit: string } | null;
  subs: Draft[];
  /** 0: both alternatives. 1, 2: EITHER, OR. */
  choice: 0 | 1 | 2;
}

interface Para {
  tex: string;
  x: number;
  /** Where its last line ends, to tell a wrapped line from a short one. */
  end: number;
  figure?: boolean;
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const LABEL = /^\(([a-z]{1,4})\)$/;

// Page furniture, with the paper's own letter-spacing already taken out.
const FURNITURE =
  /^\W*(?:BLANK PAGE|\[?Turn over\]?|Please turn over.*|Question \w+ (?:is printed|starts|begins|continues).*|(?:The )?question continues.*|Continue your (?:working|answer).*|Additional Page.*|Permission to reproduce.*|DO NOT WRITE IN THIS MARGIN)\W*$/i;
const SECTION = /^\W*Section [A-D]\W*$/i;

export class QuestionBuilder {
  private readonly stem: Para[] = [];
  private readonly parts: Draft[] = [];
  private readonly options: { label: string; tex: string; para: Para | null }[] = [];
  private readonly passes: Pass[] = [];
  private part: Draft | null = null;
  private sub: Draft | null = null;
  /** Parts are (i), (ii) with no (a) above them. */
  private topRoman = false;
  private numbered = false;
  private rebuilt = false;
  private hasFigure = false;
  /** Where loose text after an element belongs. */
  private open: Para | null = null;
  private lastY = 0;
  private choice: 0 | 1 | 2 = 0;
  /** Text after OR that the next label takes as its lead-in. */
  private lead: Para[] | null = null;
  private done = false;
  private pageBreak = false;
  private figures: string[] = [];
  private readonly origin: number;

  constructor(
    private readonly source: QuestionSource,
    private readonly setting: Typesetter,
    private readonly chain: EquationChain,
    private readonly rules: ReadingRules,
    private readonly images: ImageMap,
  ) {
    // The page column that a positioned block counts from, as \at defines it.
    this.origin = -(this.setting.line('\\at{0}{0}{x}').pieces[0]?.x ?? 0);
  }

  build(): QuestionRead {
    for (const token of tokenize(this.source.body)) {
      if (this.done) break;
      if (isElement(token)) this.element(token);
      else this.loose(token.raw);
    }
    if (this.lead?.length) (this.target()?.paras ?? this.stem).push(...this.lead);
    const parts = this.parts.map((d) => this.finish(d));
    const total = (choice: number) =>
      this.parts.filter((d) => d.choice === choice).reduce((sum, d) => sum + (marksOf(d) ?? 0), 0);
    return {
      stem: this.blocks(this.stem),
      parts,
      options: this.options.length
        ? { source: 'choices', items: this.options.map((o) => ({ label: o.label, content: inlineToHtml(o.para?.tex ?? o.tex) })) }
        : this.hasFigure
          ? { source: 'figure', items: [] }
          : null,
      passes: this.passes,
      rebuilt: this.rebuilt,
      partMarks: total(0) + Math.max(total(1), total(2)),
    };
  }

  // ---- reading text ----------------------------------------------------

  private pass(reason: PassReason, detail: string): void {
    this.passes.push({ question: this.source.number, reason, detail: detail.slice(0, 160) });
  }

  private set(tex: string): Line {
    const line = this.setting.line(tex);
    for (const p of line.problems ?? []) this.pass(p.reason, p.detail);
    return this.rules.pieces(line);
  }

  private read(line: Line): string {
    // A drawing set in the line ("a compass looks like this") is a figure.
    const drawings: string[] = [];
    const pieces = line.pieces.map((p): Piece => {
      if (p.kind !== 'glyph' || !isDrawing(p)) return p;
      const { page, left, bottom, right: r, top } = p.clip;
      drawings.push(`\\qfig[page=${page},trim=${left}bp ${bottom}bp ${r}bp ${top}bp,clip]{source.pdf}{}`);
      const char = String.fromCharCode(0xe000 + drawings.length - 1);
      return { kind: 'text', text: char, x: p.x, y: 0, width: p.width, size: line.size, bold: false, italic: false, underline: false };
    });
    const reading = this.chain.read({ ...line, pieces });
    if (reading.ok) this.rebuilt ||= reading.rebuilt;
    else this.pass(reading.reason, reading.tex);
    const tex = this.rules.tidy(reading.tex);
    return tex.replace(/[-]/g, (c) => drawings[c.charCodeAt(0) - 0xe000] ?? c);
  }

  /** A run of LaTeX as inline LaTeX, its own line breaks kept apart. */
  private inline(tex: string): string {
    return splitLines(tex)
      .map((part) => this.read(this.set(part.tex)) + part.after)
      .join('')
      .replace(/ {2,}/g, ' ')
      .trim();
  }

  // ---- structure -------------------------------------------------------

  private target(): Draft | null {
    return this.sub ?? this.part;
  }

  private addMarks(n: number): void {
    const t = this.target();
    if (t) t.marks = (t.marks ?? 0) + n;
  }

  private draft(label: string, parentRef: string): Draft {
    return { label, ref: `${parentRef}(${label})`, paras: [], marks: null, lines: 0, value: null, subs: [], choice: this.choice };
  }

  private openLabel(label: string): void {
    const roman = ROMAN.includes(label);
    if (!this.part && roman) this.topRoman = true;
    // "(i)" is the ninth letter as well as the first numeral; it is a letter
    // only where it directly continues the lettering.
    const part = this.part;
    const continues =
      part !== null && part.subs.length === 0 && label.length === 1 && label.charCodeAt(0) === part.label.charCodeAt(0) + 1;
    if (part && (this.topRoman ? !roman : roman && !continues)) {
      this.sub = this.draft(label, part.ref);
      part.subs.push(this.sub);
    } else {
      this.part = this.draft(label, String(this.source.number));
      this.parts.push(this.part);
      this.sub = null;
    }
    if (this.lead) {
      this.target()!.paras.push(...this.lead);
      this.lead = null;
    }
  }

  /** A paragraph, or the continuation of the one it wraps on from. */
  private addPara(tex: string, x: number, end: number, gap: number, firstWord: number): void {
    const text = tex.trim();
    if (!text) return;
    if (this.furniture(text)) return;
    const list = this.lead ?? this.target()?.paras ?? this.stem;
    const prev = list[list.length - 1];
    const wraps =
      prev !== undefined && prev === this.open && !prev.figure && gap > 0 && gap < 1.32 * this.setting.leading &&
      Math.abs(prev.x - x) < 2 && prev.end + firstWord + this.setting.wordSpace > COLUMN.right - 18 && !/[.:?]$/.test(prev.tex);
    if (wraps) {
      prev.tex += ` ${text}`;
      prev.end = end;
      return;
    }
    const para: Para = { tex: text, x, end };
    list.push(para);
    this.open = para;
  }

  /** Page furniture is dropped; a section heading ends (or precedes) a question. */
  private furniture(text: string): boolean {
    const plain = text.replace(/\\[a-z]+\{|\}/g, '').replace(/\s+/g, ' ').trim();
    if (SECTION.test(plain)) {
      // Before the question's own number it is the heading above it, and so
      // is what stands between the two.
      if (this.numbered || this.parts.length || this.options.length) this.done = true;
      else this.dropUntilNumber = true;
      return true;
    }
    if (this.dropUntilNumber && !this.numbered) return true;
    if (/^BLANK PAGE$/i.test(plain)) {
      if (this.source.last && this.complete()) this.done = true;
      return true;
    }
    return FURNITURE.test(plain);
  }

  private dropUntilNumber = false;

  /** Every mark (or every option) the question should have has been seen. */
  private complete(): boolean {
    if (this.choice === 1) return false;
    if (this.options.length >= 4) return true;
    const sum = this.parts.filter((d) => d.choice !== 2).reduce((n, d) => n + (marksOf(d) ?? 0), 0);
    return this.parts.length ? sum >= this.source.marks : this.source.marks <= 1 && this.hasFigure && this.pageBreak;
  }

  private takeMarks(tex: string): { tex: string; marks: number[] } {
    const marks: number[] = [];
    let out = tex;
    for (const call of findCommand(tex, 'swmark', 1).reverse()) {
      const m = /\[\s*(\d+)\s*\]/.exec(call.args[0]);
      if (!m) continue;
      marks.unshift(Number(m[1]));
      out = out.slice(0, call.start) + out.slice(call.end);
    }
    return { tex: out, marks };
  }

  /**
   * Labels off the front of a line. The question's own number is dropped,
   * (a) and (ii) open parts, and what is left is the line's text.
   */
  private takeLabels(pieces: Piece[]): Piece[] {
    const rest = [...pieces].sort((a, b) => a.x - b.x);
    for (;;) {
      const first = rest[0];
      if (!first || !isText(first) || !first.bold) return rest;
      const text = first.text.trim();
      const pair = /^\(([a-z]{1,4})\)\s*\(([ivx]+)\)$/.exec(text);
      const label = LABEL.exec(text);
      if (pair) {
        this.openLabel(pair[1]);
        this.openLabel(pair[2]);
      } else if (label) this.openLabel(label[1]);
      else if (!this.numbered && (text === this.source.label || text === String(this.source.number))) {
        this.numbered = true;
        if (this.dropUntilNumber) this.stem.length = 0;
      } else return rest;
      rest.shift();
    }
  }

  /** EITHER and OR stand alone on their line. */
  private alternative(text: string): boolean {
    const word = /^\\textbf\{(EITHER|OR)\}$/.exec(text.trim())?.[1];
    if (!word || (word === 'OR' && this.choice !== 1)) return false;
    this.choice = word === 'EITHER' ? 1 : 2;
    this.lead = [];
    if (word === 'OR') {
      this.lead.push({ tex: '\\textbf{OR}', x: 0, end: 0 });
      this.open = this.lead[0];
    } else {
      const para = { tex: '\\textbf{EITHER}', x: 0, end: 0 };
      // Alternatives inside a part stay in it: no new label opens them.
      this.lead.push(para);
      this.open = para;
    }
    return true;
  }

  // ---- elements --------------------------------------------------------

  private element(el: Element): void {
    switch (el.spec.role) {
      case 'line':
        return this.line(el);
      case 'positioned':
        return this.positioned(el);
      case 'option':
        return this.option(el);
      case 'options':
        ['A', 'B', 'C', 'D'].forEach((label, i) => this.addOption(label, this.inline(el.args[i + 1] ?? '')));
        return;
      case 'answer':
        return this.answer(el);
      case 'mark': {
        const m = /\[\s*(\d+)\s*\]/.exec(el.args[1]);
        if (m) this.addMarks(Number(m[1]));
        this.open = null;
        return;
      }
      case 'figure':
        return this.figure(el);
      case 'total':
        // What follows the total, up to the next question, is the page's.
        this.done = true;
        return;
      case 'page':
        this.pageBreak = true;
        this.open = null;
        return;
    }
  }

  private loose(raw: string): void {
    const taken = this.takeMarks(raw);
    const text = this.inline(taken.tex);
    const open = this.open;
    if (text && open) {
      open.tex += `${/\\newline$/.test(open.tex) ? '' : ' '}${text}`;
      open.end = this.endOf(taken.tex, open.x);
    } else if (text && !this.furniture(text)) this.addPara(text, COLUMN.body, COLUMN.body, 0, 0);
    taken.marks.forEach((n) => this.addMarks(n));
  }

  private endOf(tex: string, x: number): number {
    const last = splitLines(tex).pop();
    return last ? x + Math.max(0, ...this.setting.line(last.tex).pieces.map(right)) : x;
  }

  private line(el: Element): void {
    const x = el.spec.x !== undefined ? Number(el.args[el.spec.x]) : COLUMN.body;
    const label = el.spec.label !== undefined ? this.set(el.args[el.spec.label]).pieces : [];
    if (label.length) this.takeLabels(label.map((p) => (isText(p) ? { ...p, bold: true } : p)));
    const taken = this.takeMarks(el.args[el.spec.text!]);
    const lines = splitLines(taken.tex);
    let tex = '';
    let word = 0;
    lines.forEach((part, i) => {
      const line = this.set(part.tex);
      const pieces = i === 0 ? this.takeLabels(line.pieces) : line.pieces;
      if (i === 0) word = this.firstWord(pieces);
      const body = this.textMarks(pieces, x, taken.marks);
      tex += this.read({ ...line, pieces: body }) + part.after;
    });
    tex = tex.replace(/ {2,}/g, ' ').trim();
    if (!this.alternative(tex)) {
      this.addPara(tex, x, this.endOf(taken.tex, x), Number(el.args[0]) || 0, word);
    }
    taken.marks.forEach((n) => this.addMarks(n));
  }

  /** "[2]" set at the right margin as plain text is the part's marks. */
  private textMarks(pieces: Piece[], x: number, marks: number[]): Piece[] {
    return pieces.filter((p) => {
      const m = isText(p) && x + p.x > 480 ? /^\[(\d+)\]$/.exec(p.text.trim()) : null;
      if (m) marks.push(Number(m[1]));
      return !m;
    });
  }

  private firstWord(pieces: Piece[]): number {
    const first = pieces[0];
    if (!first) return 0;
    if (!isText(first)) return first.width;
    const word = first.text.trim().split(' ')[0];
    return (first.width * word.length) / Math.max(1, first.text.length);
  }

  private positioned(el: Element): void {
    const taken = this.takeMarks(el.args[1]);
    const line = this.set(taken.tex);
    const all = this.textMarks(line.pieces, this.origin, taken.marks);
    const list = bands({ ...line, pieces: all });
    const first = list.findIndex((band) => this.letters(band.pieces).length > 0);
    const letters = this.letters(all);
    // Letters in a row or a column are options only where options can be.
    const options =
      first >= 0 && this.source.marks <= 1 && this.parts.length === 0 && this.options.length + letters.length <= 5 &&
      (letters.length >= 2 || list[first].pieces.every((p) => p.x >= letters[0].x));
    let y = 0;
    let gap = Number(el.args[0]) || 0;
    for (const band of options ? list.slice(0, first) : list) {
      this.band(band, line, gap + (y - band.y));
      y = band.y;
      gap = 0;
    }
    if (options) this.optionBlock(list.slice(first).flatMap((b) => b.pieces), letters, line);
    this.lastY = y;
    taken.marks.forEach((n) => this.addMarks(n));
  }

  private band(band: Band, line: Line, gap: number): void {
    const pieces = this.takeLabels(band.pieces);
    if (!pieces.length) return;
    const tex = this.read({ ...line, pieces });
    if (this.alternative(tex)) return;
    const x = this.origin + Math.min(...pieces.map((p) => p.x));
    this.addPara(tex, x, this.origin + Math.max(...pieces.map(right)), gap, this.firstWord(pieces));
  }

  private letters(pieces: Piece[]): TextPiece[] {
    return pieces
      .filter((p): p is TextPiece => isText(p) && p.bold && /^[A-D]$/.test(p.text.trim()))
      .sort((a, b) => b.y - a.y || a.x - b.x);
  }

  /** Options in a row, a column or a grid: each piece goes with its letter. */
  private optionBlock(pieces: Piece[], letters: TextPiece[], line: Line): void {
    const size = line.size;
    const owner = (p: Piece) => {
      const y = p.kind === 'path' ? Math.min(...p.points.map((q) => q.y)) : p.y;
      const near = Math.min(...letters.map((l) => Math.abs(l.y - y)));
      // A line that wraps belongs to the letter above it, not the one below.
      const above = letters.filter((l) => l.y >= y - 0.75 * size);
      const row = (above.length ? above : letters).filter((l) => Math.abs(l.y - y) < near + 0.3 * size || above.length === 1);
      const pick = row.length ? row : letters.filter((l) => Math.abs(l.y - y) < near + 3);
      const top = Math.min(...pick.map((l) => l.y));
      const same = pick.filter((l) => Math.abs(l.y - top) < 3);
      return same.filter((l) => l.x <= p.x + 1).sort((a, b) => b.x - a.x)[0] ?? same[0];
    };
    for (const letter of [...letters].sort((a, b) => a.text.localeCompare(b.text))) {
      const own = pieces.filter((p) => !letters.includes(p as TextPiece) && owner(p) === letter);
      const texts = bands({ ...line, pieces: own }).map((b) => this.read({ ...line, pieces: b.pieces }));
      this.addOption(letter.text.trim(), texts.join(' ').trim());
    }
    this.open = null;
  }

  private addOption(label: string, tex: string): void {
    this.options.push({ label, tex, para: null });
    this.open = null;
  }

  private option(el: Element): void {
    const label = this.set(el.args[1]).pieces.map((p) => (isText(p) ? p.text : '')).join('').trim();
    const para: Para = { tex: this.inline(el.args[2]), x: COLUMN.option, end: 0 };
    this.options.push({ label, tex: '', para });
    this.open = para;
  }

  /** \dotline{gap}{from}{before the dots}{after them}{to} */
  private answer(el: Element): void {
    const x = Number(el.args[1]);
    const before = this.set(el.args[2]);
    const pieces = this.takeLabels(before.pieces);
    const labelled = pieces.length < before.pieces.length;
    const text = pieces.length ? this.read({ ...before, pieces }) : '';
    const equals = /=\s*$/.test(text);
    if (text && (labelled || !equals)) this.addPara(text, x, x, 0, 0);
    const mark = /\[\s*(\d+)\s*\]/.exec(el.args[3]);
    const unit = this.inline(el.args[3].replace(/\[\s*\d+\s*\]/, ''));
    const t = this.target();
    if (t) {
      t.lines++;
      if (!labelled && equals && !t.value) t.value = { label: inlineToHtml(text), unit: inlineToHtml(unit) };
    }
    if (mark) this.addMarks(Number(mark[1]));
    this.open = null;
  }

  /** \qfig{page}{l b r t}{caption}{above}{below}{left} */
  private figure(el: Element): void {
    this.open = null;
    if (this.dropUntilNumber && !this.numbered) return;
    // After the last question is answered, a figure on a new page is the
    // Periodic Table or a data page.
    if (this.source.last && this.pageBreak && this.complete() && isPageSized(el.args[1])) {
      this.done = true;
      return;
    }
    this.hasFigure = true;
    const trim = el.args[1].trim().replace(/\s+/g, ' ');
    const extra = el.optional ? `,${el.optional}` : '';
    const caption = el.args[2].trim() ? this.inline(el.args[2]) : '';
    const tex = `\\qfig[page=${el.args[0].trim()},trim=${trim},clip${extra}]{source.pdf}{${caption}}`;
    (this.lead ?? this.target()?.paras ?? this.stem).push({ tex, x: 0, end: 0, figure: true });
  }

  // ---- output ----------------------------------------------------------

  private blocks(paras: Para[]): Block[] {
    const kept = paras.filter((p) => p.figure || !/^[.…\s]*$/.test(p.tex.replace(/\\newline/g, '')));
    return toBlocks(kept.map((p) => p.tex.replace(/(?:\s*\\newline)+$/, '')).join('\n\n'), this.images);
  }

  private finish(d: Draft): Part {
    const subparts = d.subs.map((s) => this.finish(s));
    const answerSpace: AnswerSpace | null = d.value
      ? { kind: 'value', ...d.value }
      : d.lines > 0
        ? { kind: 'lines', lines: d.lines }
        : d.marks !== null
          ? { kind: 'markright' }
          : null;
    return { label: d.label, ref: d.ref, marks: marksOf(d), answerSpace, content: this.blocks(d.paras), subparts };
  }
}

/** A grouping part has no marks of its own; they live on the subparts. */
function marksOf(d: Draft): number | null {
  if (!d.subs.length) return d.marks;
  const known = d.subs.map(marksOf).filter((m): m is number => m !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) + (d.marks ?? 0) : d.marks;
}

/** Two thirds of the page wide and half of it high: a page, not a figure. */
function isPageSized(trim: string): boolean {
  const [l, b, r, t] = trim.split(/\s+/).map((v) => parseFloat(v));
  return 595 - l - r > 390 && 842 - b - t > 400;
}

/** Split at the line breaks written into a run, unless one is inside a group. */
function splitLines(tex: string): { tex: string; after: string }[] {
  const out: { tex: string; after: string }[] = [];
  const re = /\\(?:(linebreak)(?:\[\d\])?|(newline))(?![a-zA-Z])/g;
  let from = 0;
  for (let m = re.exec(tex); m; m = re.exec(tex)) {
    const part = tex.slice(from, m.index);
    const depth = (part.match(/(?<!\\)\{/g)?.length ?? 0) - (part.match(/(?<!\\)\}/g)?.length ?? 0);
    if (depth !== 0) continue;
    out.push({ tex: part, after: m[1] ? ' ' : '\\newline ' });
    from = re.lastIndex;
  }
  out.push({ tex: tex.slice(from), after: '' });
  return out;
}
