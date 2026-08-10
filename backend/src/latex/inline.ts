/**
 * Inline LaTeX -> HTML fragment.
 *
 * The one rule that matters: **math is never touched.** `$...$`, `$$...$$`,
 * `\(...\)` and `\[...\]` are lifted out before any transformation and put
 * back verbatim afterwards, so KaTeX renders them in the browser exactly as
 * it does today. Everything here is about the *prose* around the math.
 */

const MATH_OPEN = '';
const MATH_CLOSE = '';

interface MathSlot {
  raw: string;
}

/**
 * Lift math spans out, replacing each with a sentinel that survives HTML
 * escaping (control characters, so they can't collide with content and
 * can't be mistaken for markup).
 */
function protectMath(src: string): { text: string; slots: MathSlot[] } {
  const slots: MathSlot[] = [];
  let out = '';
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    // A `\\` line break must be consumed as a unit BEFORE the \[ check.
    // Otherwise `\\[4pt]` reads as backslash + `\[`, opening display math
    // that then swallows everything up to the next `\]` — silently eating
    // whole paragraphs of a worked solution.
    if (ch === '\\' && next === '\\') {
      out += '\\\\';
      i += 2;
      continue;
    }

    // \( ... \)  and  \[ ... \]
    if (ch === '\\' && (next === '(' || next === '[')) {
      const closer = next === '[' ? '\\]' : '\\)';
      const end = src.indexOf(closer, i + 2);
      if (end !== -1) {
        slots.push({ raw: src.slice(i, end + 2) });
        out += `${MATH_OPEN}${slots.length - 1}${MATH_CLOSE}`;
        i = end + 2;
        continue;
      }
    }

    // $$ ... $$  and  $ ... $   (an escaped \$ is a literal dollar sign)
    if (ch === '$' && src[i - 1] !== '\\') {
      const isDisplay = next === '$';
      const delim = isDisplay ? '$$' : '$';
      let j = i + delim.length;
      let end = -1;
      while (j < src.length) {
        if (src[j] === '$' && src[j - 1] !== '\\') {
          if (isDisplay) {
            if (src[j + 1] === '$') {
              end = j;
              break;
            }
          } else {
            end = j;
            break;
          }
        }
        j++;
      }
      if (end !== -1) {
        slots.push({ raw: src.slice(i, end + delim.length) });
        out += `${MATH_OPEN}${slots.length - 1}${MATH_CLOSE}`;
        i = end + delim.length;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return { text: out, slots };
}

function restoreMath(src: string, slots: MathSlot[]): string {
  return src.replace(
    new RegExp(`${MATH_OPEN}(\\d+)${MATH_CLOSE}`, 'g'),
    (_, n: string) => slots[Number(n)]?.raw ?? '',
  );
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Replace `\cmd{...}` with a wrapper, brace-aware so nested groups survive.
 * Runs repeatedly until stable so nesting like \textbf{\textit{x}} resolves.
 */
function wrapCommand(src: string, name: string, open: string, close: string): string {
  let out = src;
  for (let pass = 0; pass < 5; pass++) {
    const before = out;
    out = replaceOnce(out, name, open, close);
    if (out === before) break;
  }
  return out;
}

function replaceOnce(src: string, name: string, open: string, close: string): string {
  const re = new RegExp(`\\\\${name}(?![a-zA-Z])\\s*\\{`, 'g');
  const m = re.exec(src);
  if (!m) return src;

  const braceStart = m.index + m[0].length - 1;
  let depth = 1;
  let i = braceStart + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{' && src[i - 1] !== '\\') depth++;
    else if (src[i] === '}' && src[i - 1] !== '\\') depth--;
    i++;
  }
  if (depth !== 0) return src;

  const inner = src.slice(braceStart + 1, i - 1);
  return src.slice(0, m.index) + open + inner + close + src.slice(i);
}

/** Text-mode symbol macros. Their math-mode twins are inside protected spans. */
const SYMBOLS: [RegExp, string][] = [
  [/\\textperiodcentered\s*\\?/g, '·'],
  [/\\textquotedbl\{\}/g, '"'],
  [/\\textquotedbl\b/g, '"'],
  [/\\ldots\b/g, '…'],
  [/\\dots\b/g, '…'],
  [/\\ohms\b/g, 'Ω'],
  [/\\degC\b/g, '°C'],
  [/\\dg\b/g, '°'],
  [/\\times\b/g, '×'],
  [/\\ge\b/g, '≥'],
  [/\\le\b/g, '≤'],
  [/\\pm\b/g, '±'],
];

/**
 * Convert one run of inline LaTeX to an HTML fragment.
 *
 * `\\` becomes <br> rather than a paragraph break: at this level we're
 * inside a single block already, and the block splitter upstream has
 * handled real paragraph boundaries (blank lines).
 */
export function inlineToHtml(src: string): string {
  const { text, slots } = protectMath(src);
  let out = escapeHtml(text);

  // Structural: line breaks before anything else consumes the backslashes.
  out = out.replace(/\\newline\b/g, '<br>');
  out = out.replace(/\\\\(\[[^\]]*\])?/g, '<br>');

  // Font/style wrappers.
  out = wrapCommand(out, 'textbf', '<strong>', '</strong>');
  out = wrapCommand(out, 'mathbf', '<strong>', '</strong>');
  out = wrapCommand(out, 'textit', '<em>', '</em>');
  out = wrapCommand(out, 'emph', '<em>', '</em>');
  out = wrapCommand(out, 'texttt', '<code>', '</code>');
  out = wrapCommand(out, 'underline', '<u>', '</u>');
  out = wrapCommand(out, 'pow', '<sup>', '</sup>');
  out = wrapCommand(out, 'textsuperscript', '<sup>', '</sup>');
  out = wrapCommand(out, 'textsubscript', '<sub>', '</sub>');
  // Colour/sizing wrappers keep their content, lose the styling.
  out = wrapCommand(out, 'textcolor', '', '');
  out = wrapCommand(out, 'mbox', '', '');
  out = wrapCommand(out, 'text', '', '');

  for (const [re, rep] of SYMBOLS) out = out.replace(re, rep);

  // Escaped literals. `&` has already become `&amp;` via escapeHtml, so the
  // LaTeX escape now reads `\&amp;` — drop the backslash, keep the entity.
  out = out.replace(/\\&amp;/g, '&amp;');
  out = out.replace(/\\([%$#_{}])/g, '$1');

  // Spacing macros -> a plain space.
  out = out.replace(/\\[,;:!]/g, ' ');
  out = out.replace(/\\quad\b/g, ' ');
  out = out.replace(/\\qquad\b/g, ' ');
  out = out.replace(/~/g, ' ');

  // En/em dashes, after escapes so `\--` isn't misread.
  out = out.replace(/---/g, '—').replace(/--/g, '–');

  // Any remaining bare control sequence we don't model: drop the command,
  // keep its text. Better a slightly plain paragraph than raw \foo on screen.
  out = out.replace(/\\[a-zA-Z]+\*?\s?/g, '');
  out = out.replace(/[{}]/g, '');

  out = out.replace(/[ \t]{2,}/g, ' ').trim();
  return restoreMath(out, slots);
}
