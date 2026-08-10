/**
 * Low-level brace-aware scanning helpers.
 *
 * Everything else in src/latex/ is built on these. The old js/latex.js did
 * most of its work with bare regexes, which is why nested arguments and
 * `&`/`\\` inside a cell broke it; these helpers are brace-depth aware so
 * the layers above can stay simple.
 */

/** True when the character at `i` is escaped by a backslash. */
function isEscaped(src: string, i: number): boolean {
  let backslashes = 0;
  for (let j = i - 1; j >= 0 && src[j] === '\\'; j--) backslashes++;
  return backslashes % 2 === 1;
}

/**
 * Read a `{...}` group starting at `start` (which must be the `{`).
 * Returns the inner text and the index just past the closing brace.
 */
export function readGroup(src: string, start: number): { value: string; end: number } | null {
  if (src[start] !== '{') return null;
  let depth = 1;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (!isEscaped(src, i)) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
      }
    }
    i++;
  }
  return null; // unbalanced — caller decides what to do
}

/** Read an optional `[...]` argument at `start`, if present. */
export function readOptional(src: string, start: number): { value: string; end: number } | null {
  if (src[start] !== '[') return null;
  let depth = 1;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (!isEscaped(src, i)) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
      }
    }
    i++;
  }
  return null;
}

export interface CommandCall {
  /** Index of the leading backslash. */
  start: number;
  /** Index just past the last argument. */
  end: number;
  optional: string | null;
  args: string[];
}

/**
 * Find every call of `\name`, reading `argCount` mandatory `{}` arguments
 * and (when `hasOptional`) one leading `[]` argument.
 *
 * Calls with too few arguments are skipped rather than throwing — real
 * source has typos, and a warning upstream beats a hard failure.
 */
export function findCommand(
  src: string,
  name: string,
  argCount: number,
  hasOptional = false,
): CommandCall[] {
  const out: CommandCall[] = [];
  // \examq must not also match \examqfoo, hence the trailing boundary check.
  const re = new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (isEscaped(src, m.index)) continue;
    let i = m.index + m[0].length;
    let optional: string | null = null;

    if (hasOptional) {
      while (src[i] === ' ') i++;
      const opt = readOptional(src, i);
      if (opt) {
        optional = opt.value;
        i = opt.end;
      }
    }

    const args: string[] = [];
    let ok = true;
    for (let a = 0; a < argCount; a++) {
      while (src[i] === ' ' || src[i] === '\n') i++;
      const g = readGroup(src, i);
      if (!g) {
        ok = false;
        break;
      }
      args.push(g.value);
      i = g.end;
    }
    if (!ok) continue;

    out.push({ start: m.index, end: i, optional, args });
    re.lastIndex = i;
  }
  return out;
}

/**
 * Split on a single-character separator, ignoring separators nested inside
 * `{}` groups. Used for mstab cells (`&`) and topic lists.
 */
export function splitTopLevel(src: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inMath = false;
  let current = '';
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    // Consume escapes whole, so `\&` never reads as a cell separator.
    if (ch === '\\' && next !== undefined) {
      if (next === '(' || next === '[') inMath = true;
      else if (next === ')' || next === ']') inMath = false;
      current += ch + next;
      i += 2;
      continue;
    }

    if (ch === '$') {
      const isDisplay = next === '$';
      inMath = !inMath;
      current += isDisplay ? '$$' : '$';
      i += isDisplay ? 2 : 1;
      continue;
    }

    if (!inMath) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      // `&` aligns columns inside math too — only split outside it.
      else if (ch === sep && depth === 0) {
        out.push(current);
        current = '';
        i++;
        continue;
      }
    }

    current += ch;
    i++;
  }

  out.push(current);
  return out;
}

/**
 * Split on `\\` row breaks at brace depth 0, **outside math**.
 *
 * The math check is not optional: inside `$...$` a `\\` is a matrix/array
 * row separator, not a table row break. Mark schemes are full of cells like
 * `$\begin{pmatrix} 4 \\ -3 \end{pmatrix}$`, and splitting on those cuts a
 * cell in half and produces a garbage row whose first fragment then reads
 * as a part label.
 */
export function splitRows(src: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inMath = false;
  let current = '';
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\\') {
      if (next === '\\') {
        if (depth === 0 && !inMath) {
          out.push(current);
          current = '';
          i += 2;
          // An optional [2mm]-style spacing argument belongs to the break.
          const opt = readOptional(src, i);
          if (opt) i = opt.end;
          continue;
        }
        current += '\\\\';
        i += 2;
        continue;
      }
      if (next === '(' || next === '[') inMath = true;
      else if (next === ')' || next === ']') inMath = false;
      // Any other escape (\&, \{, \%) is consumed as a unit so its second
      // character can't be mistaken for a delimiter.
      current += ch + (next ?? '');
      i += 2;
      continue;
    }

    if (ch === '$') {
      const isDisplay = next === '$';
      inMath = !inMath;
      current += isDisplay ? '$$' : '$';
      i += isDisplay ? 2 : 1;
      continue;
    }

    if (!inMath) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }

    current += ch;
    i++;
  }

  out.push(current);
  return out;
}

/**
 * Extract the bodies of every `\begin{name}...\end{name}`, handling nesting
 * of the same environment. Returns the body plus the span it occupied so
 * callers can cut it out of the surrounding text.
 */
export function findEnvironments(
  src: string,
  name: string,
): { body: string; start: number; end: number; args: string[] }[] {
  const out: { body: string; start: number; end: number; args: string[] }[] = [];
  const beginRe = new RegExp(`\\\\begin\\{${name}\\}`, 'g');
  let m: RegExpExecArray | null;

  while ((m = beginRe.exec(src))) {
    let i = m.index + m[0].length;

    // Environment arguments, e.g. \begin{mstab}{q1color}
    const args: string[] = [];
    while (src[i] === '{') {
      const g = readGroup(src, i);
      if (!g) break;
      args.push(g.value);
      i = g.end;
    }

    const bodyStart = i;
    let depth = 1;
    const tokenRe = new RegExp(`\\\\(begin|end)\\{${name}\\}`, 'g');
    tokenRe.lastIndex = bodyStart;
    let t: RegExpExecArray | null;
    let bodyEnd = -1;
    let after = -1;
    while ((t = tokenRe.exec(src))) {
      depth += t[1] === 'begin' ? 1 : -1;
      if (depth === 0) {
        bodyEnd = t.index;
        after = t.index + t[0].length;
        break;
      }
    }
    if (bodyEnd === -1) continue; // unclosed — skip

    out.push({ body: src.slice(bodyStart, bodyEnd), start: m.index, end: after, args });
    beginRe.lastIndex = after;
  }
  return out;
}
