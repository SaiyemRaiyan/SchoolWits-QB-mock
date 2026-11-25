/**
 * Reduces output to what a reader sees, so a test can be written from the
 * printed page and pass for any correct rendering of it: `$\dfrac{x}{2}$`,
 * `$\frac{x}{2}$` and `\mathrm` / `<em>` choices are the same page. Nothing
 * that changes the meaning is dropped: brackets, modulus bars, signs, digits,
 * scripts, roots, fractions and letters all survive into the comparison.
 * helpers.test.ts proves both halves of that.
 */

import { expect } from 'vitest';
import { extractPaper } from '../../src/extract/index.js';
import type { ExtractedPaper } from '../../src/extract/types.js';
import type { Block, Part, Question } from '../../src/latex/types.js';

// ---- building a paper ---------------------------------------------------

/**
 * A second, plain question. A file holding a single line of a paper is not a
 * paper, and deciding which dialect a file is in is allowed to count commands.
 *
 * The filler is a real question of the same subject as the fixture (its
 * \examq code decides), so the factory picks that subject's class: a 4037
 * fixture is read by MathsExtractor, a 5070 one by ChemistryExtractor. Each
 * filler is verbatim from the paper named, renumbered 98.
 */
const FILLER = {
  physics: {
    // 5054/11/M/J/16 Q5
    mcq: String.raw`
\examq{5054/11/M/J/16}{98}{Forces or Dynamics}{1}
\mcq{38.0}{\textbf{98}}{A man pulls a sledge with a horizontal force of 60\,N.}
\stem{25.3}{A constant force of friction of 20\,N acts on the sledge.}
\stem{25.3}{In which direction is the resultant force?}
\choice{23.7}{\textbf{A }}{backwards}
\choice{21.6}{\textbf{B }}{downwards}
\choice{21.6}{\textbf{C }}{forwards}
\choice{21.7}{\textbf{D }}{upwards}`,
    structured: String.raw`
\examq{5054/21/M/J/16}{98}{Forces or Dynamics}{2}
\row{0.6}{72.3}{\lab{22.7}{\textbf{98}}A student pulls a sledge.}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(a)}}State what is meant by friction.}
\dotline{26.0}{94.9}{}{[1]}{545.6}
\partbreak
\row{26.0}{94.9}{\lab{22.6}{\textbf{(b)}}State what is meant by speed.}
\dotline{26.0}{94.9}{}{[1]}{545.6}`,
  },
  chemistry: {
    // 5070/11/M/J/16 Q38 (\choice lines: a filler set with \optrow left too few positioned lines for the
    // file to be read as positioned, and the old reader then leaked \swcut measurements)
    mcq: String.raw`
\examq{5070/11/M/J/16}{98}{Alkanes}{1}
\mcq{0.3}{\textbf{98}}{Which statement about alkanes is correct?}
\choice{23.6}{\textbf{A }}{Ethane reacts with chlorine in an addition reaction.}
\choice{21.7}{\textbf{B }}{Propane has a higher boiling point than butane.}
\choice{21.6}{\textbf{C }}{The molecule of the alkane that contains 99 carbon atoms has 200 hydrogen atoms.}
\choice{21.7}{\textbf{D }}{There are three isomers with the formula C$_{4}$H$_{10}$.}`,
    // 5070/21/M/J/20 Q7(a)
    structured: String.raw`
\examq{5070/21/M/J/20}{98}{Air}{1}
\row{36.0}{72.3}{\lab{22.7}{\textbf{98 }}Carbon dioxide is a colourless gas found in air\kern-0.60bp .}
\partbreak
\row{26.0}{95.0}{\lab{22.7}{\textbf{(a)}}The percentage of carbon dioxide in the air is increasing.}
\row{26.0}{95.0}{State one environmental problem caused by this increase.}
\dotgrid{95.45}{523.50}{3.0575}
\dotline{26.1}{95.5}{}{[1]}{545.7}`,
  },
  maths: {
    // 4037/22/M/J/17 Q3
    structured: String.raw`
\examq{4037/22/M/J/17}{98}{Factors of Polynomials}{5}
\freerow{3.69}{%
  \at{49.61}{0.01}{\textbf{98}}%
  \at{72.28}{0.01}{\textbf{Without} \textbf{using} \textbf{a} \textbf{calculator}, factorise the expression $10x^{3} - 21x^{2} + 4$.}%
  \at{532.26}{0.01}{\hfill\swmark{[5]}}}`,
  },
};

/** The filler for the fixtures' subject: the code in their first \examq. */
function fillerFor(preamble: string, questions: string[]): string {
  const code = /\\examq\{(\d{4})\//.exec(questions.join('\n'))?.[1];
  const mcq = /\\newcommand\{\\mcq\}/.test(preamble);
  if (code === '4037' || code === '4024') return FILLER.maths.structured;
  if (code === '5070') return mcq ? FILLER.chemistry.mcq : FILLER.chemistry.structured;
  return mcq ? FILLER.physics.mcq : FILLER.physics.structured;
}

/** A whole .tex file: a paper's own definitions around real questions of it. */
export function texOf(preamble: string, ...questions: string[]): string {
  return `${preamble}\n\\begin{document}\n${fillerFor(preamble, questions)}\n${questions.join("\n")}\n\\end{document}\n`;
}

export function paperOf(preamble: string, ...questions: string[]): ExtractedPaper {
  return extractPaper({ questions: texOf(preamble, ...questions) });
}

/** Wraps a few body lines of a question that is not given from its \examq. */
export function asQuestion(id: string, number: number, marks: number, body: string): string {
  return `\\examq{${id}}{${number}}{Topic}{${marks}}\n${body}`;
}

// ---- looking at a paper -------------------------------------------------

export function question(paper: ExtractedPaper, n: number): Question {
  const q = paper.questions.find((x) => x.number === n);
  if (!q) throw new Error(`no question ${n} in ${paper.questions.map((x) => x.number).join(', ')}`);
  return q;
}

/** A part by its path: part(q, 'a'), part(q, 'a', 'i'). */
export function part(q: Question, ...labels: string[]): Part {
  let list = q.parts;
  let found: Part | undefined;
  for (const label of labels) {
    found = list.find((p) => p.label === label);
    if (!found) throw new Error(`no part ${labels.join('/')}: have ${list.map((p) => p.label).join(', ') || 'none'}`);
    list = found.subparts;
  }
  return found!;
}

const html = (blocks: Block[]) => blocks.map((b) => (b.type === 'figure' ? b.caption : b.html)).join('\n');

/** Everything the question prints, in reading order, parts and options too. */
export function everything(q: Question): string {
  const parts = (list: Part[]): string => list.map((p) => `${html(p.content)}\n${parts(p.subparts)}`).join('\n');
  const options = q.options?.items.map((o) => `${o.label} ${o.content}`).join('\n') ?? '';
  return `${html(q.stem)}\n${parts(q.parts)}\n${options}`;
}

/** Plain sentences, one per text block, with tags gone and spacing kept. */
export function sentences(blocks: Block[]): string[] {
  return blocks
    .filter((b) => b.type === 'text')
    .flatMap((b) => (b as { html: string }).html.split(/<br\s*\/?>/))
    .map(plain)
    .filter((s) => s !== '');
}

export function plain(source: string): string {
  return decode(source.replace(/<[^>]+>/g, ''))
    .replace(/[‘’]/g, "'")
    .replace(/[\s  ]+/g, ' ')
    .trim();
}

export const stem = (q: Question) => canon(html(q.stem));
export const content = (p: Part) => canon(html(p.content));
export const options = (q: Question) => (q.options?.items ?? []).map((o) => `${o.label}: ${canon(o.content)}`);
export const figures = (blocks: Block[]) => blocks.filter((b) => b.type === 'figure');

export const passesOf = (paper: ExtractedPaper, n: number) => paper.passes.filter((p) => p.question === n);

// ---- the two contracts --------------------------------------------------

/** It must be read, read right, and not be flagged as doubtful. */
export function correct(paper: ExtractedPaper, n: number, actual: string, printed: string): void {
  expect(actual).toBe(canon(printed));
  expect(passesOf(paper, n), 'read correctly, so nothing should be passed over').toEqual([]);
}

/**
 * Right, or flagged. A question that is wrong and not flagged is the one
 * outcome this whole extractor exists to prevent.
 */
export function correctOrPassed(paper: ExtractedPaper, n: number, actual: string, printed: string): void {
  if (passesOf(paper, n).length > 0) return;
  expect(actual, `Q${n} is wrong and nothing says so`).toBe(canon(printed));
}

// ---- the comparable form ------------------------------------------------

const SYMBOLS: Record<string, string> = {
  times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', bullet: '•', rightarrow: '→', to: '→', longrightarrow: '→',
  rightleftharpoons: '⇌', leq: '≤', le: '≤', leqslant: '≤', geq: '≥', ge: '≥', geqslant: '≥', lt: '<', gt: '>',
  neq: '≠', ne: '≠', approx: '≈', equiv: '≡', propto: '∝', infty: '∞', circ: '°', degree: '°', textdegree: '°',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', vartheta: 'θ',
  lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω',
  Omega: 'Ω', ell: 'l', int: '∫', sum: '∑', partial: '∂', cap: '∩', cup: '∪', in: '∈', notin: '∉', subset: '⊂',
  subseteq: '⊆', emptyset: '∅', varnothing: '∅', mid: '|', vert: '|', lvert: '|', rvert: '|', ldots: '…',
  dots: '…', cdots: '…', checkmark: '✓', prime: "'", langle: '⟨', rangle: '⟩', textminus: '-', textendash: '-',
  minus: '-', lbrace: '⦃', rbrace: '⦄', lbrack: '[', rbrack: ']', lparen: '(', rparen: ')', colon: ':', backslash: '∖',
};
const FUNCTIONS = ['sin', 'cos', 'tan', 'sec', 'cosec', 'csc', 'cot', 'ln', 'lg', 'log', 'exp'];
/** Commands that change how their argument looks but not what it says. */
const LOOKS = new Set([
  'mathrm', 'mathit', 'mathbf', 'mathsf', 'mathbb', 'mathcal', 'mathscr', 'mathnormal', 'boldsymbol', 'bm', 'operatorname',
  'textit', 'textbf', 'textrm', 'textsf', 'text', 'mbox', 'emph', 'mathop', 'mathrel', 'mathbin', 'smash', 'underline',
]);
const SILENT = new Set(['left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr',
  'displaystyle', 'textstyle', 'scriptstyle', 'limits', 'nolimits', 'bf', 'rm', 'it']);

function decode(s: string): string {
  return s
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** The index just past the brace group that opens at `i`. */
function closing(s: string, i: number): number {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return j + 1;
  }
  return s.length;
}

function maths(src: string): string {
  let out = '';
  let i = 0;

  /** One argument: a group, a command with its own arguments, or a character. */
  const argument = (): string => {
    while (/\s/.test(src[i] ?? '')) i++;
    if (src[i] === '{') {
      const end = closing(src, i);
      const inner = src.slice(i + 1, end - 1);
      i = end;
      return maths(inner);
    }
    return atom();
  };

  const environment = (): string => {
    const name = /^\{([a-z]+\*?)\}/.exec(src.slice(i))?.[1] ?? '';
    i += name.length + 2;
    if (name === 'array' && src[i] === '{') i = closing(src, i);
    const end = src.indexOf(`\\end{${name}}`, i);
    const rows = src.slice(i, end).split('\\\\').map((row) => row.split('&').map((c) => maths(c)).join('&'));
    i = end + name.length + 6;
    const inner = rows.filter((r) => r !== '').join(';');
    if (name === 'pmatrix') return `(matrix{${inner}})`;
    if (name === 'bmatrix') return `[matrix{${inner}]`;
    if (name === 'vmatrix') return `|matrix{${inner}}|`;
    return /matrix|array/.test(name) ? `matrix{${inner}}` : inner;
  };

  const atom = (): string => {
    const c = src[i];
    if (c === undefined) return '';
    if (c === '{') return argument();
    if (c !== '\\') {
      i++;
      return /[~\s]/.test(c) ? '' : c;
    }
    const name = /^\\([a-zA-Z]+)/.exec(src.slice(i))?.[1];
    if (!name) {
      const symbol = src[i + 1] ?? '';
      i += 2;
      if (symbol === '{') return '⦃';
      if (symbol === '}') return '⦄';
      if (symbol === '|') return '‖';
      if (/[,:;> ]/.test(symbol)) return ' ';
      return symbol === '!' || symbol === '\\' ? '' : symbol;
    }
    i += name.length + 1;
    if (/^[dtc]?frac$/.test(name)) return `frac{${argument()}}{${argument()}}`;
    if (name === 'binom') return `(matrix{${argument()};${argument()}})`;
    if (name === 'sqrt') {
      while (/\s/.test(src[i] ?? '')) i++;
      let degree = '';
      if (src[i] === '[') {
        const end = src.indexOf(']', i);
        degree = `[${maths(src.slice(i + 1, end))}]`;
        i = end + 1;
      }
      return `√${degree}{${argument()}}`;
    }
    if (name === 'begin') return environment();
    if (name === 'overrightarrow' || name === 'vec') return `vec{${argument()}}`;
    if (name === 'overline' || name === 'bar') return `bar{${argument()}}`;
    if (name === 'text' || name === 'mbox' || /^text(rm|bf|it|sf)$/.test(name)) {
      while (/\s/.test(src[i] ?? '')) i++;
      const end = closing(src, i);
      const inner = src.slice(i + 1, end - 1);
      i = end;
      return canonLoose(inner);
    }
    if (LOOKS.has(name)) return argument();
    if (name === 'phantom' || name === 'hspace' || name === 'mkern') {
      argument();
      return '';
    }
    if (SILENT.has(name)) {
      if ((name === 'left' || name === 'right') && src[i] === '.') i++;
      return '';
    }
    if (name === 'quad' || name === 'qquad' || name === 'space') return ' ';
    if (name in SYMBOLS) return SYMBOLS[name];
    if (FUNCTIONS.includes(name)) return ` ${name} `;
    return `\\${name}`;
  };

  while (i < src.length) {
    if (src[i] === '^' || src[i] === '_') {
      const kind = src[i];
      i++;
      out += `${kind}{${argument()}}`;
    } else out += atom();
  }
  return out;
}

const RAISED = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻';
const LOWERED = '₀₁₂₃₄₅₆₇₈₉₊₋';

/** Text with its tags turned into marks, spacing still as it came. */
function canonLoose(source: string): string {
  let s = '';
  // Maths and text take turns; only text may hold tags.
  const pieces = source.split(/(\$\$[\s\S]*?\$\$|\$(?:\\[\s\S]|[^$\\])*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/);
  for (const [n, piece] of pieces.entries()) {
    if (n % 2 === 1) {
      const inner = piece.startsWith('$$') ? piece.slice(2, -2) : piece.startsWith('$') ? piece.slice(1, -1) : piece.slice(2, -2);
      s += maths(decode(inner));
      continue;
    }
    s += piece.replace(/\\([{}%&#_$])/g, '$1').replace(/\{/g, '⦃').replace(/\}/g, '⦄');
  }
  // Tags outlive the split: a script may hold maths, `<sup>$x$</sup>`.
  for (let was = ''; was !== s; ) {
    was = s;
    s = s.replace(/<(sub|sup)\b[^>]*>((?:(?!<\/?su[bp]\b)[\s\S])*)<\/\1>/g, (_, t: string, x: string) => `${t === 'sub' ? '_' : '^'}{${x}}`);
  }
  return decode(s.replace(/<br\s*\/?>/g, ' ').replace(/<\/?[a-zA-Z][^>]*>/g, ''));
}

/** Scripts on one base are one script, and the lower one is named first. */
function joinScripts(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if ((s[i] === '^' || s[i] === '_') && s[i + 1] === '{') {
      const held = { _: '', '^': '' };
      while ((s[i] === '^' || s[i] === '_') && s[i + 1] === '{') {
        const end = closing(s, i + 1);
        held[s[i] as '_' | '^'] += joinScripts(s.slice(i + 2, end - 1));
        i = end;
      }
      // 41^{°} is a degree sign, not a power.
      if (held['^'].startsWith('°')) {
        out += '°';
        held['^'] = held['^'].slice(1);
      }
      out += (held._ && `_{${held._}}`) + (held['^'] && `^{${held['^']}}`);
    } else if (s[i] === '{') {
      const end = closing(s, i);
      out += `{${joinScripts(s.slice(i + 1, end - 1))}}`;
      i = end;
    } else out += s[i++];
  }
  return out;
}

/**
 * What the reader sees. Spaces only count between words: "of the" and "ofthe"
 * differ, "2 x" and "2x" do not.
 */
export function canon(source: string): string {
  let s = canonLoose(source);
  for (const [n, c] of [...RAISED].entries()) s = s.replaceAll(c, `^{${n < 10 ? n : '+-'[n - 10]}}`);
  for (const [n, c] of [...LOWERED].entries()) s = s.replaceAll(c, `_{${n < 10 ? n : '+-'[n - 10]}}`);
  s = s
    .replace(/[−–—‐‑]/g, '-')
    .replace(/ℓ/g, 'l')
    .replace(/ℰ/g, 'E')
    .replace(/[µ]/g, 'μ')
    .replace(/[Ω]/g, 'Ω')
    .replace(/[ϕ]/g, 'φ')
    .replace(/[⟶]/g, '→')
    .replace(/[∘º]/g, '°')
    .replace(/[⩽]/g, '≤')
    .replace(/[⩾]/g, '≥')
    .replace(/[⋅]/g, '·')
    .replace(/[∣]/g, '|')
    .replace(/[●]/g, '•')
    .replace(/[‘’′]/g, "'")
    .replace(/(?:[….]\s*){3,}|…+/g, '…')
    .replace(/[\s  ]+/g, ' ');
  // A function name is set close to what it acts on.
  const fn = FUNCTIONS.join('|');
  s = s.replace(new RegExp(`(?<![a-zA-Z])(${fn})(?![a-zA-Z]) `, 'g'), '$1');
  s = s.replace(new RegExp(`((?<![a-zA-Z])[a-zA-Z]|[^a-zA-Z ]) (?=(?:${fn})(?![a-zA-Z]{2}))`, 'g'), '$1');
  s = s.replace(/ /g, (_, at: number) => {
    const before = /[a-zA-Z]+$/.exec(s.slice(0, at))?.[0] ?? '';
    const after = /^[a-zA-Z]+/.exec(s.slice(at + 1))?.[0] ?? '';
    return before && after && before.length + after.length > 2 ? ' ' : '';
  });
  return joinScripts(s);
}
