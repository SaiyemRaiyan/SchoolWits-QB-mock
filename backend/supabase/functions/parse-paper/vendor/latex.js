/* GENERATED - do not edit. Bundled from backend/src/latex/ by npm run build:function. */

// src/latex/preprocess.ts
function stripComments(src) {
  return src.split("\n").map((line) => {
    let out = "";
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "%") {
        let backslashes = 0;
        for (let j = i - 1; j >= 0 && line[j] === "\\"; j--) backslashes++;
        if (backslashes % 2 === 0) break;
      }
      out += line[i];
    }
    return out;
  }).join("\n");
}
function splitDocument(src) {
  const cleaned = stripComments(src);
  const begin = cleaned.indexOf("\\begin{document}");
  if (begin === -1) return { preamble: "", body: cleaned };
  const bodyStart = begin + "\\begin{document}".length;
  const end = cleaned.lastIndexOf("\\end{document}");
  return {
    preamble: cleaned.slice(0, begin),
    body: end === -1 ? cleaned.slice(bodyStart) : cleaned.slice(bodyStart, end)
  };
}
var NOISE = [
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
  /\\arraybackslash\b/g
];
function stripLayoutNoise(src) {
  let out = src;
  for (const re of NOISE) out = out.replace(re, "");
  return out;
}
function normalizeWhitespace(src) {
  return src.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function detectMstabColumns(preamble) {
  const m = /\\newenvironment\{mstab\}\[(\d)\]/.exec(preamble);
  if (!m) return 3;
  return m[1] === "2" ? 4 : 3;
}

// src/latex/scan.ts
function isEscaped(src, i) {
  let backslashes = 0;
  for (let j = i - 1; j >= 0 && src[j] === "\\"; j--) backslashes++;
  return backslashes % 2 === 1;
}
function readGroup(src, start) {
  if (src[start] !== "{") return null;
  let depth = 1;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (!isEscaped(src, i)) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
      }
    }
    i++;
  }
  return null;
}
function readOptional(src, start) {
  if (src[start] !== "[") return null;
  let depth = 1;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (!isEscaped(src, i)) {
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
      }
    }
    i++;
  }
  return null;
}
function findCommand(src, name, argCount, hasOptional = false) {
  const out = [];
  const re = new RegExp(`\\\\${name}(?![a-zA-Z])`, "g");
  let m;
  while (m = re.exec(src)) {
    if (isEscaped(src, m.index)) continue;
    let i = m.index + m[0].length;
    let optional = null;
    if (hasOptional) {
      while (src[i] === " ") i++;
      const opt = readOptional(src, i);
      if (opt) {
        optional = opt.value;
        i = opt.end;
      }
    }
    const args = [];
    let ok = true;
    for (let a = 0; a < argCount; a++) {
      while (src[i] === " " || src[i] === "\n") i++;
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
function splitTopLevel(src, sep) {
  const out = [];
  let depth = 0;
  let inMath = false;
  let current = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "\\" && next !== void 0) {
      if (next === "(" || next === "[") inMath = true;
      else if (next === ")" || next === "]") inMath = false;
      current += ch + next;
      i += 2;
      continue;
    }
    if (ch === "$") {
      const isDisplay = next === "$";
      inMath = !inMath;
      current += isDisplay ? "$$" : "$";
      i += isDisplay ? 2 : 1;
      continue;
    }
    if (!inMath) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === sep && depth === 0) {
        out.push(current);
        current = "";
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
function splitRows(src) {
  const out = [];
  let depth = 0;
  let inMath = false;
  let current = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "\\") {
      if (next === "\\") {
        if (depth === 0 && !inMath) {
          out.push(current);
          current = "";
          i += 2;
          const opt = readOptional(src, i);
          if (opt) i = opt.end;
          continue;
        }
        current += "\\\\";
        i += 2;
        continue;
      }
      if (next === "(" || next === "[") inMath = true;
      else if (next === ")" || next === "]") inMath = false;
      current += ch + (next ?? "");
      i += 2;
      continue;
    }
    if (ch === "$") {
      const isDisplay = next === "$";
      inMath = !inMath;
      current += isDisplay ? "$$" : "$";
      i += isDisplay ? 2 : 1;
      continue;
    }
    if (!inMath) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    current += ch;
    i++;
  }
  out.push(current);
  return out;
}
function findEnvironments(src, name) {
  const out = [];
  const beginRe = new RegExp(`\\\\begin\\{${name}\\}`, "g");
  let m;
  while (m = beginRe.exec(src)) {
    let i = m.index + m[0].length;
    const args = [];
    while (src[i] === "{") {
      const g = readGroup(src, i);
      if (!g) break;
      args.push(g.value);
      i = g.end;
    }
    const bodyStart = i;
    let depth = 1;
    const tokenRe = new RegExp(`\\\\(begin|end)\\{${name}\\}`, "g");
    tokenRe.lastIndex = bodyStart;
    let t;
    let bodyEnd = -1;
    let after = -1;
    while (t = tokenRe.exec(src)) {
      depth += t[1] === "begin" ? 1 : -1;
      if (depth === 0) {
        bodyEnd = t.index;
        after = t.index + t[0].length;
        break;
      }
    }
    if (bodyEnd === -1) continue;
    out.push({ body: src.slice(bodyStart, bodyEnd), start: m.index, end: after, args });
    beginRe.lastIndex = after;
  }
  return out;
}

// src/latex/blocks.ts
function parsePaperId(paperId) {
  const parts = paperId.trim().split("/");
  if (parts.length < 3) return null;
  const subjectCode = parts[0].trim();
  const pv = parts[1].trim();
  const year = parts[parts.length - 1].trim();
  const session = parts.slice(2, parts.length - 1).join("/").trim();
  if (!/^\d+$/.test(subjectCode) || !/^\d{1,2}$/.test(pv)) return null;
  const paper = pv.length === 2 ? pv[0] : pv;
  const variant = pv.length === 2 ? pv[1] : "";
  return {
    paperId: paperId.trim(),
    subjectCode,
    paper,
    variant,
    session,
    // Source years are two-digit; everything here is 20xx.
    year: /^\d{2}$/.test(year) ? `20${year}` : year
  };
}
function splitTopics(raw) {
  return raw.split(/(?:\\,)?\s*\\textperiodcentered\s*(?:\\,|\\)?/).map(
    (t) => t.replace(/^[\s\\,]+|[\s\\,]+$/g, "").replace(/\\&/g, "&").trim()
  ).filter((t) => t.length > 0);
}
function parseMarks(raw) {
  const m = /-?\d+/.exec(raw ?? "");
  return m ? Number(m[0]) : 0;
}
function parseMarkTag(raw) {
  const m = /\[\s*(\d+)\s*\]/.exec(raw ?? "");
  return m ? Number(m[1]) : null;
}
function splitQuestions(body) {
  const calls = findCommand(body, "examq", 4);
  return calls.map((call, i) => {
    const next = i + 1 < calls.length ? calls[i + 1].start : body.length;
    return {
      number: parseMarks(call.args[1]),
      paperId: call.args[0].trim(),
      topicsRaw: call.args[2],
      marksRaw: call.args[3],
      body: body.slice(call.end, next)
    };
  });
}

// src/latex/inline.ts
var MATH_OPEN = "";
var MATH_CLOSE = "";
function protectMath(src) {
  const slots = [];
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "\\" && next === "\\") {
      out += "\\\\";
      i += 2;
      continue;
    }
    if (ch === "\\" && (next === "(" || next === "[")) {
      const closer = next === "[" ? "\\]" : "\\)";
      const end = src.indexOf(closer, i + 2);
      if (end !== -1) {
        slots.push({ raw: src.slice(i, end + 2) });
        out += `${MATH_OPEN}${slots.length - 1}${MATH_CLOSE}`;
        i = end + 2;
        continue;
      }
    }
    if (ch === "$" && src[i - 1] !== "\\") {
      const isDisplay = next === "$";
      const delim = isDisplay ? "$$" : "$";
      let j = i + delim.length;
      let end = -1;
      while (j < src.length) {
        if (src[j] === "$" && src[j - 1] !== "\\") {
          if (isDisplay) {
            if (src[j + 1] === "$") {
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
function restoreMath(src, slots) {
  return src.replace(
    new RegExp(`${MATH_OPEN}(\\d+)${MATH_CLOSE}`, "g"),
    (_, n) => slots[Number(n)]?.raw ?? ""
  );
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function wrapCommand(src, name, open, close) {
  let out = src;
  for (let pass = 0; pass < 5; pass++) {
    const before = out;
    out = replaceOnce(out, name, open, close);
    if (out === before) break;
  }
  return out;
}
function replaceOnce(src, name, open, close) {
  const re = new RegExp(`\\\\${name}(?![a-zA-Z])\\s*\\{`, "g");
  const m = re.exec(src);
  if (!m) return src;
  const braceStart = m.index + m[0].length - 1;
  let depth = 1;
  let i = braceStart + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === "{" && src[i - 1] !== "\\") depth++;
    else if (src[i] === "}" && src[i - 1] !== "\\") depth--;
    i++;
  }
  if (depth !== 0) return src;
  const inner = src.slice(braceStart + 1, i - 1);
  return src.slice(0, m.index) + open + inner + close + src.slice(i);
}
var SYMBOLS = [
  [/\\textperiodcentered\s*\\?/g, "\xB7"],
  [/\\textquotedbl\{\}/g, '"'],
  [/\\textquotedbl\b/g, '"'],
  [/\\ldots\b/g, "\u2026"],
  [/\\dots\b/g, "\u2026"],
  [/\\ohms\b/g, "\u03A9"],
  [/\\degC\b/g, "\xB0C"],
  [/\\dg\b/g, "\xB0"],
  [/\\times\b/g, "\xD7"],
  [/\\ge\b/g, "\u2265"],
  [/\\le\b/g, "\u2264"],
  [/\\pm\b/g, "\xB1"]
];
function inlineToHtml(src) {
  const { text, slots } = protectMath(src);
  let out = escapeHtml(text);
  out = out.replace(/\\newline\b/g, "<br>");
  out = out.replace(/\\\\(\[[^\]]*\])?/g, "<br>");
  out = wrapCommand(out, "textbf", "<strong>", "</strong>");
  out = wrapCommand(out, "mathbf", "<strong>", "</strong>");
  out = wrapCommand(out, "textit", "<em>", "</em>");
  out = wrapCommand(out, "emph", "<em>", "</em>");
  out = wrapCommand(out, "texttt", "<code>", "</code>");
  out = wrapCommand(out, "underline", "<u>", "</u>");
  out = wrapCommand(out, "pow", "<sup>", "</sup>");
  out = wrapCommand(out, "textsuperscript", "<sup>", "</sup>");
  out = wrapCommand(out, "textsubscript", "<sub>", "</sub>");
  out = wrapCommand(out, "textcolor", "", "");
  out = wrapCommand(out, "mbox", "", "");
  out = wrapCommand(out, "text", "", "");
  for (const [re, rep] of SYMBOLS) out = out.replace(re, rep);
  out = out.replace(/\\&amp;/g, "&amp;");
  out = out.replace(/\\([%$#_{}])/g, "$1");
  out = out.replace(/\\[,;:!]/g, " ");
  out = out.replace(/\\quad\b/g, " ");
  out = out.replace(/\\qquad\b/g, " ");
  out = out.replace(/~/g, " ");
  out = out.replace(/---/g, "\u2014").replace(/--/g, "\u2013");
  out = out.replace(/\\[a-zA-Z]+\*?\s?/g, "");
  out = out.replace(/[{}]/g, "");
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return restoreMath(out, slots);
}

// src/latex/content.ts
function resolveImage(file, images) {
  const want = file.trim().toLowerCase();
  if (!want) return null;
  for (const [key, url] of Object.entries(images)) {
    if (key.trim().toLowerCase() === want) return url;
  }
  const base = want.split("/").pop() ?? want;
  for (const [key, url] of Object.entries(images)) {
    const keyBase = key.trim().toLowerCase().split("/").pop() ?? "";
    if (keyBase === base) return url;
  }
  return null;
}
function cleanCell(cell) {
  return cell.replace(/\\multicolumn\{\d+\}\{[^}]*\}/g, "").replace(/\\multirow\{-?\d+\}\{[^}]*\}/g, "").replace(/\\rowcolor\{[^}]*\}/g, "").replace(/\\cellcolor\{[^}]*\}/g, "").replace(/\\columncolor\{[^}]*\}/g, "").replace(/\\makecell/g, "").replace(/\\hline/g, "").replace(/\\cline\{[^}]*\}/g, "").trim();
}
function tabularToHtml(body) {
  const rows = splitRows(body).map((r) => r.trim()).filter((r) => cleanCell(r).length > 0);
  const html = rows.map((row) => {
    const cells = splitTopLevel(row, "&").map((c) => inlineToHtml(cleanCell(c)));
    return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  }).join("");
  return `<table>${html}</table>`;
}
function paragraphs(raw) {
  return raw.split(/\n\s*\n/).map((p) => inlineToHtml(p)).filter((html) => html.length > 0).map((html) => ({ type: "text", html }));
}
function toBlocks(raw, images = {}) {
  const spans = [];
  for (const call of findCommand(raw, "qfig", 2, true)) {
    const file = call.args[0].trim();
    spans.push({
      start: call.start,
      end: call.end,
      block: {
        type: "figure",
        file,
        src: resolveImage(file, images),
        caption: inlineToHtml(call.args[1] ?? ""),
        width: call.optional
      }
    });
  }
  for (const call of findCommand(raw, "includegraphics", 1, true)) {
    const file = call.args[0].trim();
    spans.push({
      start: call.start,
      end: call.end,
      block: {
        type: "figure",
        file,
        src: resolveImage(file, images),
        caption: "",
        width: call.optional
      }
    });
  }
  for (const env of findEnvironments(raw, "tabular")) {
    spans.push({
      start: env.start,
      end: env.end,
      block: { type: "table", html: tabularToHtml(env.body) }
    });
  }
  spans.sort((a, b) => a.start - b.start);
  const top = [];
  let cursor = -1;
  for (const s of spans) {
    if (s.start >= cursor) {
      top.push(s);
      cursor = s.end;
    }
  }
  const out = [];
  let pos = 0;
  for (const span of top) {
    out.push(...paragraphs(raw.slice(pos, span.start)));
    out.push(span.block);
    pos = span.end;
  }
  out.push(...paragraphs(raw.slice(pos)));
  return out;
}

// src/latex/structure.ts
var ALPHA = "abcdefghijklmnopqrstuvwxyz";
var ROMAN = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv"
];
function alphaLabel(index) {
  return ALPHA[index] ?? `p${index + 1}`;
}
function romanLabel(index) {
  return ROMAN[index] ?? `r${index + 1}`;
}
function splitItems(body) {
  const tokenRe = /\\begin\{([a-zA-Z*]+)\}|\\end\{([a-zA-Z*]+)\}|\\item\b/g;
  const starts = [];
  let depth = 0;
  let m;
  while (m = tokenRe.exec(body)) {
    if (m[1]) depth++;
    else if (m[2]) depth--;
    else if (depth === 0) starts.push(m.index);
  }
  if (starts.length === 0) return [];
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : body.length;
    return body.slice(start + "\\item".length, end);
  });
}
function extractAnswerSpace(raw) {
  let answerSpace = null;
  let marks = null;
  const cuts = [];
  const addMarks = (n) => {
    if (n === null) return;
    marks = (marks ?? 0) + n;
  };
  for (const call of findCommand(raw, "Alines", 2)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[1]));
    if (!answerSpace) {
      const lines = Number.parseInt(call.args[0], 10);
      answerSpace = { kind: "lines", lines: Number.isFinite(lines) ? lines : 0 };
    }
  }
  for (const call of findCommand(raw, "ansval", 3)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[2]));
    if (!answerSpace) {
      answerSpace = { kind: "value", label: call.args[0].trim(), unit: call.args[1].trim() };
    }
  }
  for (const call of findCommand(raw, "markright", 1)) {
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[0]));
    if (!answerSpace) answerSpace = { kind: "markright" };
  }
  for (const call of findCommand(raw, "mbox", 1)) {
    if (!/^\s*\[\s*\d+\s*\]\s*$/.test(call.args[0])) continue;
    cuts.push([call.start, call.end]);
    addMarks(parseMarkTag(call.args[0]));
    if (!answerSpace) answerSpace = { kind: "markright" };
  }
  cuts.sort((a, b) => b[0] - a[0]);
  let rest = raw;
  for (const [start, end] of cuts) rest = rest.slice(0, start) + rest.slice(end);
  return { answerSpace, marks, rest };
}
function buildPart(itemBody, label, parentRef, images, isSub) {
  const ref = `${parentRef}(${label})`;
  const subEnvs = isSub ? [] : findEnvironments(itemBody, "subparts");
  let ownRaw = itemBody;
  const subparts = [];
  if (subEnvs.length > 0) {
    ownRaw = itemBody.slice(0, subEnvs[0].start) + itemBody.slice(subEnvs[subEnvs.length - 1].end);
    for (const env of subEnvs) {
      splitItems(env.body).forEach((sub, i) => {
        subparts.push(buildPart(sub, romanLabel(i), ref, images, true));
      });
    }
  }
  const { answerSpace, marks, rest } = extractAnswerSpace(ownRaw);
  return {
    label,
    ref,
    // A grouping part has no marks of its own — they live on the subparts.
    marks: subparts.length > 0 ? sumMarks(subparts) : marks,
    answerSpace,
    content: toBlocks(rest, images),
    subparts
  };
}
function sumMarks(parts) {
  const known = parts.map((p) => p.marks).filter((m) => m !== null);
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null;
}
function parseStructure(body, questionNumber, images = {}) {
  const envs = findEnvironments(body, "parts");
  const ref = String(questionNumber);
  if (envs.length === 0) {
    const { rest } = extractAnswerSpace(body);
    return { stem: toBlocks(rest, images), parts: [] };
  }
  const stemRaw = body.slice(0, envs[0].start) + body.slice(envs[envs.length - 1].end);
  const parts = [];
  for (const env of envs) {
    for (const item of splitItems(env.body)) {
      parts.push(buildPart(item, alphaLabel(parts.length), ref, images, false));
    }
  }
  return { stem: toBlocks(stemRaw, images), parts };
}

// src/latex/options.ts
var LETTERS = ["A", "B", "C", "D", "E"];
function fromChoices(body) {
  const envs = findEnvironments(body, "choices");
  if (envs.length === 0) return null;
  const items = envs.flatMap((env) => splitItems(env.body)).map((raw, i) => ({ label: LETTERS[i] ?? `#${i + 1}`, content: inlineToHtml(raw) })).filter((it) => it.content.length > 0);
  return items.length > 0 ? { source: "choices", items } : null;
}
function fromTabular(body) {
  for (const env of findEnvironments(body, "tabular")) {
    const rows = splitRows(env.body).map((r) => r.replace(/\\hline|\\cline\{[^}]*\}/g, "").trim()).filter((r) => r.length > 0);
    const labelled = rows.filter((r) => /^\\textbf\{[A-D]\}/.test(r.trim()));
    if (labelled.length < 2) continue;
    const items = labelled.map((row) => {
      const cells = splitTopLevel(row, "&");
      const label = /\{([A-D])\}/.exec(cells[0] ?? "")?.[1] ?? "?";
      const content = cells.slice(1).map((c) => inlineToHtml(c)).filter(Boolean).join(" \u2014 ");
      return { label, content };
    });
    return { source: "tabular", items };
  }
  return null;
}
function fromInline(body) {
  const re = /\\textbf\{([A-D])\}/g;
  const hits = [];
  let m;
  while (m = re.exec(body)) {
    hits.push({ label: m[1], start: m.index, end: m.index + m[0].length });
  }
  if (hits.length < 2) return null;
  const inOrder = hits.every((h, i) => h.label === LETTERS[i]);
  if (!inOrder) return null;
  const items = hits.map((hit, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].start : body.length;
    return { label: hit.label, content: inlineToHtml(body.slice(hit.end, end)) };
  });
  return { source: "inline", items };
}
function parseOptions(body) {
  const found = fromChoices(body) ?? fromTabular(body) ?? fromInline(body);
  if (found) return found;
  if (/\\qfig|\\includegraphics/.test(body)) {
    return { source: "figure", items: [] };
  }
  return null;
}

// src/latex/markscheme.ts
function stripRowDecoration(row) {
  return row.replace(/\\hline/g, "").replace(/\\cline\{[^}]*\}/g, "").replace(/\\rowcolor\{[^}]*\}/g, "").replace(/\\arrayrulecolor\{[^}]*\}/g, "").trim();
}
function parseLabelCellDetailed(cell) {
  const cleaned = stripRowDecoration(cell);
  const mr = /\\multirow\{(-?)\d+\}\{[^}]*\}\{([^}]*)\}/.exec(cleaned);
  if (mr) return { label: mr[2].trim(), direction: mr[1] === "-" ? "up" : "down" };
  const plain = cleaned.replace(/\\[a-zA-Z]+\s*/g, "").trim();
  return { label: plain.length > 0 ? plain : null, direction: "down" };
}
function parseLabelCell(cell) {
  return parseLabelCellDetailed(cell).label;
}
function splitAlternatives(cell) {
  const pieces = cell.split(/\\newline\s*or\s*\\newline/i).map((p) => p.trim()).filter((p) => p.length > 0);
  return pieces.length > 1 ? pieces.map((p) => inlineToHtml(p)) : [];
}
function marksFromCode(code) {
  const m = /(\d+)/.exec(code);
  return m ? Number(m[1]) : 0;
}
function parseMstab(body, columns = 3, _images = {}) {
  const drafts = [];
  const expanded = body.replace(/\\altrow\{[^}]*\}\{([^}]*)\}/g, "\\altrowmark{$1} \\\\ ");
  for (const rawRow of splitRows(expanded)) {
    const row = stripRowDecoration(rawRow);
    if (row.length === 0) continue;
    const alt = /\\altrowmark\{([^}]*)\}/.exec(row);
    if (alt) {
      drafts.push({
        own: null,
        direction: "down",
        row: {
          ref: "",
          answer: inlineToHtml(alt[1]),
          alternatives: [],
          code: "",
          marks: 0,
          guidance: null,
          banner: true
        }
      });
      continue;
    }
    const cells = splitTopLevel(row, "&");
    if (/^\s*Question\s*$/i.test(cells[0] ?? "")) continue;
    const { label, direction } = parseLabelCellDetailed(cells[0] ?? "");
    const answerRaw = (cells[1] ?? "").trim();
    const codeRaw = stripRowDecoration(cells[2] ?? "").replace(/\\[a-zA-Z]+\s*/g, "").replace(/[{}]/g, "").trim();
    const guidanceRaw = columns === 4 ? (cells[3] ?? "").trim() : "";
    drafts.push({
      own: label,
      direction,
      row: {
        ref: label ?? "",
        answer: inlineToHtml(answerRaw),
        alternatives: splitAlternatives(answerRaw),
        code: codeRaw,
        marks: marksFromCode(codeRaw),
        guidance: columns === 4 ? inlineToHtml(guidanceRaw) : null,
        banner: false
      }
    });
  }
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!d.own || d.direction !== "up") continue;
    for (let j = i - 1; j >= 0 && !drafts[j].own; j--) {
      drafts[j].row.ref = d.own;
    }
  }
  let above = null;
  for (const d of drafts) {
    if (d.own) above = d.own;
    else if (!d.row.ref && above) d.row.ref = above;
  }
  return drafts.map((d) => d.row);
}
function extractMarkScheme(body, columns = 3, images = {}) {
  return findEnvironments(body, "mstab").flatMap((env) => parseMstab(env.body, columns, images));
}

// src/latex/solutions.ts
var MARKER = /^\s*(\((?:[a-z]+|[ivx]+)\)(?:\((?:[ivx]+)\))?)\s*/;
function parseAnsbox(body, questionNumber) {
  const lines = body.split("\n");
  const segments = [];
  let currentRef = null;
  let currentHeading = null;
  let buffer = [];
  const flush = () => {
    const raw = buffer.join("\n").trim();
    if (!raw && !currentHeading) return;
    segments.push({
      ref: currentRef,
      heading: currentHeading,
      html: inlineToHtml(raw)
    });
    buffer = [];
  };
  for (const line of lines) {
    const m = MARKER.exec(line);
    if (m) {
      flush();
      const suffix = line.slice(m[0].length);
      currentRef = `${questionNumber}${m[1]}`;
      const headingEnd = suffix.search(/\\\\/);
      const headingRaw = headingEnd === -1 ? suffix : suffix.slice(0, headingEnd);
      currentHeading = headingRaw.trim() ? inlineToHtml(headingRaw) : null;
      const rest = headingEnd === -1 ? "" : suffix.slice(headingEnd).replace(/^\\\\(\[[^\]]*\])?/, "");
      buffer = rest.trim() ? [rest] : [];
      continue;
    }
    buffer.push(line);
  }
  flush();
  return segments.filter((s) => s.html.length > 0 || s.heading);
}
function parseCorrectOption(body) {
  const at = body.search(/\bAnswer\b/);
  if (at === -1) return null;
  const after = body.slice(at + "Answer".length, at + 80).replace(/\\[a-zA-Z]+/g, " ").replace(/[${}[\]:\-.,]/g, " ").trim();
  const m = /^([A-D])\b/.exec(after);
  return m ? m[1] : null;
}
function extractSolution(body, questionNumber) {
  return findEnvironments(body, "ansbox").flatMap((env) => parseAnsbox(env.body, questionNumber));
}
function extractCorrectOption(body) {
  for (const env of findEnvironments(body, "ansbox")) {
    const letter = parseCorrectOption(env.body);
    if (letter) return letter;
  }
  return null;
}

// src/latex/index.ts
function hasRealOptions(options) {
  return options !== null && options.source !== "figure" && options.items.length > 0;
}
function looksLikeMcqPaper(questions) {
  if (questions.length === 0) return false;
  const real = questions.filter((q) => hasRealOptions(q.options)).length;
  const allSingleMark = questions.every((q) => q.parts.length === 0 && q.marks <= 1);
  return allSingleMark && real >= Math.max(3, questions.length * 0.5);
}
function parseQuestionPaper(tex, images = {}) {
  const { body } = splitDocument(tex);
  const cleaned = normalizeWhitespace(stripLayoutNoise(body));
  const blocks = splitQuestions(cleaned);
  const warnings = [];
  if (blocks.length === 0) {
    warnings.push({
      code: "no-examq",
      message: "No \\examq{...} headers found \u2014 the file does not use the documented format."
    });
    return { paper: null, questions: [], warnings };
  }
  const paper = parsePaperId(blocks[0].paperId);
  if (!paper) {
    warnings.push({
      code: "bad-paper-id",
      message: `Could not read paper id "${blocks[0].paperId}" (expected e.g. 5054/21/M/J/25).`
    });
  }
  const drafts = blocks.map((block) => {
    const marks = parseMarks(block.marksRaw);
    const { stem, parts } = parseStructure(block.body, block.number, images);
    return {
      block,
      marks,
      stem,
      parts,
      options: parts.length === 0 ? parseOptions(block.body) : null
    };
  });
  const isMcqPaper = looksLikeMcqPaper(drafts);
  const questions = drafts.map(({ block, marks, stem, parts, options }) => {
    const kind = parts.length === 0 && marks <= 1 && (hasRealOptions(options) || isMcqPaper) ? "mcq" : "structured";
    const topics = splitTopics(block.topicsRaw);
    if (kind === "mcq" && options?.source === "figure") {
      warnings.push({
        code: "mcq-options-unparseable",
        questionNumber: block.number,
        message: `Q${block.number}: options exist only inside the figure image and cannot be extracted.`
      });
    }
    if (kind === "structured" && parts.length > 0) {
      const sum = parts.reduce((acc, p) => acc + (p.marks ?? 0), 0);
      if (sum !== marks) {
        warnings.push({
          code: "marks-mismatch",
          questionNumber: block.number,
          message: `Q${block.number}: \\examq says ${marks} marks but the parts sum to ${sum}.`
        });
      }
    }
    return {
      number: block.number,
      kind,
      topics,
      topic: topics.join(" \xB7 "),
      marks,
      stem,
      parts,
      options: kind === "mcq" ? options : null,
      answer: null
    };
  });
  return { paper, questions, warnings };
}
function parseAnswerPaper(tex, images = {}) {
  const { preamble, body } = splitDocument(tex);
  const columns = detectMstabColumns(preamble);
  const cleaned = normalizeWhitespace(stripLayoutNoise(body));
  const blocks = splitQuestions(cleaned);
  const warnings = [];
  if (blocks.length === 0) {
    warnings.push({
      code: "no-examq",
      message: "No \\examq{...} headers found in the answers file."
    });
  }
  const byNumber = /* @__PURE__ */ new Map();
  for (const block of blocks) {
    byNumber.set(block.number, {
      markScheme: extractMarkScheme(block.body, columns, images),
      workedSolution: extractSolution(block.body, block.number),
      correct: extractCorrectOption(block.body)
    });
  }
  return {
    paper: blocks.length > 0 ? parsePaperId(blocks[0].paperId) : null,
    byNumber,
    warnings
  };
}
function mergePaper(qp, qa) {
  const warnings = [...qp.warnings, ...qa.warnings];
  const questions = qp.questions.map((q) => {
    const answer = qa.byNumber.get(q.number) ?? null;
    if (!answer) {
      warnings.push({
        code: "unmatched-question",
        questionNumber: q.number,
        message: `Q${q.number}: no matching question in the answers file.`
      });
    }
    return { ...q, answer };
  });
  for (const number of qa.byNumber.keys()) {
    if (!qp.questions.some((q) => q.number === number)) {
      warnings.push({
        code: "unmatched-question",
        questionNumber: number,
        message: `Q${number}: present in the answers file but not in the questions file.`
      });
    }
  }
  return { paper: qp.paper ?? qa.paper, questions, warnings };
}
export {
  extractAnswerSpace,
  extractMarkScheme,
  extractSolution,
  inlineToHtml,
  mergePaper,
  parseAnsbox,
  parseAnswerPaper,
  parseCorrectOption,
  parseLabelCell,
  parseMstab,
  parseOptions,
  parsePaperId,
  parseQuestionPaper,
  parseStructure,
  resolveImage,
  splitItems,
  splitQuestions,
  splitTopics,
  toBlocks
};
