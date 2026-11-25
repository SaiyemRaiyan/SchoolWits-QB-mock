/**
 * The answers file is read by the existing readers (src/latex: mstab, ansbox).
 * They take a line break `\\` as the end of a heading line or a table row,
 * even when it is a matrix's row break inside maths: the maths is cut in two,
 * its `$` left unpaired, and every formula after it is read as prose.
 *
 * So before they read it, a `\\` inside inline maths is hidden behind a mark
 * that nothing reads, and put back in what they return. The maths itself is
 * not changed.
 */

const MARK = '';

/** `\\` inside `$...$`, `$$...$$` and `\(...\)` -> MARK. Comments are left alone. */
export function hideMathBreaks(tex: string): string {
  let out = '';
  let math: '$' | '$$' | '\\(' | null = null;
  let i = 0;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === '%' && math === null) {
      // A comment runs to the end of its line, and its signs open nothing.
      const end = tex.indexOf('\n', i);
      const stop = end === -1 ? tex.length : end;
      out += tex.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '\\') {
      const two = tex.slice(i, i + 2);
      if (two === '\\\\' && math !== null) {
        out += MARK;
        i += 2;
        continue;
      }
      if (two === '\\(' && math === null) math = '\\(';
      else if (two === '\\)' && math === '\\(') math = null;
      out += two;
      i += 2;
      continue;
    }
    if (ch === '$') {
      const dbl = tex[i + 1] === '$';
      if (math === null) math = dbl ? '$$' : '$';
      else if ((math === '$$' && dbl) || (math === '$' && !dbl)) math = null;
      out += dbl ? '$$' : '$';
      i += dbl ? 2 : 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Every string in what the readers returned, with the hidden breaks put back. */
export function restoreMathBreaks<T>(value: T): T {
  if (typeof value === 'string') return value.split(MARK).join('\\\\') as T;
  if (Array.isArray(value)) return value.map(restoreMathBreaks) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restoreMathBreaks(v)])) as T;
  }
  return value;
}
