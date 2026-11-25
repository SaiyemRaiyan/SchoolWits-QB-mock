/**
 * The page-layout dialect -> the same stem / parts / options the documented
 * format produces.
 *
 * Papers from 2016 on are written as a copy of the official page: every
 * element carries the distance from the one before it (`\row{26.0}{94.9}{..}`)
 * and nothing says what it IS. The text is still plain text, so this reads
 * the commands for meaning and throws the measurements away:
 *
 *   \mcq \stem \row \prow   a paragraph
 *   \lab{..}{\textbf{(a)}}  the start of a part; (i) of a subpart
 *   \choice \optrow         an MCQ option
 *   \dotline \qmark         an answer line, and where the marks are written
 *   \qfig{page}{trim}...    a figure clipped from the source PDF
 *   \freerow + \at          text placed piece by piece; rebuilt by position
 *
 * Unlike the documented format, part labels are WRITTEN here, so they are
 * read rather than generated from list position.
 *
 * What it will not do is guess: maths drawn from symbol images (\swglyph)
 * or paths (\swpath) is reported as unreadable instead of approximated.
 */

import { toBlocks } from './content.js';
import { inlineToHtml } from './inline.js';
import { readGroup, readOptional } from './scan.js';
import type { AnswerSpace, Block, ImageMap, Options, Part } from './types.js';

export interface LayoutQuestion {
  stem: Block[];
  parts: Part[];
  options: Options | null;
  /** A line was rebuilt from positioned pieces; worth a human look. */
  positioned: boolean;
  /** Contains maths drawn as images or paths, which cannot be read. */
  unreadable: boolean;
  /** Commands seen that this module does not model. */
  unknown: string[];
}

// How many {groups} each element takes.
const ELEMENTS: Record<string, number> = {
  mcq: 3,
  stem: 2,
  choice: 3,
  optrow: 5,
  row: 3,
  prow: 3,
  dotline: 5,
  qmark: 2,
  freerow: 2,
  qfig: 6,
};
// Pure page furniture: skipped along with its arguments.
const SKIPPED: Record<string, number> = {
  partbreak: 0,
  pagestart: 0,
  swpage: 0,
  newpage: 0,
  gap: 1,
  hang: 1,
  total: 1,
  dotgrid: 3,
  swdepth: 1,
};

type Token = { name: string; args: string[]; optional: string | null } | { name: 'text'; raw: string };

function readGroups(src: string, from: number, count: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let i = from;
  for (let n = 0; n < count; n++) {
    while (/\s/.test(src[i] ?? '')) i++;
    const g = readGroup(src, i);
    if (!g) return null;
    args.push(g.value);
    i = g.end;
  }
  return { args, end: i };
}

/** Cut a question body into its elements, keeping loose text between them. */
function tokenize(body: string): Token[] {
  const out: Token[] = [];
  let text = '';
  const flush = () => {
    if (text.trim()) out.push({ name: 'text', raw: text.trim() });
    text = '';
  };

  let i = 0;
  while (i < body.length) {
    const m = body[i] === '\\' ? /^\\([a-zA-Z]+)/.exec(body.slice(i, i + 24)) : null;
    const name = m?.[1];
    if (name && name in ELEMENTS) {
      let j = i + m![0].length;
      const opt = name === 'qfig' ? readOptional(body, j) : null;
      if (opt) j = opt.end;
      const read = readGroups(body, j, ELEMENTS[name]);
      if (read) {
        flush();
        out.push({ name, args: read.args, optional: opt?.value ?? null });
        i = read.end;
        continue;
      }
    } else if (name && name in SKIPPED) {
      let j = i + m![0].length;
      // \total takes its argument only in some papers.
      const wanted = name === 'total' && body[j] !== '{' ? 0 : SKIPPED[name];
      j = readGroups(body, j, wanted)?.end ?? j;
      i = j;
      continue;
    }
    text += body[i];
    i++;
  }
  flush();
  return out;
}

// Symbol-font codes, as \swsy{57} writes them.
const SYMBOL: Record<string, string> = {
  '57': 'Ω', '70': 'π', '6D': 'μ', '6C': 'λ', '71': 'θ', '61': 'α', '62': 'β', '67': 'γ',
  '44': 'Δ', '72': 'ρ', '77': 'ω', '66': 'φ', '73': 'σ', '74': 'τ', '65': 'ε', '53': 'Σ',
  B0: '°', B4: '×', B8: '÷', B1: '±', '2D': '−', D7: '·', A3: '≤', B3: '≥', BB: '≈',
  B9: '≠', AE: '→', D6: '√', A5: '∞', B5: '∝',
};

// ZapfDingbats codes, as \usefont{U}{pzd}{m}{n}\char"33 writes them.
const DINGBAT: Record<string, string> = { '33': '✓', '34': '✔', '35': '✕', '36': '✖', '37': '✗', '38': '✘' };

// A group's contents, allowing one more level of braces inside it.
const INNER = String.raw`(?:[^{}]|\{[^{}]*\})*`;
const PLAB = new RegExp(String.raw`\\plab\{[^{}]*\}\{(${INNER})\}`, 'g');
const PHANTOM = new RegExp(String.raw`\\phantom\{${INNER}\}`, 'g');

// Commands inlineToHtml (or KaTeX) deals with; anything else is reported.
const KNOWN_INLINE = new Set([
  'textbf', 'textit', 'emph', 'textsuperscript', 'textsubscript', 'pow', 'ohms', 'degC', 'dg',
  'times', 'newline', 'mbox', 'text', 'ldots', 'dots', 'ge', 'le', 'pm', 'textperiodcentered',
  'underline', 'qfig', 'dfrac', 'mathrm',
]);

interface Notes {
  unknown: Set<string>;
  unreadable: boolean;
}

/**
 * Fractions stacked inside a line:
 *   \rlap{\kern0bp\raisebox{5bp}[..]{V}}\rlap{..{-7bp}..{I}}\rlap{..{\rule{..}{..}}}
 * What is raised above the rule is the top, what sits below it the bottom.
 * Without this the pieces run together and V/I silently reads "VI".
 */
function inlineFractions(src: string, notes: Notes): string {
  const OPEN = /^\\rlap(?=\{)/;
  let out = '';
  let i = 0;
  while (i < src.length) {
    const pieces: { y: number; raw: string }[] = [];
    let j = i;
    while (OPEN.test(src.slice(j, j + 6))) {
      const group = readGroup(src, j + 5);
      const m = group && /^\s*(?:\\kern-?[\d.]+bp\s*)?\\raisebox\{(-?[\d.]+)bp\}(?:\[[^\]]*\])*(\{[\s\S]*\})\s*$/.exec(group.value);
      if (!group || !m) break;
      pieces.push({ y: Number(m[1]), raw: m[2].slice(1, -1) });
      j = group.end;
    }
    const rule = pieces.find((p) => /^\s*\\rule\{/.test(p.raw));
    const side = (above: boolean) =>
      pieces
        .filter((p) => p !== rule && p.y > rule!.y === above)
        .map((p) => cleanInline(p.raw, notes).replace(/\$/g, ''))
        .join(' ');
    const [top, bottom] = rule ? [toMath(side(true)), toMath(side(false))] : [null, null];
    if (top && bottom) {
      out += `$\\dfrac{${top}}{${bottom}}$`;
      i = j;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

/**
 * Strip the typesetting out of a run of text, leaving the documented
 * format's inline commands. The kerns matter most: the paper nudges letters
 * mid-word ("f\kern-0.33bp orce"), and left in they would split every such
 * word in two for search.
 */
function cleanInline(src: string, notes: Notes): string {
  // Typed maths is already what we want: KaTeX reads it, so it is set aside
  // and nothing below (kern stripping, the unknown-command check) touches it.
  const maths: string[] = [];
  let s = inlineFractions(src, notes).replace(/\$(?:\\[\s\S]|[^\\$])*\$/g, (m) => `\u0002${maths.push(m) - 1}\u0003`);

  // \swclip sets a small picture in the line ("appears like this [compass]"):
  // a figure. \swglyph is one symbol of an equation: not readable.
  s = s.replace(
    /\\swclip\{([^{}]*)\}\{([^{}]*)\}/g,
    (_, page: string, trim: string) => `\\qfig[page=${page.trim()},trim=${trim.trim()},clip]{source.pdf}{}`,
  );
  if (/\\(?:swglyph|swpath)\b/.test(s)) notes.unreadable = true;
  s = s.replace(/\\swglyph\{[^{}]*\}\{[^{}]*\}/g, '');

  s = s
    .replace(/\\(?:begingroup|endgroup|null)(?![a-zA-Z])\s*/g, '')
    // Spacing and letter-fit settings: they print nothing, so their numbers go too.
    .replace(/\\parfillskip-?[\d.]+pt/g, '')
    .replace(/\\par(?![a-zA-Z])/g, '')
    .replace(/\\advance\\x?spaceskip-?[\d.]+bp/g, '')
    .replace(/\\textls(?:\[[^\]]*\])?(?=\{)/g, '')
    .replace(/\\smash(?=\{)/g, '')
    // A slanted symbol: the \phantom only reserves the width already used.
    .replace(/\\pdfsetmatrix\{[^{}]*\}|\\pdfsave(?![a-zA-Z])|\\pdfrestore(?![a-zA-Z])/g, '')
    .replace(PHANTOM, '')
    .replace(PLAB, '$1 ')
    .replace(/\\usefont\{U\}\{pzd\}\{m\}\{n\}\\char"([0-9A-Fa-f]{2})/g, (_, hex: string) => {
      if (!DINGBAT[hex]) notes.unknown.add(`pzd{${hex}}`);
      return DINGBAT[hex] ?? '';
    })
    // Dots for the student to write on, set as ellipses from a named font.
    .replace(/\\font\\(\w+)=\w+ at [\d.]+bp\\\1\\char"85/g, '…')
    .replace(/\\vadjust\{[^{}]*\}/g, '')
    .replace(/\\rule\{[^{}]*\}\{[^{}]*\}/g, '')
    .replace(/\\x?spaceskip=-?[\d.]+bp/g, '')
    .replace(/\\hskip-?[\d.]+pt(?:\s*(?:plus|minus)\s*-?[\d.]+(?:bp|pt|fil+))*/g, '')
    .replace(/\\(?:relax|nobreak|strut|ignorespaces|unskip|hfill)\b ?/g, '')
    .replace(/\\linebreak\b/g, ' ')
    // A kern eats the space after its unit. A wide one is a real word gap.
    .replace(/\\kern(-?[\d.]+)(?:bp|pt) ?/g, (_, n: string) => (Number(n) >= 2 ? ' ' : ''))
    .replace(/\\raisebox\{[^{}]*\}(?:\[[^\]]*\])*/g, '')
    .replace(/\\(?:makebox|rlap|llap)(?:\[[^\]]*\])*/g, '')
    .replace(/\\swf\{[^{}]*\}\{[^{}]*\}\{([^{}]*)\}/g, (_, t: string) => {
      const letter = t.replace(/^\\itshape\s*/, '');
      return letter === 'I' || letter !== t ? `\\textit{${letter}}` : t;
    })
    .replace(/\\vI\b/g, '\\textit{I}')
    .replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}\\selectfont\s*/g, '')
    .replace(/\{\\itshape\s*/g, '\\textit{')
    .replace(/\{\\bfseries\s*/g, '\\textbf{')
    .replace(/\\(?:stack(?:\[[^\]]*\])?|nuc)\{([^{}]*)\}\{([^{}]*)\}/g, '\\textsuperscript{$1}\\textsubscript{$2}')
    .replace(/\\sub\{/g, '\\textsubscript{')
    .replace(/\\swsy\{([0-9A-Fa-f]+)\}/g, (_, hex: string) => {
      const symbol = SYMBOL[hex.toUpperCase()];
      if (!symbol) notes.unknown.add(`swsy{${hex}}`);
      return symbol ?? '';
    })
    .replace(/\\x(?![a-zA-Z])/g, '×')
    .replace(/\\textendash(?:\{\})?/g, '–')
    .replace(/\\textminus(?:\{\})?/g, '−')
    .replace(/\\textdegree(?:\{\})?/g, '°')
    .replace(/\\(?:swbul|textbullet)\b/g, '•')
    .replace(/\\texttimes\b/g, '×')
    .replace(/\\textdiv\b/g, '÷')
    .replace(/\\pounds\b/g, '£');

  for (const m of s.matchAll(/\\([a-zA-Z]+)/g)) {
    if (!KNOWN_INLINE.has(m[1])) notes.unknown.add(m[1]);
  }
  return s
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .replace(/\u0002(\d+)\u0003/g, (_, i: string) => maths[Number(i)]);
}

/** Bare text of a label such as `\textbf{(a)}` or `\textbf{1 }`. */
function plain(raw: string): string {
  return raw
    .replace(/\\kern-?[\d.]+bp ?/g, '')
    .replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}\s]/g, '');
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];

/** A label at the start of a line: `\lab{w}{..}`, or a bare bold `(a)`. */
function takeLabel(text: string): { label: string; rest: string } | null {
  const t = text.trimStart();
  const lab = /^\\lab\s*/.exec(t);
  if (lab) {
    const read = readGroups(t, lab[0].length, 2);
    if (read) return { label: plain(read.args[1]), rest: t.slice(read.end) };
  }
  if (t.startsWith('\\textbf{')) {
    const g = readGroup(t, 7);
    if (g && /^\([a-z]{1,4}\)$/.test(plain(g.value))) return { label: plain(g.value), rest: t.slice(g.end) };
  }
  return null;
}

interface Draft {
  label: string;
  ref: string;
  raw: string[];
  marks: number | null;
  lines: number;
  value: { label: string; unit: string } | null;
  subs: Draft[];
}

interface Piece {
  x: number;
  y: number;
  raw: string;
}

/** Set in the small type of an index or suffix. */
function isSmallPiece(p: Piece): boolean {
  return Number(/\\fontsize\{([\d.]+)bp\}/.exec(p.raw)?.[1] ?? 99) <= 8.5;
}

/** TeX for a fraction's top or bottom, or null when it is not simple enough. */
function toMath(text: string): string | null {
  // Italics and bare groups first, inside out: maths letters are italic anyway.
  let flat = text;
  for (let was = ''; was !== flat; ) {
    was = flat;
    flat = flat.replace(/\\textit\{([^{}]*)\}/g, '$1').replace(/(^|[^\\a-zA-Z^_])\{([^{}]*)\}/g, '$1$2');
  }
  const m = flat
    .replace(/\\textsuperscript\{([^{}]*)\}/g, '^{$1}')
    .replace(/\\textsubscript\{([^{}]*)\}/g, '_{$1}')
    .replace(/\\pow\{([^{}]*)\}/g, '^{$1}')
    .replace(/\\,/g, ' ');
  if (/[\\$]/.test(m)) return null;
  return m
    .trim()
    .replace(/[A-Za-z]{2,}/g, (word) => `\\mathrm{${word}}`)
    .replace(/\s+/g, '\\,');
}

export function parseLayoutQuestion(
  body: string,
  questionNumber: number,
  images: ImageMap = {},
): LayoutQuestion {
  const notes: Notes = { unknown: new Set(), unreadable: false };
  let positioned = false;

  const stem: string[] = [];
  const parts: Draft[] = [];
  const options: Options['items'] = [];
  const isMcq = /\\mcq\s*\{/.test(body);
  let hasFigure = false;
  let part: Draft | null = null;
  let sub: Draft | null = null;
  // Questions whose parts are (i), (ii) with no (a) above them.
  let topRoman = false;
  // Where loose text following an element belongs (a wrapped line).
  let append: ((more: string) => void) | null = null;

  const target = () => sub ?? part;
  const addMarks = (n: number) => {
    const t = target();
    if (t) t.marks = (t.marks ?? 0) + n;
  };

  const newDraft = (label: string, parentRef: string): Draft => ({
    label,
    ref: `${parentRef}(${label})`,
    raw: [],
    marks: null,
    lines: 0,
    value: null,
    subs: [],
  });

  const openLabel = (label: string) => {
    const roman = ROMAN.includes(label);
    if (!part && roman) topRoman = true;

    // "(i)" is the ninth letter as well as the first numeral; it is a
    // letter only where it directly continues the lettering.
    const continuesLetters =
      part !== null &&
      part.subs.length === 0 &&
      label.length === 1 &&
      label.charCodeAt(0) === part.label.charCodeAt(0) + 1;

    const asSub = part !== null && (topRoman ? !roman : roman && !continuesLetters);
    if (asSub) {
      sub = newDraft(label, part!.ref);
      part!.subs.push(sub);
    } else {
      part = newDraft(label, String(questionNumber));
      parts.push(part);
      sub = null;
    }
  };

  const addPara = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const list = target()?.raw ?? stem;
    list.push(text);
    const at = list.length - 1;
    append = (more) => {
      list[at] += ` ${more}`;
    };
  };

  /** `\swmark{[2]}` sets a part's marks at the end of its last line. */
  const takeMarks = (raw: string) =>
    raw.replace(/\\swmark\{\s*\[(\d+)\]\s*\}/g, (_, n: string) => {
      pendingMarks.push(Number(n));
      return '';
    });

  /** Marks written into the text, then labels, then the paragraph itself. */
  const addLine = (raw: string) => {
    let text = takeMarks(raw);
    for (let found = takeLabel(text); found; found = takeLabel(text)) {
      const inner = /^\(([a-z]+)\)$/.exec(found.label);
      text = found.rest;
      if (inner) openLabel(inner[1]);
      // The question number is dropped; "1." numbers a point inside a
      // subpart and stays in the text.
      else if (!/^\d+$/.test(found.label)) {
        text = found.label === '•' ? `• ${found.rest}` : `\\textbf{${found.label}} ${found.rest}`;
        break;
      }
    }
    addPara(cleanInline(text, notes));
    pendingMarks.splice(0).forEach(addMarks);
  };
  const pendingMarks: number[] = [];

  /** Join pieces left to right, turning anything over a rule into a fraction. */
  const compose = (pieces: Piece[], rules: { x1: number; x2: number; y: number }[], base: number) => {
    const used = new Set<Piece>();
    const tokens: { x: number; text: string }[] = [];
    /** Raised and lowered small print is read against `line`, its own baseline. */
    const scripted = (p: Piece, text: string, line: number) => {
      const raised = isSmallPiece(p) ? p.y - line : 0;
      return raised > 2.5 ? `\\textsuperscript{${text}}` : raised < -0.8 ? `\\textsubscript{${text}}` : text;
    };
    const join = (list: Piece[]) => {
      const line = list.find((p) => !isSmallPiece(p))?.y ?? list[0].y;
      return list
        .sort((a, b) => a.x - b.x)
        .map((p) => scripted(p, cleanInline(p.raw, notes), line))
        .join(' ')
        .replace(/ (\\textsuperscript|\\textsubscript)/g, '$1');
    };

    for (const rule of rules) {
      const over = pieces.filter((p) => p.x >= rule.x1 - 6 && p.x <= rule.x2 + 3);
      const top = over.filter((p) => p.y > rule.y);
      const bottom = over.filter((p) => p.y < rule.y);
      if (!top.length || !bottom.length) continue;
      [...top, ...bottom].forEach((p) => used.add(p));
      const [n, d] = [join(top), join(bottom)];
      const [mn, md] = [toMath(n), toMath(d)];
      tokens.push({ x: rule.x1, text: mn && md ? `$\\dfrac{${mn}}{${md}}$` : `(${n}) / (${d})` });
    }

    for (const p of pieces) {
      if (used.has(p)) continue;
      const text = cleanInline(p.raw, notes);
      if (text) tokens.push({ x: p.x, text: scripted(p, text, base) });
    }

    return tokens
      .sort((a, b) => a.x - b.x)
      .map((t) => t.text)
      .join(' ')
      .replace(/ (\\textsuperscript|\\textsubscript)/g, '$1')
      .replace(/\s+([,.;:)])/g, '$1');
  };

  const freerow = (inner: string) => {
    positioned = true;
    if (/\\(?:swglyph|swpath)\b/.test(inner)) notes.unreadable = true;

    const pieces: Piece[] = [];
    const rules: { x1: number; x2: number; y: number }[] = [];
    for (const m of inner.matchAll(/\\(at|ruleat)\s*(?=\{)/g)) {
      const read = readGroups(inner, m.index! + m[0].length, m[1] === 'at' ? 3 : 4);
      if (!read) continue;
      const [a, b, c] = read.args;
      if (m[1] === 'at') pieces.push({ x: Number(a), y: Number(b), raw: c });
      else rules.push({ x1: Number(a), x2: Number(b), y: Number(c) });
    }

    // A minus drawn over other text, as a lone "_". It belongs in the one wide
    // gap left for it; with no such gap there is no telling what it sits between.
    for (const minus of pieces.filter((p) => p.raw.trim() === '\\_')) {
      const GAP = /\\kern(?:[89]|\d{2,})(?:\.\d+)?bp ?/g;
      const under = pieces.filter(
        (p) => p.x < minus.x && minus.y - p.y > 2 && minus.y - p.y < 7 && p.raw.match(GAP)?.length === 1,
      );
      if (under.length === 1) {
        under[0].raw = under[0].raw.replace(GAP, ' − ');
        pieces.splice(pieces.indexOf(minus), 1);
      } else notes.unreadable = true;
    }

    const isLetter = (p: Piece) => /^\\textbf\{\s*[A-D]\s*\}$/.test(p.raw.trim());
    const letters = pieces.filter(isLetter).sort((a, b) => b.y - a.y || a.x - b.x);
    const first = Math.min(...pieces.map((p) => p.x));

    // Options, in a row, a column or a grid. A single letter is one option only
    // at the left edge of a multiple-choice question; elsewhere it is a name.
    if (letters.length >= 2 || (isMcq && letters.length === 1 && letters[0].x === first)) {
      // Everything belongs to the nearest line of letters, then to the last
      // letter to its left on that line.
      const owner = (x: number, y: number) => {
        const near = Math.min(...letters.map((l) => Math.abs(l.y - y)));
        const line = letters.filter((l) => Math.abs(l.y - y) < near + 3);
        return line.filter((l) => l.x <= x).sort((a, b) => b.x - a.x)[0] ?? line[0];
      };
      for (const letter of letters) {
        const content = compose(
          pieces.filter((p) => !isLetter(p) && owner(p.x, p.y) === letter),
          rules.filter((r) => owner(r.x1, r.y) === letter),
          letter.y,
        );
        options.push({ label: plain(letter.raw), content: inlineToHtml(content) });
      }
      append = null;
      return;
    }

    // Otherwise a line of text. Its baseline is where most pieces sit.
    const counts = new Map<number, number>();
    for (const p of pieces) counts.set(Math.round(p.y), (counts.get(Math.round(p.y)) ?? 0) + 1);
    const base = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

    const body: Piece[] = [];
    for (const p of pieces.sort((a, b) => a.x - b.x)) {
      const mark = /\\swmark\{\s*\[(\d+)\]\s*\}/.exec(p.raw);
      const label = /^\\textbf\{[^{}]*\}$/.test(p.raw.trim()) ? plain(p.raw) : '';
      const inner2 = /^\(([a-z]+)\)$/.exec(label);
      if (mark) pendingMarks.push(Number(mark[1]));
      else if (inner2) openLabel(inner2[1]);
      else if (/^\d+$/.test(label) && Number(label) === questionNumber) continue;
      else body.push(p);
    }
    // Several full lines of text in one block are read one after another. A gap
    // this deep with nothing between, both sides starting at the left, is a line
    // break rather than the two halves of a fraction or a matrix.
    const readLines = (block: Piece[], lineRules: typeof rules, line: number): string => {
      const ys = [...new Set(block.filter((p) => !isSmallPiece(p)).map((p) => p.y))].sort((a, b) => b - a);
      const gap = ys.findIndex((y, n) => n > 0 && ys[n - 1] - y > 10);
      if (gap > 0) {
        const cut = (ys[gap - 1] + ys[gap]) / 2;
        const upper = block.filter((p) => p.y > cut);
        const lower = block.filter((p) => p.y <= cut);
        const left = (l: Piece[]) => Math.min(...l.map((p) => p.x));
        const isText = (l: Piece[]) => l.some((p) => /[a-z]{3,}.*\s.*[a-z]{2,}/.test(cleanInline(p.raw, notes)));
        const crossed = lineRules.some((r) => {
          const over = block.filter((p) => p.x >= r.x1 - 6 && p.x <= r.x2 + 3);
          return Math.abs(r.y - cut) < 4 || (r.y <= cut && over.some((p) => p.y > cut && p.y - r.y < 10));
        });
        if (Math.abs(left(upper) - left(lower)) < 3 && isText(upper) && isText(lower) && !crossed) {
          const top = compose(upper, lineRules.filter((r) => r.y > cut), ys[0]);
          return `${top} ${readLines(lower, lineRules.filter((r) => r.y <= cut), ys[gap])}`;
        }
      }
      return compose(block, lineRules, line);
    };

    addPara(readLines(body, rules, base));
    pendingMarks.splice(0).forEach(addMarks);
  };

  for (const token of tokenize(body)) {
    if (token.name === 'text') {
      const more = cleanInline(takeMarks((token as { raw: string }).raw), notes);
      if (append) append(more);
      else addPara(more);
      pendingMarks.splice(0).forEach(addMarks);
      continue;
    }
    const { name, args, optional } = token as { name: string; args: string[]; optional: string | null };

    if (name === 'mcq') addLine(args[2]);
    else if (name === 'stem') addLine(args[1]);
    else if (name === 'row' || name === 'prow') addLine(args[2]);
    else if (name === 'freerow') freerow(args[1]);
    else if (name === 'qmark') {
      const m = /\[(\d+)\]/.exec(args[1]);
      if (m) addMarks(Number(m[1]));
    } else if (name === 'choice') {
      const item = { label: plain(args[1]), content: inlineToHtml(cleanInline(args[2], notes)) };
      options.push(item);
      append = (more) => {
        item.content = inlineToHtml(`${item.content} ${more}`);
      };
    } else if (name === 'optrow') {
      ['A', 'B', 'C', 'D'].forEach((label, i) => {
        options.push({ label, content: inlineToHtml(cleanInline(args[i + 1], notes)) });
      });
      append = null;
    } else if (name === 'dotline') {
      // \dotline{gap}{from}{before the dots}{after them}{to}
      const before = args[2].trim();
      const labelled = takeLabel(before);
      const mark = /\[(\d+)\]/.exec(args[3]);
      if (labelled || (before && !/=\s*$/.test(plain(before)))) addLine(before);
      const t = target();
      if (t) {
        t.lines++;
        if (!labelled && /=\s*$/.test(plain(before)) && !t.value) {
          t.value = {
            label: inlineToHtml(cleanInline(before, notes)),
            unit: inlineToHtml(cleanInline(args[3].replace(/\[\d+\]/, ''), notes)),
          };
        }
      }
      if (mark) addMarks(Number(mark[1]));
      append = null;
    } else if (name === 'qfig') {
      // \qfig{page}{l b r t}{caption}{above}{below}{left}
      hasFigure = true;
      const trim = args[1].trim().replace(/\s+/g, ' ');
      const extra = optional ? `,${optional}` : '';
      const list = target()?.raw ?? stem;
      list.push(`\\qfig[page=${args[0].trim()},trim=${trim},clip${extra}]{source.pdf}{${cleanInline(args[2], notes)}}`);
      append = null;
    }
  }

  const finish = (d: Draft): Part => {
    const subparts = d.subs.map(finish);
    const known = subparts.map((p) => p.marks).filter((m): m is number => m !== null);
    const answerSpace: AnswerSpace | null = d.value
      ? { kind: 'value', ...d.value }
      : d.lines > 0
        ? { kind: 'lines', lines: d.lines }
        : d.marks !== null
          ? { kind: 'markright' }
          : null;
    return {
      label: d.label,
      ref: d.ref,
      // A grouping part has no marks of its own; they live on the subparts.
      marks: subparts.length > 0 ? (known.length ? known.reduce((a, b) => a + b, 0) + (d.marks ?? 0) : d.marks) : d.marks,
      answerSpace,
      content: toBlocks(d.raw.join('\n\n'), images),
      subparts,
    };
  };

  return {
    stem: toBlocks(stem.join('\n\n'), images),
    parts: parts.map(finish),
    options: options.length
      ? { source: 'choices', items: options }
      : hasFigure
        ? { source: 'figure', items: [] }
        : null,
    positioned,
    unreadable: notes.unreadable,
    unknown: [...notes.unknown],
  };
}
