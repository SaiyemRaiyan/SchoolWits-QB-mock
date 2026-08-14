/**
 * Source cleanup that runs before anything tries to understand structure:
 * strip comments, split preamble from body, drop layout-only noise.
 *
 * The preamble is kept rather than discarded because it carries one thing
 * the body genuinely needs: the `mstab` column count, which is invisible at
 * the call site (see markscheme.ts and templates/README.md, issue 2).
 */

export interface Document {
  preamble: string;
  body: string;
}

/**
 * Remove `%` comments, keeping escaped `\%`.
 *
 * LaTeX also swallows the newline after a comment, which is what the
 * trailing `%` at the end of macro definitions is for. We keep the newline:
 * these files use end-of-line `%` for line-wrapping inside the preamble,
 * and the body relies on blank lines for paragraph breaks.
 */
export function stripComments(src: string): string {
  return src
    .split('\n')
    .map((line) => {
      let out = '';
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '%') {
          let backslashes = 0;
          for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) backslashes++;
          if (backslashes % 2 === 0) break; // real comment — drop the rest
        }
        out += line[i];
      }
      return out;
    })
    .join('\n');
}

/**
 * Split `\begin{document}...\end{document}` off the preamble.
 *
 * A file with no \begin{document} is treated as body-only — the Quick Add
 * composer pastes bare question fragments with no document wrapper, and
 * that path has to keep working.
 */
export function splitDocument(src: string): Document {
  const cleaned = stripComments(src);
  const begin = cleaned.indexOf('\\begin{document}');
  if (begin === -1) return { preamble: '', body: cleaned };

  const bodyStart = begin + '\\begin{document}'.length;
  const end = cleaned.lastIndexOf('\\end{document}');
  return {
    preamble: cleaned.slice(0, begin),
    body: end === -1 ? cleaned.slice(bodyStart) : cleaned.slice(bodyStart, end),
  };
}

/**
 * Spacing and layout commands that carry no content. Dropped early so the
 * structure layers never have to think about them.
 */
const NOISE = [
  /\\vspace\*?\{[^}]*\}/g,
  /\\hspace\*?\{[^}]*\}/g,
  /\\addvspace\{[^}]*\}/g,
  /\\bigskip\b/g,
  /\\medskip\b/g,
  /\\smallskip\b/g,
  /\\newpage\b/g,
  /\\clearpage\b/g,
  /\\noindent\b/g,
  /\\nopagebreak\b/g,
  /\\par\b/g,
  /\\label\{[^}]*\}/g,
  /\\plainline\b/g,
  /\\labelline\{[^}]*\}/g,
  /\\centering\b/g,
  /\\arraybackslash\b/g,
];

export function stripLayoutNoise(src: string): string {
  let out = src;
  for (const re of NOISE) out = out.replace(re, '');
  return out;
}

/** Collapse runs of blank lines and trim trailing spaces. */
export function normalizeWhitespace(src: string): string {
  return src
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * How many columns the paper's `mstab` environment declares.
 *
 * Read from the environment's own HEADER ROW — the literal
 * `Question & Answer & Marks` (3) or `Question & Answer & Marks & Partial
 * Marks` (4) that every definition ends with. All papers invoke the
 * environment identically as `\begin{mstab}{qNcolor}`, so the definition is
 * the only place the arity is visible.
 *
 * This used to read `\newenvironment{mstab}[N]` and map N=2 -> 4 columns.
 * That number is how many ARGUMENTS the environment takes, not how many
 * columns it has, and the two are unrelated: Maths D declares `[1]` (one
 * argument, the colour) but a genuine 4-column table, so its entire Partial
 * Marks column — 64 rows carrying the M1/B1/B2 breakdown — was parsed as
 * overflow and dropped. It only ever looked correct because Physics (1 arg,
 * 3 cols) and Add Maths (2 args, 4 cols) happen to line up by coincidence.
 *
 * Defaults to 3 when the preamble isn't available (e.g. a pasted fragment).
 */
export function detectMstabColumns(preamble: string): 3 | 4 {
  const header = /Question\s*&[^\\]*?\\\\/.exec(preamble);
  if (header) {
    // Cells = separators + 1. The match stops at the row-ending \\, so
    // everything counted here belongs to the header row.
    const cells = header[0].split('&').length;
    if (cells >= 4) return 4;
    if (cells === 3) return 3;
  }

  // No header row (a trimmed or hand-written preamble): fall back to the
  // tabularx column spec, counting the `p{...}` / `X` entries the same way.
  const spec = /\\begin\{tabularx\}|\\tabularx\{[^}]*\}\{([\s\S]*?)\}%?\s*\n\s*\\hline/.exec(preamble);
  if (spec && spec[1]) {
    const columns = (spec[1].match(/p\{[^}]*\}|(?<![a-zA-Z])X(?![a-zA-Z])/g) || []).length;
    if (columns >= 4) return 4;
    if (columns === 3) return 3;
  }

  return 3;
}
