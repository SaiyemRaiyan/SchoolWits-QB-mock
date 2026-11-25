/**
 * The extractor's own inline LaTeX -> maths, for the top of a fraction or the
 * inside of a root. It reads only what this module's siblings write, so it can
 * be strict: anything else is null, and the line passes.
 */

import { readGroup } from '../latex/scan.js';

const FUNCTIONS = /^(?:arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|sec|cot|cosec|log|ln|lg|exp|det|max|min)$/;

const SIGNS: Record<string, string> = {
  '−': '-', '–': '-', '×': '\\times ', '÷': '\\div ', '±': '\\pm ', '·': '\\cdot ', '°': '^{\\circ}', '…': '\\ldots ',
  '≤': '\\leq ', '≥': '\\geq ', '≠': '\\neq ', '≈': '\\approx ', '∞': '\\infty ', '→': '\\rightarrow ', '′': "'", '″': "''",
  '∩': '\\cap ', '∪': '\\cup ', '∈': '\\in ', '∉': '\\notin ', '⊂': '\\subset ', '⊆': '\\subseteq ', '∅': '\\varnothing ',
  '⇌': '\\rightleftharpoons ', '∝': '\\propto ', '∂': '\\partial ', '∫': '\\int ', '∑': '\\sum ', '√': '\\surd ', '’': "'",
  'ℝ': '\\mathbb{R}', 'ℰ': '\\mathscr{E}', '↦': '\\mapsto ', '%': '\\%', '#': '\\#', '&': '\\&', '□': '\\square ',
};

const GREEK: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'varepsilon', ζ: 'zeta', η: 'eta', θ: 'theta', κ: 'kappa', λ: 'lambda',
  μ: 'mu', ν: 'nu', ξ: 'xi', π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', φ: 'phi', ϕ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
  Γ: 'Gamma', Δ: 'Delta', Θ: 'Theta', Λ: 'Lambda', Π: 'Pi', Σ: 'Sigma', Φ: 'Phi', Ψ: 'Psi', Ω: 'Omega',
};

const WRAP: Record<string, (inner: string) => string> = {
  textbf: (t) => `\\mathbf{${t}}`,
  textsuperscript: (t) => `^{${t}}`,
  textsubscript: (t) => `_{${t}}`,
  underline: (t) => `\\underline{${t}}`,
};

/** Maths for a run of inline LaTeX, or null when it holds anything unknown. */
export function toMath(tex: string, italic = false): string | null {
  let out = '';
  let i = 0;
  const letters = /[A-Za-z]+/y;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === '$') {
      const end = tex.indexOf('$', i + 1);
      if (end === -1) return null;
      out += ` ${tex.slice(i + 1, end)} `;
      i = end + 1;
    } else if (ch === '\\') {
      const m = /^\\([a-zA-Z]+)\{/.exec(tex.slice(i, i + 24));
      if (m) {
        const g = readGroup(tex, i + m[0].length - 1);
        if (!g) return null;
        const inner = toMath(g.value, m[1] === 'textit' || (italic && m[1] !== 'textbf'));
        if (inner === null) return null;
        if (m[1] === 'textit') out += inner;
        else if (WRAP[m[1]]) out += WRAP[m[1]](inner);
        else return null;
        i = g.end;
      } else if (/[%#&_${}]/.test(tex[i + 1] ?? '')) {
        out += `\\${tex[i + 1]}`;
        i += 2;
      } else return null;
    } else if (/[A-Za-z]/.test(ch)) {
      letters.lastIndex = i;
      const word = letters.exec(tex)![0];
      out += italic ? (word.length > 3 ? `\\textit{${word}}` : word) : upright(word);
      i += word.length;
    } else if (/[0-9+=()[\].,:;!/|<>*?-]/.test(ch)) {
      out += ch;
      i++;
    } else if (ch === ' ') {
      // Between words a space is printed; between signs KaTeX sets its own.
      // (A script attaches to what it follows: no space before it.)
      out += /[A-Za-z},.]$/.test(out) && /^ (?:[A-Za-z(]|\\(?!text(?:super|sub)script\{))/.test(tex.slice(i)) ? '\\;' : ' ';
      i++;
    } else {
      const sign = SIGNS[ch] ?? (GREEK[ch] ? `\\${GREEK[ch]} ` : null);
      if (sign === null) return null;
      out += sign;
      i++;
    }
  }
  return out.trim();
}

/** Upright letters: a function's name, the d of dy/dx, or a word. */
function upright(word: string): string {
  if (word === 'cosec') return '\\operatorname{cosec}';
  if (FUNCTIONS.test(word)) return `\\${word} `;
  return `\\mathrm{${word}}`;
}
