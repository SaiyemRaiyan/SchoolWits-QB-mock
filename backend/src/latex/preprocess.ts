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
 * Physics papers define `\newenvironment{mstab}[1]` -> 3 columns;
 * Add Maths / Maths D define `[2][Partial Marks]` -> 4. Both are invoked
 * identically as `\begin{mstab}{qNcolor}`, so the definition is the only
 * reliable signal short of counting cells. Defaults to 3 when the preamble
 * isn't available (e.g. a pasted fragment).
 */
export function detectMstabColumns(preamble: string): 3 | 4 {
  const m = /\\newenvironment\{mstab\}\[(\d)\]/.exec(preamble);
  if (!m) return 3;
  return m[1] === '2' ? 4 : 3;
}
