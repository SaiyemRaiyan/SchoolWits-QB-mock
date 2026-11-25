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
  const header = /Question\s*&[^\\]*?\\\\/.exec(preamble);
  if (header) {
    const cells = header[0].split("&").length;
    if (cells >= 4) return 4;
    if (cells === 3) return 3;
  }
  const spec = /\\begin\{tabularx\}|\\tabularx\{[^}]*\}\{([\s\S]*?)\}%?\s*\n\s*\\hline/.exec(preamble);
  if (spec && spec[1]) {
    const columns = (spec[1].match(/p\{[^}]*\}|(?<![a-zA-Z])X(?![a-zA-Z])/g) || []).length;
    if (columns >= 4) return 4;
    if (columns === 3) return 3;
  }
  return 3;
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
    if (ch === "\\" && src.startsWith("\\begin{", i)) {
      const env = /^\\begin\{(align|equation|gather)(\*?)\}/.exec(src.slice(i, i + 24));
      if (env) {
        const close = `\\end{${env[1]}${env[2]}}`;
        const end = src.indexOf(close, i);
        if (end !== -1) {
          const body = src.slice(i + env[0].length, end);
          const inner = env[1] === "align" ? "aligned" : env[1] === "gather" ? "gathered" : "";
          const raw = inner ? `\\[\\begin{${inner}}${body}\\end{${inner}}\\]` : `\\[${body}\\]`;
          slots.push({ raw });
          out += `${MATH_OPEN}${slots.length - 1}${MATH_CLOSE}`;
          i = end + close.length;
          continue;
        }
      }
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
var DIAGRAM_ENV = /\\begin\{(tikzpicture|pgfpicture|picture)\*?\}[\s\S]*?\\end\{\1\*?\}/g;
function stripDiagrams(src) {
  return src.replace(DIAGRAM_ENV, "");
}
function countDiagrams(src) {
  return (src.match(DIAGRAM_ENV) ?? []).length;
}
function listsToHtml(src) {
  const token = /\s*\\(begin|end)\{(itemize|enumerate)\}(?:\[[^\]]*\])?\s*|\s*\\item\b(?:\[[^\]]*\])?\s*/g;
  const stack = [];
  const out = src.replace(token, (m, kind, env) => {
    if (kind === "begin") {
      const tag = env === "enumerate" ? "ol" : "ul";
      stack.push({ tag, open: false });
      return `<${tag}>`;
    }
    if (kind === "end") {
      const top2 = stack.pop();
      if (!top2) return "";
      return `${top2.open ? "</li>" : ""}</${top2.tag}>`;
    }
    const top = stack[stack.length - 1];
    if (!top) return "";
    const prefix = top.open ? "</li>" : "";
    top.open = true;
    return `${prefix}<li>`;
  });
  return out + stack.reverse().map((t) => `${t.open ? "</li>" : ""}</${t.tag}>`).join("");
}
function inlineToHtml(src) {
  const { text, slots } = protectMath(stripDiagrams(src));
  let out = listsToHtml(escapeHtml(text));
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
  out = out.replace(/\\\$/g, "<span>$</span>");
  out = out.replace(/\\([%#_{}])/g, "$1");
  out = out.replace(/\\[,;:!]/g, " ");
  out = out.replace(/\\[ \t\n]/g, " ");
  out = out.replace(/\\[\/@-]/g, "");
  out = out.replace(/\\quad\b/g, " ");
  out = out.replace(/\\qquad\b/g, " ");
  out = out.replace(/~/g, " ");
  out = out.replace(/---/g, "\u2014").replace(/--/g, "\u2013");
  out = out.replace(/\\(?:begin|end)\{(?:minipage|tabularx?\*?|multicols)\}(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, "");
  out = out.replace(/\\(?:begin|end)\{[a-zA-Z*]+\}(?:\[[^\]]*\])?/g, "");
  out = out.replace(/\\(?:makebox|framebox)\[[^\]]*\](?:\[[^\]]*\])?\{\s*(?:\\(?:dotfill|hrulefill))?\s*\}/g, "");
  out = out.replace(/\\rule(?:\[[^\]]*\])?\{[^{}]*\}\{[^{}]*\}/g, "");
  out = out.replace(/\\(?:dotfill|hrulefill|hfill)\b/g, "");
  out = out.replace(/\\[a-zA-Z]+\*?\s?/g, "");
  out = out.replace(/[{}]/g, "");
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return restoreMath(out, slots);
}

// src/latex/clip.ts
var TO_BP = {
  bp: 1,
  pt: 72 / 72.27,
  in: 72,
  mm: 72 / 25.4,
  cm: 72 / 2.54
};
function toBp(raw) {
  const m = /^(-?\d*\.?\d+)\s*([a-z]{2})?$/.exec(raw.trim());
  if (!m) return null;
  const factor = m[2] ? TO_BP[m[2]] : 1;
  if (factor === void 0) return null;
  return Number(m[1]) * factor;
}
function parseClipOptions(optional) {
  if (!optional) return null;
  let page = null;
  let trim = null;
  for (const piece of optional.split(",")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    const key = piece.slice(0, eq).trim();
    const value = piece.slice(eq + 1).trim().replace(/^\{|\}$/g, "");
    if (key === "page") {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1) page = n;
    } else if (key === "trim") {
      const dims = value.split(/\s+/).filter(Boolean).map(toBp);
      if (dims.length === 4 && dims.every((d) => d !== null)) trim = dims;
    }
  }
  if (page === null && trim === null) return null;
  const [left, bottom, right, top] = trim ?? [0, 0, 0, 0];
  return { page: page ?? 1, left, bottom, right, top };
}
function clipKey(clip) {
  const n = (v) => v.toFixed(2).replace(".", "_");
  return `p${clip.page}-${n(clip.left)}-${n(clip.bottom)}-${n(clip.right)}-${n(clip.top)}.png`;
}
function findSourcePdf(tex) {
  const named = /\\(?:re)?newcommand\{?\\srcpdf\}?\{([^}]+)\}/.exec(tex);
  if (named) return named[1].trim();
  const used = /\\(?:includegraphics|qfig)\s*(?:\[[^\]]*\])?\s*\{([^}]+\.pdf)\}/i.exec(tex);
  return used ? used[1].trim() : null;
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
  const joined = raw.replace(
    /\\begin\{(itemize|enumerate)\}[\s\S]*?\\end\{\1\}/g,
    (list2) => list2.replace(/\n\s*\n/g, "\n")
  );
  return joined.split(/\n\s*\n/).map((p) => inlineToHtml(p)).filter((html) => html.length > 0).map((html) => ({ type: "text", html }));
}
function figureBlock(arg, optional, caption, images) {
  const clip = parseClipOptions(optional);
  const file = clip ? clipKey(clip) : arg.trim();
  return {
    type: "figure",
    file,
    src: resolveImage(file, images),
    caption,
    width: clip ? null : optional,
    ...clip ? { clip } : null
  };
}
function toBlocks(raw, images = {}) {
  const spans = [];
  for (const call of findCommand(raw, "qfig", 2, true)) {
    spans.push({
      start: call.start,
      end: call.end,
      block: figureBlock(call.args[0], call.optional, inlineToHtml(call.args[1] ?? ""), images)
    });
  }
  for (const call of findCommand(raw, "includegraphics", 1, true)) {
    spans.push({
      start: call.start,
      end: call.end,
      block: figureBlock(call.args[0], call.optional, "", images)
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

// src/latex/guard.ts
var SERIOUS = ["unsupported-layout", "garbled-text"];
function isSerious(warning) {
  return SERIOUS.includes(warning.code);
}
var LAYOUT_COMMAND = /\\(?:mcq|stem|choice|optrow|freerow|row|dotline|dotgrid|at|lab)\s*\{/g;
var LAYOUT_THRESHOLD = 5;
function isLayoutDialect(body) {
  return (body.match(LAYOUT_COMMAND)?.length ?? 0) >= LAYOUT_THRESHOLD;
}
var list = (numbers) => numbers.slice(0, 10).map((n) => `Q${n}`).join(", ") + (numbers.length > 10 ? ", \u2026" : "");
function unreadableMaths(numbers, unknown) {
  if (numbers.length === 0 && unknown.length === 0) return null;
  const why = [
    numbers.length ? `${numbers.length} question${numbers.length === 1 ? "" : "s"} (${list(numbers)}) contain maths drawn from symbol images or paths, which cannot be read as an equation` : "",
    unknown.length ? `commands the parser does not know (${unknown.slice(0, 8).map((c) => `\\${c}`).join(", ")})` : ""
  ].filter(Boolean);
  return {
    code: "unsupported-layout",
    message: `Some of this paper will be wrong: ${why.join("; and ")}.`
  };
}
function positionedMaths(numbers) {
  if (numbers.length === 0) return null;
  return {
    code: "positioned-maths",
    message: `${list(numbers)}: a line was rebuilt from pieces placed on the page (fractions, options in a row). Check these against the paper before saving.`
  };
}
function visibleText(html) {
  return html.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, " ").replace(/<[^>]+>/g, " ");
}
var LEAKED_LENGTH = /\d(?:\.\d+)?bp\b/;
function blocksText(blocks) {
  return blocks.map((b) => b.type === "figure" ? b.caption : b.html).join(" ");
}
function partsText(parts) {
  return parts.map((p) => `${blocksText(p.content)} ${partsText(p.subparts)}`).join(" ");
}
function detectGarbledText(questions) {
  const bad = questions.filter((q) => {
    const options = q.options?.items.map((o) => o.content).join(" ") ?? "";
    return LEAKED_LENGTH.test(visibleText(`${blocksText(q.stem)} ${partsText(q.parts)} ${options}`));
  }).map((q) => q.number);
  if (bad.length === 0) return null;
  const shown = bad.slice(0, 8).map((n) => `Q${n}`).join(", ");
  return {
    code: "garbled-text",
    message: `${bad.length} question${bad.length === 1 ? "" : "s"} (${shown}${bad.length > 8 ? ", \u2026" : ""}) contain layout measurements such as "4.91bp" where text should be. The file is not in a format the parser fully understands.`
  };
}

// src/latex/layout.ts
var ELEMENTS = {
  mcq: 3,
  stem: 2,
  choice: 3,
  optrow: 5,
  row: 3,
  prow: 3,
  dotline: 5,
  qmark: 2,
  freerow: 2,
  qfig: 6
};
var SKIPPED = {
  partbreak: 0,
  pagestart: 0,
  swpage: 0,
  newpage: 0,
  gap: 1,
  hang: 1,
  total: 1,
  dotgrid: 3,
  swdepth: 1
};
function readGroups(src, from, count) {
  const args = [];
  let i = from;
  for (let n = 0; n < count; n++) {
    while (/\s/.test(src[i] ?? "")) i++;
    const g = readGroup(src, i);
    if (!g) return null;
    args.push(g.value);
    i = g.end;
  }
  return { args, end: i };
}
function tokenize(body) {
  const out = [];
  let text = "";
  const flush = () => {
    if (text.trim()) out.push({ name: "text", raw: text.trim() });
    text = "";
  };
  let i = 0;
  while (i < body.length) {
    const m = body[i] === "\\" ? /^\\([a-zA-Z]+)/.exec(body.slice(i, i + 24)) : null;
    const name = m?.[1];
    if (name && name in ELEMENTS) {
      let j = i + m[0].length;
      const opt = name === "qfig" ? readOptional(body, j) : null;
      if (opt) j = opt.end;
      const read = readGroups(body, j, ELEMENTS[name]);
      if (read) {
        flush();
        out.push({ name, args: read.args, optional: opt?.value ?? null });
        i = read.end;
        continue;
      }
    } else if (name && name in SKIPPED) {
      let j = i + m[0].length;
      const wanted = name === "total" && body[j] !== "{" ? 0 : SKIPPED[name];
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
var SYMBOL = {
  "57": "\u03A9",
  "70": "\u03C0",
  "6D": "\u03BC",
  "6C": "\u03BB",
  "71": "\u03B8",
  "61": "\u03B1",
  "62": "\u03B2",
  "67": "\u03B3",
  "44": "\u0394",
  "72": "\u03C1",
  "77": "\u03C9",
  "66": "\u03C6",
  "73": "\u03C3",
  "74": "\u03C4",
  "65": "\u03B5",
  "53": "\u03A3",
  B0: "\xB0",
  B4: "\xD7",
  B8: "\xF7",
  B1: "\xB1",
  "2D": "\u2212",
  D7: "\xB7",
  A3: "\u2264",
  B3: "\u2265",
  BB: "\u2248",
  B9: "\u2260",
  AE: "\u2192",
  D6: "\u221A",
  A5: "\u221E",
  B5: "\u221D"
};
var KNOWN_INLINE = /* @__PURE__ */ new Set([
  "textbf",
  "textit",
  "emph",
  "textsuperscript",
  "textsubscript",
  "pow",
  "ohms",
  "degC",
  "dg",
  "times",
  "newline",
  "mbox",
  "text",
  "ldots",
  "dots",
  "ge",
  "le",
  "pm",
  "textperiodcentered",
  "underline",
  "qfig",
  "dfrac",
  "mathrm"
]);
function cleanInline(src, notes) {
  const maths = [];
  let s = src.replace(/\$(?:\\[\s\S]|[^\\$])*\$/g, (m) => `${maths.push(m) - 1}`);
  s = s.replace(
    /\\swclip\{([^{}]*)\}\{([^{}]*)\}/g,
    (_, page, trim) => `\\qfig[page=${page.trim()},trim=${trim.trim()},clip]{source.pdf}{}`
  );
  if (/\\(?:swglyph|swpath)\b/.test(s)) notes.unreadable = true;
  s = s.replace(/\\swglyph\{[^{}]*\}\{[^{}]*\}/g, "");
  s = s.replace(/\\(?:begingroup|endgroup|null)(?![a-zA-Z])\s*/g, "").replace(/\\vadjust\{[^{}]*\}/g, "").replace(/\\rule\{[^{}]*\}\{[^{}]*\}/g, "").replace(/\\x?spaceskip=-?[\d.]+bp/g, "").replace(/\\hskip-?[\d.]+pt(?:\s*minus\s*[\d.]+bp)?/g, "").replace(/\\(?:relax|nobreak|strut|ignorespaces|unskip|hfill)\b ?/g, "").replace(/\\linebreak\b/g, " ").replace(/\\kern(-?[\d.]+)(?:bp|pt) ?/g, (_, n) => Number(n) >= 2 ? " " : "").replace(/\\raisebox\{[^{}]*\}(?:\[[^\]]*\])*/g, "").replace(/\\(?:makebox|rlap|llap)(?:\[[^\]]*\])*/g, "").replace(/\\swf\{[^{}]*\}\{[^{}]*\}\{([^{}]*)\}/g, (_, t) => t === "I" ? "\\textit{I}" : t).replace(/\\vI\b/g, "\\textit{I}").replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}\\selectfont\s*/g, "").replace(/\{\\itshape\s*/g, "\\textit{").replace(/\{\\bfseries\s*/g, "\\textbf{").replace(/\\(?:stack(?:\[[^\]]*\])?|nuc)\{([^{}]*)\}\{([^{}]*)\}/g, "\\textsuperscript{$1}\\textsubscript{$2}").replace(/\\sub\{/g, "\\textsubscript{").replace(/\\swsy\{([0-9A-Fa-f]+)\}/g, (_, hex) => {
    const symbol = SYMBOL[hex.toUpperCase()];
    if (!symbol) notes.unknown.add(`swsy{${hex}}`);
    return symbol ?? "";
  }).replace(/\\x(?![a-zA-Z])/g, "\xD7").replace(/\\textendash(?:\{\})?/g, "\u2013").replace(/\\textminus(?:\{\})?/g, "\u2212").replace(/\\textdegree(?:\{\})?/g, "\xB0").replace(/\\(?:swbul|textbullet)\b/g, "\u2022").replace(/\\texttimes\b/g, "\xD7").replace(/\\textdiv\b/g, "\xF7").replace(/\\pounds\b/g, "\xA3");
  for (const m of s.matchAll(/\\([a-zA-Z]+)/g)) {
    if (!KNOWN_INLINE.has(m[1])) notes.unknown.add(m[1]);
  }
  return s.replace(/[ \t]{2,}/g, " ").trim().replace(/\u0002(\d+)\u0003/g, (_, i) => maths[Number(i)]);
}
function plain(raw) {
  return raw.replace(/\\kern-?[\d.]+bp ?/g, "").replace(/\\[a-zA-Z]+/g, "").replace(/[{}\s]/g, "");
}
var ROMAN2 = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
function takeLabel(text) {
  const t = text.trimStart();
  const lab = /^\\lab\s*/.exec(t);
  if (lab) {
    const read = readGroups(t, lab[0].length, 2);
    if (read) return { label: plain(read.args[1]), rest: t.slice(read.end) };
  }
  if (t.startsWith("\\textbf{")) {
    const g = readGroup(t, 7);
    if (g && /^\([a-z]{1,4}\)$/.test(plain(g.value))) return { label: plain(g.value), rest: t.slice(g.end) };
  }
  return null;
}
function toMath(text) {
  const m = text.replace(/\\textit\{([^{}]*)\}/g, "$1").replace(/\\textsuperscript\{([^{}]*)\}/g, "^{$1}").replace(/\\textsubscript\{([^{}]*)\}/g, "_{$1}").replace(/\\pow\{([^{}]*)\}/g, "^{$1}").replace(/\\,/g, " ");
  if (/[\\$]/.test(m)) return null;
  return m.trim().replace(/[A-Za-z]{2,}/g, (word) => `\\mathrm{${word}}`).replace(/\s+/g, "\\,");
}
function parseLayoutQuestion(body, questionNumber, images = {}) {
  const notes = { unknown: /* @__PURE__ */ new Set(), unreadable: false };
  let positioned = false;
  const stem = [];
  const parts = [];
  const options = [];
  let hasFigure = false;
  let part = null;
  let sub = null;
  let topRoman = false;
  let append = null;
  const target = () => sub ?? part;
  const addMarks = (n) => {
    const t = target();
    if (t) t.marks = (t.marks ?? 0) + n;
  };
  const newDraft = (label, parentRef) => ({
    label,
    ref: `${parentRef}(${label})`,
    raw: [],
    marks: null,
    lines: 0,
    value: null,
    subs: []
  });
  const openLabel = (label) => {
    const roman = ROMAN2.includes(label);
    if (!part && roman) topRoman = true;
    const continuesLetters = part !== null && part.subs.length === 0 && label.length === 1 && label.charCodeAt(0) === part.label.charCodeAt(0) + 1;
    const asSub = part !== null && (topRoman ? !roman : roman && !continuesLetters);
    if (asSub) {
      sub = newDraft(label, part.ref);
      part.subs.push(sub);
    } else {
      part = newDraft(label, String(questionNumber));
      parts.push(part);
      sub = null;
    }
  };
  const addPara = (raw) => {
    const text = raw.trim();
    if (!text) return;
    const list2 = target()?.raw ?? stem;
    list2.push(text);
    const at = list2.length - 1;
    append = (more) => {
      list2[at] += ` ${more}`;
    };
  };
  const takeMarks = (raw) => raw.replace(/\\swmark\{\s*\[(\d+)\]\s*\}/g, (_, n) => {
    pendingMarks.push(Number(n));
    return "";
  });
  const addLine = (raw) => {
    let text = takeMarks(raw);
    for (let found = takeLabel(text); found; found = takeLabel(text)) {
      const inner = /^\(([a-z]+)\)$/.exec(found.label);
      text = found.rest;
      if (inner) openLabel(inner[1]);
      else if (!/^\d+$/.test(found.label)) {
        text = `\\textbf{${found.label}} ${found.rest}`;
        break;
      }
    }
    addPara(cleanInline(text, notes));
    pendingMarks.splice(0).forEach(addMarks);
  };
  const pendingMarks = [];
  const compose = (pieces, rules, base) => {
    const used = /* @__PURE__ */ new Set();
    const tokens = [];
    const join = (list2) => list2.sort((a, b) => a.x - b.x).map((p) => cleanInline(p.raw, notes)).join(" ");
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
      const small = /\\fontsize\{([\d.]+)bp\}/.exec(p.raw);
      const text = cleanInline(p.raw, notes);
      if (!text) continue;
      const raised = small && Number(small[1]) <= 8.5 ? p.y - base : 0;
      tokens.push({
        x: p.x,
        text: raised > 2.5 ? `\\textsuperscript{${text}}` : raised < -1.2 ? `\\textsubscript{${text}}` : text
      });
    }
    return tokens.sort((a, b) => a.x - b.x).map((t) => t.text).join(" ").replace(/ (\\textsuperscript|\\textsubscript)/g, "$1").replace(/\s+([,.;:)])/g, "$1");
  };
  const freerow = (inner) => {
    positioned = true;
    if (/\\(?:swglyph|swpath)\b/.test(inner)) notes.unreadable = true;
    const pieces = [];
    const rules = [];
    for (const m of inner.matchAll(/\\(at|ruleat)\s*(?=\{)/g)) {
      const read = readGroups(inner, m.index + m[0].length, m[1] === "at" ? 3 : 4);
      if (!read) continue;
      const [a, b, c] = read.args;
      if (m[1] === "at") pieces.push({ x: Number(a), y: Number(b), raw: c });
      else rules.push({ x1: Number(a), x2: Number(b), y: Number(c) });
    }
    const isLetter = (p) => /^\\textbf\{\s*[A-D]\s*\}$/.test(p.raw.trim());
    const letters = pieces.filter(isLetter).sort((a, b) => a.x - b.x);
    if (letters.length >= 2) {
      letters.forEach((letter, i) => {
        const end = letters[i + 1]?.x ?? Infinity;
        const within = (x) => x >= letter.x && x < end;
        const content = compose(
          pieces.filter((p) => !isLetter(p) && within(p.x)),
          rules.filter((r) => within(r.x1)),
          letter.y
        );
        options.push({ label: plain(letter.raw), content: inlineToHtml(content) });
      });
      append = null;
      return;
    }
    const counts = /* @__PURE__ */ new Map();
    for (const p of pieces) counts.set(Math.round(p.y), (counts.get(Math.round(p.y)) ?? 0) + 1);
    const base = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    const body2 = [];
    for (const p of pieces.sort((a, b) => a.x - b.x)) {
      const mark = /\\swmark\{\s*\[(\d+)\]\s*\}/.exec(p.raw);
      const label = /^\\textbf\{[^{}]*\}$/.test(p.raw.trim()) ? plain(p.raw) : "";
      const inner2 = /^\(([a-z]+)\)$/.exec(label);
      if (mark) pendingMarks.push(Number(mark[1]));
      else if (inner2) openLabel(inner2[1]);
      else if (/^\d+$/.test(label) && Number(label) === questionNumber) continue;
      else body2.push(p);
    }
    addPara(compose(body2, rules, base));
    pendingMarks.splice(0).forEach(addMarks);
  };
  for (const token of tokenize(body)) {
    if (token.name === "text") {
      const more = cleanInline(takeMarks(token.raw), notes);
      if (append) append(more);
      else addPara(more);
      pendingMarks.splice(0).forEach(addMarks);
      continue;
    }
    const { name, args, optional } = token;
    if (name === "mcq") addLine(args[2]);
    else if (name === "stem") addLine(args[1]);
    else if (name === "row" || name === "prow") addLine(args[2]);
    else if (name === "freerow") freerow(args[1]);
    else if (name === "qmark") {
      const m = /\[(\d+)\]/.exec(args[1]);
      if (m) addMarks(Number(m[1]));
    } else if (name === "choice") {
      const item = { label: plain(args[1]), content: inlineToHtml(cleanInline(args[2], notes)) };
      options.push(item);
      append = (more) => {
        item.content = inlineToHtml(`${item.content} ${more}`);
      };
    } else if (name === "optrow") {
      ["A", "B", "C", "D"].forEach((label, i) => {
        options.push({ label, content: inlineToHtml(cleanInline(args[i + 1], notes)) });
      });
      append = null;
    } else if (name === "dotline") {
      const before = args[2].trim();
      const labelled = takeLabel(before);
      const mark = /\[(\d+)\]/.exec(args[3]);
      if (labelled || before && !/=\s*$/.test(plain(before))) addLine(before);
      const t = target();
      if (t) {
        t.lines++;
        if (!labelled && /=\s*$/.test(plain(before)) && !t.value) {
          t.value = {
            label: inlineToHtml(cleanInline(before, notes)),
            unit: inlineToHtml(cleanInline(args[3].replace(/\[\d+\]/, ""), notes))
          };
        }
      }
      if (mark) addMarks(Number(mark[1]));
      append = null;
    } else if (name === "qfig") {
      hasFigure = true;
      const trim = args[1].trim().replace(/\s+/g, " ");
      const extra = optional ? `,${optional}` : "";
      const list2 = target()?.raw ?? stem;
      list2.push(`\\qfig[page=${args[0].trim()},trim=${trim},clip${extra}]{source.pdf}{${cleanInline(args[2], notes)}}`);
      append = null;
    }
  }
  const finish = (d) => {
    const subparts = d.subs.map(finish);
    const known = subparts.map((p) => p.marks).filter((m) => m !== null);
    const answerSpace = d.value ? { kind: "value", ...d.value } : d.lines > 0 ? { kind: "lines", lines: d.lines } : d.marks !== null ? { kind: "markright" } : null;
    return {
      label: d.label,
      ref: d.ref,
      // A grouping part has no marks of its own; they live on the subparts.
      marks: subparts.length > 0 ? known.length ? known.reduce((a, b) => a + b, 0) + (d.marks ?? 0) : d.marks : d.marks,
      answerSpace,
      content: toBlocks(d.raw.join("\n\n"), images),
      subparts
    };
  };
  return {
    stem: toBlocks(stem.join("\n\n"), images),
    parts: parts.map(finish),
    options: options.length ? { source: "choices", items: options } : hasFigure ? { source: "figure", items: [] } : null,
    positioned,
    unreadable: notes.unreadable,
    unknown: [...notes.unknown]
  };
}

// src/latex/markscheme.ts
function stripRowDecoration(row) {
  return row.replace(/\\hline/g, "").replace(/\\cline\{[^}]*\}/g, "").replace(/\\rowcolor\{[^}]*\}/g, "").replace(/\\arrayrulecolor\{[^}]*\}/g, "").trim();
}
function parseLabelCellDetailed(cell) {
  const cleaned = stripRowDecoration(cell);
  const spaced = (label) => label.replace(/\\[,;:! ]|~/g, " ").replace(/\s+/g, " ").trim();
  const mr = /\\multirow\{(-?)\d+\}\{[^}]*\}\{([^}]*)\}/.exec(cleaned);
  if (mr) return { label: spaced(mr[2]), direction: mr[1] === "-" ? "up" : "down" };
  const plain2 = spaced(cleaned.replace(/\\[a-zA-Z]+\s*/g, ""));
  return { label: plain2.length > 0 ? plain2 : null, direction: "down" };
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
var FOR_MARKER = /^\s*For\s+(\([a-z]+\))(\([ivx]+\))?\d*\s*[,:]\s*/;
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
  let lastLetter = "";
  const ROMAN3 = /^\((?:i{1,3}|iv|vi{0,3}|ix|x)\)$/;
  const qualify = (label) => {
    const pair = /^(\([a-z]\))(\([ivx]+\))$/.exec(label);
    if (pair) {
      lastLetter = pair[1];
      return label;
    }
    if (ROMAN3.test(label)) return lastLetter ? `${lastLetter}${label}` : label;
    if (/^\([a-z]\)$/.test(label)) lastLetter = label;
    return label;
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/^(\s*)\\textbf\{(\([a-z]+\)(?:\([ivx]+\))?)\}/, "$1$2");
    const sentence = FOR_MARKER.exec(line);
    if (sentence) {
      flush();
      lastLetter = sentence[1];
      currentRef = `${questionNumber}${sentence[1]}${sentence[2] ?? ""}`;
      currentHeading = null;
      buffer = [line.slice(sentence[0].length)];
      continue;
    }
    const m = MARKER.exec(line);
    if (m) {
      flush();
      const suffix = line.slice(m[0].length);
      currentRef = `${questionNumber}${qualify(m[1])}`;
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

// src/latex/flatten.ts
var MAX_LENGTH = 8e3;
var MATH = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]*\$|\\\([\s\S]*?\\\)/g;
function flattenQuestion(q) {
  if (!q) return "";
  const out = [];
  const fromBlocks = (blocks) => {
    for (const block of blocks ?? []) {
      const b = block;
      if (b.type === "text") out.push(b.html ?? "");
      else if (b.type === "figure" && b.caption) out.push(b.caption);
      else if (b.type === "table") out.push(b.html ?? "");
    }
  };
  const fromParts = (parts) => {
    for (const part of parts ?? []) {
      const p = part;
      fromBlocks(p.content);
      fromParts(p.subparts);
    }
  };
  fromBlocks(q.stem);
  fromParts(q.parts);
  for (const item of q.options?.items ?? []) out.push(item.content ?? "");
  for (const row of q.answer?.markScheme ?? []) out.push(row.answer ?? "");
  for (const seg of q.answer?.workedSolution ?? []) {
    if (seg.heading) out.push(seg.heading);
    out.push(seg.html ?? "");
  }
  return out.join(" ").replace(/<span>\$<\/span>/g, " ").replace(MATH, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
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
function diagramWarning(body, file) {
  const n = countDiagrams(body);
  if (!n) return [];
  return [
    {
      code: "diagram-omitted",
      message: `${n} TikZ diagram${n === 1 ? "" : "s"} in the ${file} file cannot be shown in the browser and ${n === 1 ? "was" : "were"} left out. Use a figure image or a PDF clip for anything that must appear.`
    }
  ];
}
function parseQuestionPaper(tex, images = {}) {
  const { body } = splitDocument(tex);
  const cleaned = normalizeWhitespace(stripLayoutNoise(stripDiagrams(body)));
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
  const layout = isLayoutDialect(body);
  const positioned = [];
  const unreadable = [];
  const unknown = /* @__PURE__ */ new Set();
  const drafts = blocks.map((block) => {
    const marks = parseMarks(block.marksRaw);
    if (layout) {
      const q = parseLayoutQuestion(block.body, block.number, images);
      if (q.unreadable) unreadable.push(block.number);
      else if (q.positioned) positioned.push(block.number);
      q.unknown.forEach((name) => unknown.add(name));
      return { block, marks, stem: q.stem, parts: q.parts, options: q.parts.length === 0 ? q.options : null };
    }
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
  const problems = [
    positionedMaths(positioned),
    detectGarbledText(questions),
    unreadableMaths(unreadable, [...unknown])
  ];
  for (const problem of problems) {
    if (problem) warnings.unshift(problem);
  }
  warnings.push(...diagramWarning(body, "questions"));
  const sourcePdf = findSourcePdf(tex);
  return { paper, questions, warnings, ...sourcePdf ? { sourcePdf } : null };
}
function parseAnswerPaper(tex, images = {}) {
  const { preamble, body } = splitDocument(tex);
  const columns = detectMstabColumns(preamble);
  const cleaned = normalizeWhitespace(stripLayoutNoise(stripDiagrams(body)));
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
  warnings.push(...diagramWarning(body, "answers"));
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
  return {
    paper: qp.paper ?? qa.paper,
    questions,
    warnings,
    ...qp.sourcePdf ? { sourcePdf: qp.sourcePdf } : null
  };
}
export {
  clipKey,
  extractAnswerSpace,
  extractMarkScheme,
  extractSolution,
  findSourcePdf,
  flattenQuestion,
  inlineToHtml,
  isSerious,
  mergePaper,
  parseAnsbox,
  parseAnswerPaper,
  parseClipOptions,
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
