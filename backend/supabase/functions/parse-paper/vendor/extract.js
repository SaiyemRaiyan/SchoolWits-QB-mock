/* GENERATED - do not edit. Bundled from backend/src/extract/ by npm run build:function. */

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
  const [left, bottom, right2, top] = trim ?? [0, 0, 0, 0];
  return { page: page ?? 1, left, bottom, right: right2, top };
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

// src/latex/guard.ts
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
var LEAKED_LENGTH = /\d(?:\.\d+)?(?:bp|pt)\b/;
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
      splitItems(env.body).forEach((sub2, i) => {
        subparts.push(buildPart(sub2, romanLabel(i), ref, images, true));
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
var DINGBAT = { "33": "\u2713", "34": "\u2714", "35": "\u2715", "36": "\u2716", "37": "\u2717", "38": "\u2718" };
var INNER = String.raw`(?:[^{}]|\{[^{}]*\})*`;
var PLAB = new RegExp(String.raw`\\plab\{[^{}]*\}\{(${INNER})\}`, "g");
var PHANTOM = new RegExp(String.raw`\\phantom\{${INNER}\}`, "g");
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
function inlineFractions(src, notes) {
  const OPEN = /^\\rlap(?=\{)/;
  let out = "";
  let i = 0;
  while (i < src.length) {
    const pieces = [];
    let j = i;
    while (OPEN.test(src.slice(j, j + 6))) {
      const group = readGroup(src, j + 5);
      const m = group && /^\s*(?:\\kern-?[\d.]+bp\s*)?\\raisebox\{(-?[\d.]+)bp\}(?:\[[^\]]*\])*(\{[\s\S]*\})\s*$/.exec(group.value);
      if (!group || !m) break;
      pieces.push({ y: Number(m[1]), raw: m[2].slice(1, -1) });
      j = group.end;
    }
    const rule = pieces.find((p) => /^\s*\\rule\{/.test(p.raw));
    const side = (above) => pieces.filter((p) => p !== rule && p.y > rule.y === above).map((p) => cleanInline(p.raw, notes).replace(/\$/g, "")).join(" ");
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
function cleanInline(src, notes) {
  const maths = [];
  let s = inlineFractions(src, notes).replace(/\$(?:\\[\s\S]|[^\\$])*\$/g, (m) => `${maths.push(m) - 1}`);
  s = s.replace(
    /\\swclip\{([^{}]*)\}\{([^{}]*)\}/g,
    (_, page, trim) => `\\qfig[page=${page.trim()},trim=${trim.trim()},clip]{source.pdf}{}`
  );
  if (/\\(?:swglyph|swpath)\b/.test(s)) notes.unreadable = true;
  s = s.replace(/\\swglyph\{[^{}]*\}\{[^{}]*\}/g, "");
  s = s.replace(/\\(?:begingroup|endgroup|null)(?![a-zA-Z])\s*/g, "").replace(/\\parfillskip-?[\d.]+pt/g, "").replace(/\\par(?![a-zA-Z])/g, "").replace(/\\advance\\x?spaceskip-?[\d.]+bp/g, "").replace(/\\textls(?:\[[^\]]*\])?(?=\{)/g, "").replace(/\\smash(?=\{)/g, "").replace(/\\pdfsetmatrix\{[^{}]*\}|\\pdfsave(?![a-zA-Z])|\\pdfrestore(?![a-zA-Z])/g, "").replace(PHANTOM, "").replace(PLAB, "$1 ").replace(/\\usefont\{U\}\{pzd\}\{m\}\{n\}\\char"([0-9A-Fa-f]{2})/g, (_, hex) => {
    if (!DINGBAT[hex]) notes.unknown.add(`pzd{${hex}}`);
    return DINGBAT[hex] ?? "";
  }).replace(/\\font\\(\w+)=\w+ at [\d.]+bp\\\1\\char"85/g, "\u2026").replace(/\\vadjust\{[^{}]*\}/g, "").replace(/\\rule\{[^{}]*\}\{[^{}]*\}/g, "").replace(/\\x?spaceskip=-?[\d.]+bp/g, "").replace(/\\hskip-?[\d.]+pt(?:\s*(?:plus|minus)\s*-?[\d.]+(?:bp|pt|fil+))*/g, "").replace(/\\(?:relax|nobreak|strut|ignorespaces|unskip|hfill)\b ?/g, "").replace(/\\linebreak\b/g, " ").replace(/\\kern(-?[\d.]+)(?:bp|pt) ?/g, (_, n) => Number(n) >= 2 ? " " : "").replace(/\\raisebox\{[^{}]*\}(?:\[[^\]]*\])*/g, "").replace(/\\(?:makebox|rlap|llap)(?:\[[^\]]*\])*/g, "").replace(/\\swf\{[^{}]*\}\{[^{}]*\}\{([^{}]*)\}/g, (_, t) => {
    const letter = t.replace(/^\\itshape\s*/, "");
    return letter === "I" || letter !== t ? `\\textit{${letter}}` : t;
  }).replace(/\\vI\b/g, "\\textit{I}").replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}\\selectfont\s*/g, "").replace(/\{\\itshape\s*/g, "\\textit{").replace(/\{\\bfseries\s*/g, "\\textbf{").replace(/\\(?:stack(?:\[[^\]]*\])?|nuc)\{([^{}]*)\}\{([^{}]*)\}/g, "\\textsuperscript{$1}\\textsubscript{$2}").replace(/\\sub\{/g, "\\textsubscript{").replace(/\\swsy\{([0-9A-Fa-f]+)\}/g, (_, hex) => {
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
  return raw.replace(/\\kern-?[\d.]+bp ?/g, "").replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}/g, "").replace(/\\[a-zA-Z]+/g, "").replace(/[{}\s]/g, "");
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
function isSmallPiece(p) {
  return Number(/\\fontsize\{([\d.]+)bp\}/.exec(p.raw)?.[1] ?? 99) <= 8.5;
}
function toMath(text) {
  let flat = text;
  for (let was = ""; was !== flat; ) {
    was = flat;
    flat = flat.replace(/\\textit\{([^{}]*)\}/g, "$1").replace(/(^|[^\\a-zA-Z^_])\{([^{}]*)\}/g, "$1$2");
  }
  const m = flat.replace(/\\textsuperscript\{([^{}]*)\}/g, "^{$1}").replace(/\\textsubscript\{([^{}]*)\}/g, "_{$1}").replace(/\\pow\{([^{}]*)\}/g, "^{$1}").replace(/\\,/g, " ");
  if (/[\\$]/.test(m)) return null;
  return m.trim().replace(/[A-Za-z]{2,}/g, (word) => `\\mathrm{${word}}`).replace(/\s+/g, "\\,");
}
function parseLayoutQuestion(body, questionNumber, images = {}) {
  const notes = { unknown: /* @__PURE__ */ new Set(), unreadable: false };
  let positioned = false;
  const stem = [];
  const parts = [];
  const options = [];
  const isMcq = /\\mcq\s*\{/.test(body);
  let hasFigure = false;
  let part = null;
  let sub2 = null;
  let topRoman = false;
  let append = null;
  const target = () => sub2 ?? part;
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
      sub2 = newDraft(label, part.ref);
      part.subs.push(sub2);
    } else {
      part = newDraft(label, String(questionNumber));
      parts.push(part);
      sub2 = null;
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
        text = found.label === "\u2022" ? `\u2022 ${found.rest}` : `\\textbf{${found.label}} ${found.rest}`;
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
    const scripted = (p, text, line) => {
      const raised = isSmallPiece(p) ? p.y - line : 0;
      return raised > 2.5 ? `\\textsuperscript{${text}}` : raised < -0.8 ? `\\textsubscript{${text}}` : text;
    };
    const join = (list2) => {
      const line = list2.find((p) => !isSmallPiece(p))?.y ?? list2[0].y;
      return list2.sort((a, b) => a.x - b.x).map((p) => scripted(p, cleanInline(p.raw, notes), line)).join(" ").replace(/ (\\textsuperscript|\\textsubscript)/g, "$1");
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
    for (const minus of pieces.filter((p) => p.raw.trim() === "\\_")) {
      const GAP = /\\kern(?:[89]|\d{2,})(?:\.\d+)?bp ?/g;
      const under = pieces.filter(
        (p) => p.x < minus.x && minus.y - p.y > 2 && minus.y - p.y < 7 && p.raw.match(GAP)?.length === 1
      );
      if (under.length === 1) {
        under[0].raw = under[0].raw.replace(GAP, " \u2212 ");
        pieces.splice(pieces.indexOf(minus), 1);
      } else notes.unreadable = true;
    }
    const isLetter = (p) => /^\\textbf\{\s*[A-D]\s*\}$/.test(p.raw.trim());
    const letters = pieces.filter(isLetter).sort((a, b) => b.y - a.y || a.x - b.x);
    const first = Math.min(...pieces.map((p) => p.x));
    if (letters.length >= 2 || isMcq && letters.length === 1 && letters[0].x === first) {
      const owner = (x, y) => {
        const near = Math.min(...letters.map((l) => Math.abs(l.y - y)));
        const line = letters.filter((l) => Math.abs(l.y - y) < near + 3);
        return line.filter((l) => l.x <= x).sort((a, b) => b.x - a.x)[0] ?? line[0];
      };
      for (const letter of letters) {
        const content = compose(
          pieces.filter((p) => !isLetter(p) && owner(p.x, p.y) === letter),
          rules.filter((r) => owner(r.x1, r.y) === letter),
          letter.y
        );
        options.push({ label: plain(letter.raw), content: inlineToHtml(content) });
      }
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
    const readLines = (block, lineRules, line) => {
      const ys = [...new Set(block.filter((p) => !isSmallPiece(p)).map((p) => p.y))].sort((a, b) => b - a);
      const gap2 = ys.findIndex((y, n) => n > 0 && ys[n - 1] - y > 10);
      if (gap2 > 0) {
        const cut = (ys[gap2 - 1] + ys[gap2]) / 2;
        const upper = block.filter((p) => p.y > cut);
        const lower = block.filter((p) => p.y <= cut);
        const left = (l) => Math.min(...l.map((p) => p.x));
        const isText2 = (l) => l.some((p) => /[a-z]{3,}.*\s.*[a-z]{2,}/.test(cleanInline(p.raw, notes)));
        const crossed = lineRules.some((r) => {
          const over = block.filter((p) => p.x >= r.x1 - 6 && p.x <= r.x2 + 3);
          return Math.abs(r.y - cut) < 4 || r.y <= cut && over.some((p) => p.y > cut && p.y - r.y < 10);
        });
        if (Math.abs(left(upper) - left(lower)) < 3 && isText2(upper) && isText2(lower) && !crossed) {
          const top = compose(upper, lineRules.filter((r) => r.y > cut), ys[0]);
          return `${top} ${readLines(lower, lineRules.filter((r) => r.y <= cut), ys[gap2])}`;
        }
      }
      return compose(block, lineRules, line);
    };
    addPara(readLines(body2, rules, base));
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
  const ROMAN4 = /^\((?:i{1,3}|iv|vi{0,3}|ix|x)\)$/;
  const qualify = (label) => {
    const pair = /^(\([a-z]\))(\([ivx]+\))$/.exec(label);
    if (pair) {
      lastLetter = pair[1];
      return label;
    }
    if (ROMAN4.test(label)) return lastLetter ? `${lastLetter}${label}` : label;
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
  for (const env of findEnvironments(body, "mstab")) {
    const m = /^\s*(?:\{[^{}]*\})?\s*\d+\s*&\s*([A-D])\s*&[^&]*\\\\\s*(?:\\hline\s*)?$/.exec(env.body);
    if (m) return m[1];
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

// src/extract/answers.ts
var MARK = "\uE7F0\uE7F1";
function hideMathBreaks(tex) {
  let out = "";
  let math = null;
  let i = 0;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === "%" && math === null) {
      const end = tex.indexOf("\n", i);
      const stop = end === -1 ? tex.length : end;
      out += tex.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "\\") {
      const two = tex.slice(i, i + 2);
      if (two === "\\\\" && math !== null) {
        out += MARK;
        i += 2;
        continue;
      }
      if (two === "\\(" && math === null) math = "\\(";
      else if (two === "\\)" && math === "\\(") math = null;
      out += two;
      i += 2;
      continue;
    }
    if (ch === "$") {
      const dbl = tex[i + 1] === "$";
      if (math === null) math = dbl ? "$$" : "$";
      else if (math === "$$" && dbl || math === "$" && !dbl) math = null;
      out += dbl ? "$$" : "$";
      i += dbl ? 2 : 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}
function restoreMathBreaks(value) {
  if (typeof value === "string") return value.split(MARK).join("\\\\");
  if (Array.isArray(value)) return value.map(restoreMathBreaks);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restoreMathBreaks(v)]));
  }
  return value;
}

// src/extract/symbols.ts
var BOXES = [
  // Chemistry: a letter whose font has no l or I distinct enough to set again.
  ["l", 12.04, 2.64, 11, 3.08, 4.18],
  ["I", 12.04, 2.64, 11, 4.63, 6],
  ["I", 13.08, 2.88, 12, 3.99],
  ["V", 13.08, 2.88, 12, 8.65],
  ["\u2022", 12.1, 2.64, 11, 6.64],
  ["\u25CF", 11.96, 2.63, 11, 6.93],
  ["\u25CB", 11.96, 2.63, 11, 7.96],
  ["\u2713", 12.04, 2.64, 11, 8.3],
  ["\u2713", 13.2, 2.88, 12, 9.06],
  ["\u21CC", 11.99, 2.64, 11, 10.85],
  ["\u2212", 9.08, 1.98, 8.25, 5.24],
  // MathType's own signs, cut to their ink, at 11.5 and 8.
  ["\u2212", 1.5, -2.2, 11.5, 7.5],
  ["\u2212", 1.3, -1.6, 8, 5.4, 5.6],
  ["\u2212", 1.8, -1, 8, 3.7],
  ["\u03B8", 8.7, 0.6, 11.5, 6.1, 6.3],
  ["\u03B8", 8.5, 0.6, 11.5, 5.8, 6.1],
  ["\u03B8", 9, 0.6, 11.5, 5.8],
  ["\u03C0", 5.8, 0.6, 11.5, 5.8, 6.1, 6.3],
  ["\u03C0", 4.6, 0.4, 8, 4.6],
  ["\u221E", 3.9, -0.9, 11.5, 6.8, 6.3],
  ["\u2260", 9.9, 1.2, 11.5, 7.5, 7.8],
  ["\u0394", 8.5, 0.5, 11.5, 7.5],
  // Cap and cup: the same box as each other, and within the page slack of
  // Delta's. Known, but not nameable: it makes Delta's box uncertain too.
  ["", 8.48, 0.5, 11.5, 7.48],
  ["\u2032", 3.7, -4.6, 11.5, 2.2, 2.5],
  ["\u03BC", 9, 2.9, 11.5, 8],
  ["\u03B1", 6.6, 0.6, 11.5, 7.3],
  ["\u03BB", 9.2, 0.6, 11.5, 7],
  ["\u03BB", 9.4, 0.8, 11.5, 7],
  ["\u03C6", 11.6, 2.9, 11.5, 7, 7.3],
  ["\xB1", 7.8, 0.5, 11.5, 7],
  ["\u2208", 7, 1, 11.5, 7.8],
  ["\u211D", 9.4, 1, 11.5, 8.7, 9],
  ["\u211D", 9, 1, 11.5, 8.5],
  ["\u2130", 9, 0.5, 11.5, 7.5],
  ["\u21A6", 4.2, -0.5, 11.5, 10.2],
  ["\xB0", 3.4, -5.1, 11.5, 3],
  ["\xB0", 3.2, -5.1, 11.5, 3.2]
];
var ITALIC = /* @__PURE__ */ new Set(["\u03B8", "\u03B1", "\u03BB", "\u03BC", "\u03C6"]);
var PAGE_SLACK = 0.3;
var CLOSE = 0.08;
var SymbolTable = class {
  known;
  constructor(boxes = BOXES) {
    this.known = boxes.flatMap(
      ([char, height, drop, size, ...widths]) => widths.map((width) => ({ char, width, height, drop, size, ...ITALIC.has(char) ? { italic: true } : null }))
    );
  }
  read(glyph) {
    return this.find(glyph)?.char ?? null;
  }
  /** The nearest entry, if no entry for another character is in reach too. */
  find(glyph) {
    const reach = this.known.filter((k) => {
      const dw = glyph.width - k.width;
      return Math.abs(glyph.height - k.height) <= CLOSE + 0.02 && dw >= -CLOSE && dw <= PAGE_SLACK;
    });
    const off = (k) => Math.abs(glyph.width - k.width) + Math.abs(glyph.height - k.height);
    const best = [...reach].sort((a, b) => off(a) - off(b))[0];
    if (!best || best.char === "") return null;
    const rival = reach.some((k) => k.char !== best.char && off(k) < off(best) + 0.2);
    return rival ? null : best;
  }
};
var BRACKET_BOXES = [
  [11.6, 2.97, 3.44],
  [11.84, 3.44, 3.68],
  [12.08, 3.68],
  [12.32, 3.44, 3.68],
  [12.56, 3.44, 3.68, 5.12],
  [12.8, 3.44],
  [13.04, 3.44, 3.69],
  [14, 4.64, 4.88],
  [15.92, 3.68, 3.92],
  [16.4, 3.93],
  [16.64, 3.68, 3.92],
  [17.84, 3.92],
  [21.44, 4.16],
  [21.68, 4.16],
  [22.16, 4.16],
  [22.4, 4.16],
  [22.88, 4.16],
  [23.12, 4.16],
  [23.36, 4.16, 4.4],
  [26.72, 4.4],
  [26.96, 4.41],
  [27.92, 3.44, 3.68, 4.4],
  [28.16, 4.4],
  [29.36, 3.68, 3.92],
  [31.04, 3.92],
  [32.48, 3.68, 3.92],
  [33.44, 4.4],
  [40.16, 3.68],
  [40.4, 3.68],
  [40.88, 3.68],
  [41.36, 4.16],
  [41.84, 4.17],
  [55.28, 4.4]
];
function isRoundBracket(glyph) {
  return BRACKET_BOXES.some(
    ([height, ...widths]) => Math.abs(glyph.height - height) <= CLOSE + 0.02 && widths.some((w) => glyph.width - w >= -CLOSE && glyph.width - w <= PAGE_SLACK)
  );
}
var INTEGRAL_BOXES = [[21.68, 7.76], [24.08, 8.72]];
function isIntegral(glyph) {
  return INTEGRAL_BOXES.some(
    ([height, width]) => Math.abs(glyph.height - height) <= CLOSE + 0.02 && glyph.width - width >= -CLOSE && glyph.width - width <= PAGE_SLACK
  );
}
var BRACKET_PIECE_BOXES = [[29.84, 3.68], [30.08, 3.68], [33.2, 3.68]];
function isRoundBracketPiece(glyph) {
  return BRACKET_PIECE_BOXES.some(
    ([height, width]) => Math.abs(glyph.height - height) <= CLOSE + 0.02 && glyph.width - width >= -CLOSE && glyph.width - width <= PAGE_SLACK
  );
}

// src/extract/to-math.ts
var FUNCTIONS = /^(?:arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|sec|cot|cosec|log|ln|lg|exp|det|max|min)$/;
var SIGNS = {
  "\u2212": "-",
  "\u2013": "-",
  "\xD7": "\\times ",
  "\xF7": "\\div ",
  "\xB1": "\\pm ",
  "\xB7": "\\cdot ",
  "\xB0": "^{\\circ}",
  "\u2026": "\\ldots ",
  "\u2264": "\\leq ",
  "\u2265": "\\geq ",
  "\u2260": "\\neq ",
  "\u2248": "\\approx ",
  "\u221E": "\\infty ",
  "\u2192": "\\rightarrow ",
  "\u2032": "'",
  "\u2033": "''",
  "\u2229": "\\cap ",
  "\u222A": "\\cup ",
  "\u2208": "\\in ",
  "\u2209": "\\notin ",
  "\u2282": "\\subset ",
  "\u2286": "\\subseteq ",
  "\u2205": "\\varnothing ",
  "\u21CC": "\\rightleftharpoons ",
  "\u221D": "\\propto ",
  "\u2202": "\\partial ",
  "\u222B": "\\int ",
  "\u2211": "\\sum ",
  "\u221A": "\\surd ",
  "\u2019": "'",
  "\u211D": "\\mathbb{R}",
  "\u2130": "\\mathscr{E}",
  "\u21A6": "\\mapsto ",
  "%": "\\%",
  "#": "\\#",
  "&": "\\&",
  "\u25A1": "\\square "
};
var GREEK = {
  \u03B1: "alpha",
  \u03B2: "beta",
  \u03B3: "gamma",
  \u03B4: "delta",
  \u03B5: "varepsilon",
  \u03B6: "zeta",
  \u03B7: "eta",
  \u03B8: "theta",
  \u03BA: "kappa",
  \u03BB: "lambda",
  \u03BC: "mu",
  \u03BD: "nu",
  \u03BE: "xi",
  \u03C0: "pi",
  \u03C1: "rho",
  \u03C3: "sigma",
  \u03C4: "tau",
  \u03C6: "phi",
  \u03D5: "phi",
  \u03C7: "chi",
  \u03C8: "psi",
  \u03C9: "omega",
  \u0393: "Gamma",
  \u0394: "Delta",
  \u0398: "Theta",
  \u039B: "Lambda",
  \u03A0: "Pi",
  \u03A3: "Sigma",
  \u03A6: "Phi",
  \u03A8: "Psi",
  \u03A9: "Omega"
};
var WRAP = {
  textbf: (t) => `\\mathbf{${t}}`,
  textsuperscript: (t) => `^{${t}}`,
  textsubscript: (t) => `_{${t}}`,
  underline: (t) => `\\underline{${t}}`
};
function toMath2(tex, italic = false) {
  let out = "";
  let i = 0;
  const letters = /[A-Za-z]+/y;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === "$") {
      const end = tex.indexOf("$", i + 1);
      if (end === -1) return null;
      out += ` ${tex.slice(i + 1, end)} `;
      i = end + 1;
    } else if (ch === "\\") {
      const m = /^\\([a-zA-Z]+)\{/.exec(tex.slice(i, i + 24));
      if (m) {
        const g = readGroup(tex, i + m[0].length - 1);
        if (!g) return null;
        const inner = toMath2(g.value, m[1] === "textit" || italic && m[1] !== "textbf");
        if (inner === null) return null;
        if (m[1] === "textit") out += inner;
        else if (WRAP[m[1]]) out += WRAP[m[1]](inner);
        else return null;
        i = g.end;
      } else if (/[%#&_${}]/.test(tex[i + 1] ?? "")) {
        out += `\\${tex[i + 1]}`;
        i += 2;
      } else return null;
    } else if (/[A-Za-z]/.test(ch)) {
      letters.lastIndex = i;
      const word = letters.exec(tex)[0];
      out += italic ? word.length > 3 ? `\\textit{${word}}` : word : upright(word);
      i += word.length;
    } else if (/[0-9+=()[\].,:;!/|<>*?-]/.test(ch)) {
      out += ch;
      i++;
    } else if (ch === " ") {
      out += /[A-Za-z},.]$/.test(out) && /^ (?:[A-Za-z(]|\\(?!text(?:super|sub)script\{))/.test(tex.slice(i)) ? "\\;" : " ";
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
function upright(word) {
  if (word === "cosec") return "\\operatorname{cosec}";
  if (FUNCTIONS.test(word)) return `\\${word} `;
  return `\\mathrm{${word}}`;
}

// src/extract/equations/geometry.ts
var isComposite = (p) => p.kind === "math" && "top" in p;
var right = (p) => p.x + p.width;
var middle = (p) => p.x + p.width / 2;
function sizeOf(p, fallback) {
  return p.kind === "text" ? p.size : p.kind === "math" ? p.size ?? fallback : fallback;
}
function extent(p, size) {
  if (isComposite(p)) return { top: p.top, bottom: p.bottom };
  if (p.kind === "text") return { top: p.y + 0.72 * p.size, bottom: p.y - 0.22 * p.size };
  if (p.kind === "math") {
    const s = p.size ?? size;
    const tall = /\\d?frac|\\begin\{|\\int|\\sum|\\left/.test(p.tex);
    return tall ? { top: p.y + 1.3 * s, bottom: p.y - 0.9 * s } : { top: p.y + 0.72 * s, bottom: p.y - 0.22 * s };
  }
  if (p.kind === "glyph") return { top: p.y + p.height, bottom: p.y };
  if (p.kind === "rule") return { top: p.y + p.thickness / 2, bottom: p.y - p.thickness / 2 };
  const ys = p.points.map((q) => q.y);
  return { top: Math.max(...ys), bottom: Math.min(...ys) };
}
function asBar(p) {
  if (p.kind === "rule") return { piece: p, x1: p.x, x2: right(p), y: p.y };
  if (p.kind !== "path" || p.points.length > 4) return null;
  const { top, bottom } = extent(p, 11);
  if (top - bottom > 1.3 || p.width < 2) return null;
  return { piece: p, x1: p.x, x2: right(p), y: (top + bottom) / 2 };
}
function barsOf(line) {
  return line.pieces.map(asBar).filter((b) => b !== null).sort((a, b) => a.x2 - a.x1 - (b.x2 - b.x1));
}
function asRoot(p) {
  if (p.kind !== "path" || p.points.length !== 3) return null;
  const [a, b, c] = p.points;
  if (Math.abs(b.y - c.y) > 0.3 || c.x - b.x < 3 || b.y - a.y < 4 || b.x < a.x) return null;
  return { x: a.x, rise: b.x, end: c.x, top: b.y, foot: a.y, piece: p };
}
var unresolved = (p) => p.kind === "rule" || p.kind === "path" || p.kind === "glyph";
var without = (line, gone, put = []) => ({
  ...line,
  pieces: [...line.pieces.filter((p) => !gone.includes(p)), ...put]
});
var sub = (line, pieces) => ({ pieces, size: line.size });
function baseSize(pieces, fallback) {
  const sizes = pieces.flatMap(
    (p) => p.kind === "text" && /[\p{L}\p{N}]/u.test(p.text) ? [p.size] : p.kind === "math" && p.size ? [p.size] : []
  );
  return sizes.length ? Math.max(...sizes) : fallback;
}
var isText = (p) => p.kind === "text";

// src/extract/equations/fraction.ts
var Fractions = class {
  name = "fractions";
  read(line, context) {
    for (const bar of barsOf(line)) {
      const near = line.pieces.filter((p) => p !== bar.piece && middle(p) > bar.x1 - 1 && middle(p) < bar.x2 + 1);
      const beside = near.filter((p) => !unresolved(p)).sort((a, b) => gap(a, bar.y, line) - gap(b, bar.y, line))[0];
      if (!beside) continue;
      const s = Math.max(sizeOf(beside, line.size), ...near.filter((p) => !unresolved(p)).map((p) => sizeOf(p, 0)));
      const reach = (p) => gap(p, bar.y, line) < 0.65 * s;
      const top = withScripts(near.filter((p) => centre(p, line) > bar.y && reach(p)), near, bar.y, true, line);
      const bottom = withScripts(near.filter((p) => centre(p, line) < bar.y && reach(p)), near, bar.y, false, line);
      if (!top.length || !bottom.length) continue;
      if ([...top, ...bottom].some((p) => unresolved(p) || p.x < bar.x1 - 3 || right(p) > bar.x2 + 3)) continue;
      const beyond = (p) => barsOf(line).some((b) => b.piece !== bar.piece && b.x1 < right(p) && b.x2 > p.x && (b.y - bar.y) * (centre(p, line) - b.y) > 0);
      if (near.some((p) => !top.includes(p) && !bottom.includes(p) && !unresolved(p) && !beyond(p) && gap(p, bar.y, line) < 1.2 * s)) continue;
      const [over, under] = [context.read(sub(line, top)), context.read(sub(line, bottom))];
      const [n, d] = [toMath2(over.tex), toMath2(under.tex)];
      if (!n || !d) continue;
      const size = baseSize([...top, ...bottom], s);
      const failed = !over.ok ? over.reason : !under.ok ? under.reason : null;
      const made = {
        kind: "math",
        tex: `\\${size >= 9.4 ? "dfrac" : "frac"}{${n}}{${d}}`,
        x: bar.x1,
        width: bar.x2 - bar.x1,
        // A bar sits on the maths axis, 0.3 of the size above the baseline.
        y: bar.y - 0.3 * size,
        size,
        top: Math.max(...top.map((p) => extent(p, size).top)),
        bottom: Math.min(...bottom.map((p) => extent(p, size).bottom)),
        ...failed === "unknown-symbol" || failed === "unknown-shape" || failed === "ambiguous-layout" ? { failed: { reason: failed } } : null
      };
      return rebuilt(context.read(without(line, [bar.piece, ...top, ...bottom], [made])));
    }
    return null;
  }
};
function withScripts(group, near, y, above, line) {
  const out = [...group];
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of near) {
      if (out.includes(p) || p.kind === "rule" || centre(p, line) > y !== above) continue;
      const e = extent(p, line.size);
      const touches = out.some((q) => {
        const f = extent(q, line.size);
        return e.top > f.bottom && e.bottom < f.top && (p.x - right(q) < 0.4 * line.size && q.x - right(p) < 0.4 * line.size);
      });
      if (touches) {
        out.push(p);
        grew = true;
      }
    }
  }
  return out;
}
var centre = (p, line) => {
  const e = extent(p, line.size);
  return (e.top + e.bottom) / 2;
};
var gap = (p, y, line) => {
  const e = extent(p, line.size);
  return Math.max(0, e.bottom - y, y - e.top);
};
var rebuilt = (reading) => reading.ok ? { ...reading, rebuilt: true } : reading;

// src/extract/equations/brackets.ts
var Brackets = class {
  name = "brackets";
  read(line, context) {
    const whole = mergeParts(line);
    if (whole !== line) return this.read(whole, context);
    const all = line.pieces.filter((p) => p.kind === "glyph" && (isRoundBracket(p) || ASSEMBLED.has(p)));
    if (!all.length) return null;
    const sides = sidesOf(line, all) ?? tallPairs(line, all);
    if (!sides) return null;
    const short = all.filter((g) => g.height < 1.6 * line.size);
    if (short.length) {
      const put = short.map((g) => ({
        kind: "text",
        text: sides.get(g),
        x: g.x,
        y: baselineNear(line, g),
        width: g.width,
        size: line.size,
        bold: false,
        italic: false,
        underline: false
      }));
      return rebuilt(context.read(without(line, short, put)));
    }
    for (const open of all.filter((g) => sides.get(g) === "(")) {
      const close = partner(line, all, sides, open);
      if (!close) continue;
      const inside2 = line.pieces.filter(
        (p) => p !== open && p !== close && middle(p) > right(open) && middle(p) < close.x && within(p, open, line.size)
      );
      if (!inside2.length || inside2.some(unresolved)) continue;
      const between = line.pieces.filter((p) => p !== open && p !== close && middle(p) > right(open) && middle(p) < close.x);
      const overlaps2 = (p) => extent(p, line.size).bottom < open.y + open.height && extent(p, line.size).top > open.y;
      if (between.some((p) => overlaps2(p) && !inside2.includes(p))) continue;
      const size = baseSize(inside2, line.size);
      const tex = matrix(inside2, size, context) ?? single(inside2, context);
      if (!tex) continue;
      const failed = inside2.some((p) => isComposite(p) && p.failed);
      const level = line.pieces.filter((p) => p.kind === "text" && !inside2.includes(p) && (right(p) <= open.x + 1 || p.x >= right(close) - 1) && Math.abs(p.y - tex.y) < 0.5 * size).sort((a, b) => Math.abs(a.y - tex.y) - Math.abs(b.y - tex.y))[0];
      const made = {
        kind: "math",
        tex: tex.tex,
        x: open.x,
        width: right(close) - open.x,
        y: level?.y ?? tex.y,
        size,
        top: Math.max(open.y + open.height, close.y + close.height),
        bottom: Math.min(open.y, close.y),
        ...failed || !tex.ok ? { failed: { reason: "unknown-symbol" } } : null
      };
      return rebuilt(context.read(without(line, [open, close, ...inside2], [made])));
    }
    return null;
  }
};
var ASSEMBLED = /* @__PURE__ */ new WeakSet();
function mergeParts(line) {
  const parts = line.pieces.filter((p) => p.kind === "glyph" && (isRoundBracket(p) || isRoundBracketPiece(p) || ASSEMBLED.has(p)));
  for (const a of parts) {
    const group = parts.filter((b) => b === a || Math.abs(b.x - a.x) < 0.3 && b.y <= a.y + a.height + 1 && b.y + b.height >= a.y - 1);
    if (group.length < 2) continue;
    const bottom = Math.min(...group.map((g) => g.y));
    const top = Math.max(...group.map((g) => g.y + g.height));
    const made = { ...a, y: bottom, height: top - bottom, width: Math.max(...group.map((g) => g.width)) };
    ASSEMBLED.add(made);
    return without(line, group, [made]);
  }
  return line;
}
function sequence(line, glyphs) {
  const bottom = Math.min(...glyphs.map((g) => g.y));
  const top = Math.max(...glyphs.map((g) => g.y + g.height));
  const marks = glyphs.map((g) => ({ x: middle(g), glyph: g, side: null }));
  for (const p of line.pieces) {
    if (p.kind !== "text" && p.kind !== "math") continue;
    const e = extent(p, line.size);
    if (e.top < bottom || e.bottom > top) continue;
    const text = p.kind === "text" ? p.text : p.tex.replace(/\\[a-zA-Z]+/g, (m) => " ".repeat(m.length));
    const at = [...text].flatMap((ch, i) => ch === "(" || ch === ")" ? [{ ch, i }] : []);
    if (!at.length) continue;
    if (p.kind === "math" && glyphs.some((g) => middle(g) > p.x && middle(g) < right(p))) return null;
    for (const { ch, i } of at) marks.push({ x: p.x + p.width * (i + 0.5) / text.length, glyph: null, side: ch });
  }
  return marks.sort((a, b) => a.x - b.x);
}
function sidesOf(line, glyphs) {
  if (glyphs.length > 10) return null;
  const marks = sequence(line, glyphs);
  if (!marks) return null;
  const unknown = marks.filter((m) => m.glyph);
  let found = null;
  for (let bits = 0; bits < 1 << unknown.length; bits++) {
    const side = (m) => m.glyph ? bits >> unknown.indexOf(m) & 1 ? ")" : "(" : m.side;
    let depth = 0;
    let ok = true;
    for (const m of marks) {
      depth += side(m) === "(" ? 1 : -1;
      if (depth < 0) ok = false;
    }
    if (!ok || depth !== 0) continue;
    if (found) return null;
    found = new Map(unknown.map((m) => [m.glyph, side(m)]));
  }
  return found;
}
function tallPairs(line, glyphs) {
  if (glyphs.some((g) => g.height < 1.6 * line.size)) return null;
  const marks = sequence(line, glyphs);
  if (!marks || marks.some((m) => !m.glyph)) return null;
  const out = /* @__PURE__ */ new Map();
  const left = [...glyphs];
  while (left.length) {
    const g = left[0];
    const span = left.filter((h) => Math.abs(h.y - g.y) < 1 && Math.abs(h.height - g.height) < 1).sort((a, b) => a.x - b.x);
    if (span.length % 2) return null;
    for (let i = 0; i < span.length; i += 2) {
      const [a, b] = [span[i], span[i + 1]];
      const holds = (x1, x2) => line.pieces.some((p) => !glyphs.includes(p) && middle(p) > x1 && middle(p) < x2 && p.y < g.y + g.height && p.y > g.y);
      if (!holds(right(a), b.x)) return null;
      if (i + 2 < span.length && !holds(right(b), span[i + 2].x)) return null;
      out.set(a, "(");
      out.set(b, ")");
    }
    for (const h of span) left.splice(left.indexOf(h), 1);
  }
  return out;
}
function partner(line, glyphs, sides, open) {
  const marks = sequence(line, glyphs) ?? [];
  const from = marks.findIndex((m) => m.glyph === open);
  let depth = 0;
  for (const m of marks.slice(from)) {
    depth += (m.glyph ? sides.get(m.glyph) : m.side) === "(" ? 1 : -1;
    if (depth === 0) return m.glyph;
  }
  return null;
}
function baselineNear(line, g) {
  const level = line.pieces.filter((p) => p.kind === "text" && p.size >= 0.86 * line.size || p.kind === "math" && !isComposite(p)).filter((p) => p.y >= g.y - 1 && p.y <= g.y + 0.5 * g.height).sort((a, b) => Math.abs(middle(a) - middle(g)) - Math.abs(middle(b) - middle(g)));
  return level[0]?.y ?? g.y + 0.22 * line.size;
}
function within(p, bracket, size) {
  const e = extent(p, size);
  return e.bottom >= bracket.y - 1 && e.top <= bracket.y + bracket.height + 1;
}
function single(inside2, context) {
  const rows = rowsOf(inside2, baseSize(inside2, 11));
  if (rows.length !== 1) return null;
  const reading = context.read({ pieces: inside2, size: baseSize(inside2, 11) });
  const tex = toMath2(reading.tex);
  return tex ? { tex: `\\left(${tex}\\right)`, y: rows[0].y, ok: reading.ok } : null;
}
function rowsOf(pieces, size) {
  const rows = [];
  const full = pieces.filter((p) => !(isText(p) && p.size < 0.86 * size));
  for (const p of [...full].sort((a, b) => b.y - a.y)) {
    const row = rows.find((r) => Math.abs(r.y - p.y) < 0.5 * size);
    if (row) row.pieces.push(p);
    else rows.push({ y: p.y, pieces: [p] });
  }
  for (const p of pieces.filter((q) => !full.includes(q))) {
    const row = [...rows].sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y))[0];
    row?.pieces.push(p);
  }
  return rows;
}
function matrix(inside2, size, context) {
  const rows = rowsOf(inside2, size);
  if (rows.length < 2) return null;
  const entries = rows.map((r) => {
    const sorted = [...r.pieces].sort((a, b) => a.x - b.x);
    const out = [];
    for (const p of sorted) {
      const last = out[out.length - 1];
      if (last && p.x - Math.max(...last.map(right)) < size) last.push(p);
      else out.push([p]);
    }
    return out;
  });
  const cols = entries[0].length;
  if (entries.some((e) => e.length !== cols)) return null;
  const mid = (e) => (Math.min(...e.map((p) => p.x)) + Math.max(...e.map(right))) / 2;
  for (let c = 0; c < cols; c++) {
    const xs = entries.map((e) => mid(e[c]));
    const spread = Math.max(...xs) - Math.min(...xs);
    if (c + 1 < cols && spread > 0.5 * (mid(entries[0][c + 1]) - mid(entries[0][c]))) return null;
  }
  let ok = true;
  const body = entries.map(
    (row) => row.map((e) => {
      const reading = context.read({ pieces: e, size });
      ok &&= reading.ok;
      return toMath2(reading.tex);
    })
  );
  if (body.some((row) => row.some((t) => t === null))) return null;
  if (body.some((row) => row.some((t) => /[\d.]\s+-?\s*\d/.test(t)))) return null;
  const tex = `\\begin{pmatrix}${body.map((row) => row.join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
  return { tex, y: rows.reduce((n, r) => n + r.y, 0) / rows.length, ok };
}

// src/extract/encodings.ts
var run = (from, chars) => [...chars].map((ch, i) => [from + i, ch]);
var SYMBOL2 = new Map([
  ...run(32, " !\u2200#\u2203%&\u220B()\u2217+,\u2212./0123456789:;<=>?\u2245\u0391\u0392\u03A7\u0394\u0395\u03A6\u0393\u0397\u0399\u03D1\u039A\u039B\u039C\u039D\u039F\u03A0\u0398\u03A1\u03A3\u03A4\u03A5\u03C2\u03A9\u039E\u03A8\u0396[\u2234]\u22A5_"),
  ...run(97, "\u03B1\u03B2\u03C7\u03B4\u03B5\u03C6\u03B3\u03B7\u03B9\u03D5\u03BA\u03BB\u03BC\u03BD\u03BF\u03C0\u03B8\u03C1\u03C3\u03C4\u03C5\u03D6\u03C9\u03BE\u03C8\u03B6{|}\u223C"),
  ...run(161, "\u03D2\u2032\u2264\u2044\u221E\u0192\u2663\u2666\u2665\u2660\u2194\u2190\u2191\u2192\u2193\xB0\xB1\u2033\u2265\xD7\u221D\u2202\u2022\xF7\u2260\u2261\u2248\u2026\u23D0\u23AF\u21B5\u2135\u2111\u211C\u2118\u2297\u2295\u2205\u2229\u222A\u2283\u2287\u2284\u2282\u2286\u2208\u2209\u2220\u2207\xAE\xA9\u2122\u220F\u221A\u22C5\xAC\u2227\u2228\u21D4\u21D0\u21D1\u21D2\u21D3\u25CA\u3008\xAE\xA9\u2122\u2211"),
  ...run(230, "\u239B\u239C\u239D\u23A1\u23A2\u23A3\u23A7\u23A8\u23A9\u23AA"),
  ...run(241, "\u3009\u222B\u2320\u23AE\u2321\u239E\u239F\u23A0\u23A4\u23A5\u23A6\u23AB\u23AC\u23AD")
]);
var DINGBATS = /* @__PURE__ */ new Map([
  [51, "\u2713"],
  [52, "\u2714"],
  [53, "\u2715"],
  [54, "\u2716"],
  [55, "\u2717"],
  [56, "\u2718"],
  [72, "\u2605"],
  [108, "\u25CF"],
  [109, "\u274D"],
  [110, "\u25A0"],
  [111, "\u274F"]
]);
var LATIN = /* @__PURE__ */ new Map([
  [133, "\u2026"],
  [145, "\u2018"],
  [146, "\u2019"],
  [147, "\u201C"],
  [148, "\u201D"],
  [149, "\u2022"],
  [150, "\u2013"],
  [151, "\u2014"],
  [176, "\xB0"],
  [177, "\xB1"],
  [181, "\u03BC"],
  [183, "\xB7"],
  [215, "\xD7"],
  [247, "\xF7"],
  [163, "\xA3"]
]);
function decode(code, family) {
  if (family === "symbol") return SYMBOL2.get(code) ?? null;
  if (family === "dingbats") return DINGBATS.get(code) ?? null;
  if (code >= 32 && code < 127) return String.fromCharCode(code);
  return LATIN.get(code) ?? null;
}
var CHARACTERS = {
  textendash: "\u2013",
  textemdash: "\u2014",
  textminus: "\u2212",
  texttimes: "\xD7",
  textdiv: "\xF7",
  textpm: "\xB1",
  textdegree: "\xB0",
  textbullet: "\u2022",
  textperiodcentered: "\xB7",
  pounds: "\xA3",
  textsterling: "\xA3",
  ldots: "\u2026",
  dots: "\u2026",
  textellipsis: "\u2026",
  textquoteright: "\u2019",
  textquoteleft: "\u2018",
  textquotedblleft: "\u201C",
  textquotedblright: "\u201D",
  textquotedbl: '"',
  textmu: "\u03BC",
  textohm: "\u03A9",
  textasciitilde: "~",
  textbackslash: "\\",
  textless: "<",
  textgreater: ">",
  textbar: "|",
  textunderscore: "_",
  textdollar: "$",
  S: "\xA7",
  copyright: "\xA9",
  textcelsius: "\xB0C",
  ss: "\xDF",
  o: "\xF8",
  O: "\xD8",
  l: "\u0142",
  ae: "\xE6",
  aa: "\xE5"
};
var MATH_CHARACTERS = {
  times: "\xD7",
  div: "\xF7",
  pm: "\xB1",
  le: "\u2264",
  leq: "\u2264",
  ge: "\u2265",
  geq: "\u2265",
  ne: "\u2260",
  neq: "\u2260",
  rightarrow: "\u2192",
  to: "\u2192",
  rightleftharpoons: "\u21CC",
  infty: "\u221E",
  degree: "\xB0",
  circ: "\xB0",
  cdot: "\xB7",
  bullet: "\u2022",
  Omega: "\u03A9",
  Delta: "\u0394",
  pi: "\u03C0",
  mu: "\u03BC",
  theta: "\u03B8",
  lambda: "\u03BB",
  alpha: "\u03B1",
  beta: "\u03B2",
  gamma: "\u03B3",
  rho: "\u03C1",
  approx: "\u2248",
  ldots: "\u2026"
};
var ACCENTS = { '"': "\u0308", "'": "\u0301", "`": "\u0300", "^": "\u0302", "~": "\u0303", c: "\u0327" };
function accented(accent, letter) {
  const mark = ACCENTS[accent];
  return mark ? (letter + mark).normalize("NFC") : null;
}

// src/extract/macros.ts
function dropComments(src) {
  return src.replace(/(?<!\\)((?:\\\\)*)%[^\n]*(?:\n[ \t]*|$)/g, "$1");
}
var DEFINITION = /\\(?:(newcommand|renewcommand|providecommand|DeclareRobustCommand)\*?|([gex]?def)|(let))(?![a-zA-Z@])/g;
var NAME = /\\([a-zA-Z@]+|[^a-zA-Z])/y;
var MacroTable = class _MacroTable {
  table = /* @__PURE__ */ new Map();
  /** Lengths the preamble sets, e.g. the paper's word space. In bp. */
  lengths = /* @__PURE__ */ new Map();
  static fromPreamble(preamble) {
    const table = new _MacroTable();
    table.scan(dropComments(preamble));
    return table;
  }
  has(name) {
    return this.table.has(name.replace(/^\\/, ""));
  }
  get(name) {
    return this.table.get(name.replace(/^\\/, ""));
  }
  /**
   * Conditionals are not evaluated: a definition inside one is taken, and the
   * last one wins, which is what a preamble that overrides itself means.
   */
  scan(src) {
    for (const m of src.matchAll(/\\([a-zA-Z@]+)=(-?[\d.]+)bp(?![a-zA-Z])/g)) {
      if (!this.lengths.has(m[1])) this.lengths.set(m[1], Number(m[2]));
    }
    DEFINITION.lastIndex = 0;
    for (let m = DEFINITION.exec(src); m; m = DEFINITION.exec(src)) {
      let at = m.index + m[0].length;
      const read = m[1] ? this.command(src, at) : m[2] ? this.def(src, at) : this.alias(src, at);
      if (read) at = read;
      DEFINITION.lastIndex = at;
    }
  }
  name(src, from) {
    let i = from;
    while (/\s/.test(src[i] ?? "")) i++;
    const braced = src[i] === "{";
    if (braced) i++;
    while (/\s/.test(src[i] ?? "")) i++;
    NAME.lastIndex = i;
    const m = NAME.exec(src);
    if (!m) return null;
    i += m[0].length;
    if (braced) {
      while (/\s/.test(src[i] ?? "")) i++;
      if (src[i] !== "}") return null;
      i++;
    }
    return { name: m[1], end: i };
  }
  /** \newcommand{\name}[2][default]{body} */
  command(src, from) {
    const named = this.name(src, from);
    if (!named) return null;
    let i = named.end;
    const skip = () => {
      while (/\s/.test(src[i] ?? "")) i++;
    };
    skip();
    const count = readOptional(src, i);
    if (count) i = count.end;
    skip();
    const first = count ? readOptional(src, i) : null;
    if (first) i = first.end;
    skip();
    const body = readGroup(src, i);
    if (!body) return null;
    this.table.set(named.name, {
      args: count ? Number(count.value) || 0 : 0,
      optional: first ? first.value : null,
      body: body.value
    });
    return body.end;
  }
  /** \def\name#1/#2\relax{body} */
  def(src, from) {
    const named = this.name(src, from);
    if (!named) return null;
    const open = src.indexOf("{", named.end);
    if (open === -1) return null;
    const body = readGroup(src, open);
    if (!body) return null;
    const pattern = src.slice(named.end, open).split(/#\d/);
    const macro = { args: pattern.length - 1, optional: null, body: body.value };
    if (pattern.some((p) => p !== "")) macro.delimiters = pattern;
    this.table.set(named.name, macro);
    return body.end;
  }
  /** \let\a=\b copies b's definition as it stands now. */
  alias(src, from) {
    const left = this.name(src, from);
    if (!left) return null;
    let i = left.end;
    while (/[\s=]/.test(src[i] ?? "")) i++;
    const right2 = this.name(src, i);
    if (!right2) return i;
    const known = this.table.get(right2.name);
    if (known) this.table.set(left.name, known);
    return right2.end;
  }
};

// src/extract/metrics.ts
var WIDTHS = {
  helvetica: "278 278 355 556 556 889 667 222 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 222 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584",
  helveticaBold: "278 333 474 556 556 889 722 278 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 278 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584",
  times: "250 333 408 500 500 833 778 333 333 333 500 564 250 333 250 278 500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444 921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722 556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500 333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500 500 500 333 389 278 500 500 722 500 500 444 480 200 480 541",
  timesBold: "250 333 555 500 500 1000 833 333 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778 611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500 333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500 556 556 444 389 333 556 500 722 500 500 444 394 220 394 520",
  timesItalic: "250 333 420 500 500 833 778 333 333 333 500 675 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 675 675 675 500 920 611 611 667 722 611 611 722 722 333 444 667 556 833 667 722 611 722 611 500 556 722 611 833 611 556 556 389 278 389 422 500 333 500 500 444 500 444 278 500 500 278 278 444 278 722 500 500 500 500 389 389 278 500 444 667 444 444 389 400 275 400 541",
  timesBoldItalic: "250 389 555 500 500 833 778 333 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 832 667 667 667 722 667 667 722 778 389 500 667 611 889 722 722 611 722 667 556 611 722 667 889 667 611 611 333 278 333 570 500 333 500 500 444 500 444 333 500 556 278 278 500 278 778 556 500 500 500 389 389 278 556 444 667 500 444 389 348 220 348 570"
};
var TABLES = Object.fromEntries(
  Object.entries(WIDTHS).map(([name, list2]) => [name, list2.split(" ").map(Number)])
);
var OTHER = {
  "\u2013": 530,
  "\u2014": 1e3,
  "\u2212": 564,
  "\xD7": 574,
  "\xF7": 574,
  "\xB1": 574,
  "\xB0": 400,
  "\u2022": 350,
  "\u2026": 1e3,
  "\xB7": 264,
  "\xA3": 520,
  "\u2019": 270,
  "\u2018": 270,
  "\u201C": 400,
  "\u201D": 400,
  "\u2032": 247,
  "\u2033": 411,
  "\u03A9": 768,
  "\u03C0": 549,
  "\u03BC": 576,
  "\u03B8": 521,
  "\u03B1": 631,
  "\u03B2": 549,
  "\u03BB": 549,
  "\u0394": 612,
  "\u03C1": 549,
  "\u03C6": 521,
  "\u03C3": 603,
  "\u2192": 987,
  "\u21CC": 987,
  "\u2264": 549,
  "\u2265": 549,
  "\u2260": 549,
  "\u2248": 549,
  "\u221E": 713,
  "\u2229": 768,
  "\u222A": 768,
  "\u2208": 713,
  "\u222B": 274,
  "\u03A3": 592,
  "\u221A": 549,
  "\u2713": 755
};
function advance(ch, size, family, bold, italic) {
  const code = ch.charCodeAt(0);
  const other = OTHER[ch];
  if (code < 32 || code > 126) return (other ?? 600) * size / 1e3;
  const name = family === "times" ? `times${bold ? "Bold" : ""}${italic ? "Italic" : ""}` : bold ? "helveticaBold" : "helvetica";
  return TABLES[name][code - 32] * size / 1e3;
}

// src/extract/typesetter.ts
var PAGE = { width: 595.276, height: 841.89 };
var WORD_GAP = 0.118;
var TO_BP2 = {
  bp: 1,
  pt: 72 / 72.27,
  in: 72,
  mm: 72 / 25.4,
  cm: 72 / 2.54,
  pc: 12 * (72 / 72.27),
  sp: 0,
  dd: 1.07
};
var Typesetter = class {
  constructor(macros) {
    this.macros = macros;
    const serif = /rmdefault/.test(macros.get("familydefault")?.body ?? "");
    const size = /\{([\d.]+)bp\}\s*\{([\d.]+)bp\}/.exec(macros.get("normalsize")?.body ?? "");
    this.base = {
      family: serif ? "times" : "helvetica",
      foreign: false,
      size: size ? Number(size[1]) : 11,
      bold: false,
      italic: false,
      underline: false
    };
    this.leading = size ? Number(size[2]) : 13;
    this.wordSpace = macros.lengths.get("spaceskip") ?? advance(" ", this.base.size, this.base.family, false, false);
  }
  macros;
  base;
  wordSpace;
  /** Baseline to baseline, for text that runs over a line break. */
  leading;
  get size() {
    return this.base.size;
  }
  /** Text that runs over a line break comes out one leading lower per line. */
  line(tex) {
    const setter = new Setter(this, { ...this.base });
    setter.run(dropComments(tex));
    const { pieces } = setter.finish();
    return { pieces, size: commonSize(pieces) ?? this.base.size, ...setter.problems.length ? { problems: setter.problems } : null };
  }
};
function commonSize(pieces) {
  const weight = /* @__PURE__ */ new Map();
  for (const p of pieces) {
    if (p.kind === "text") weight.set(p.size, (weight.get(p.size) ?? 0) + p.text.trim().length);
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
var NOTHING = /* @__PURE__ */ new Set([
  "relax",
  "nobreak",
  "allowbreak",
  "strut",
  "null",
  "leavevmode",
  "ignorespaces",
  "noindent",
  "protect",
  "selectfont",
  "makeatletter",
  "makeatother",
  "pdfsave",
  "pdfrestore",
  "par",
  "centering",
  "raggedright",
  "smash",
  "normalsize",
  "small",
  "footnotesize",
  "noexpand",
  "expandafter",
  "global",
  "ignorespacesafterend",
  "boldmath",
  "unboldmath",
  "displaystyle",
  "textstyle",
  "frenchspacing",
  "sloppy",
  "break",
  "nolinebreak"
]);
var SWALLOW = {
  vadjust: 1,
  pdfsetmatrix: 1,
  color: 1,
  vspace: 1,
  vphantom: 1,
  label: 1,
  detokenize: 1,
  setlength: 2,
  addtolength: 2,
  marks: 1,
  hypertarget: 2,
  fontencoding: 1,
  fontseries: 1,
  fontshape: 1,
  pagecolor: 1,
  smallskip: 0
};
var WRAPPER = {
  mbox: 1,
  textcolor: 2,
  textls: 1,
  colorbox: 2,
  fbox: 1,
  textnormal: 1,
  textup: 1,
  ensurefont: 1,
  resizebox: 3,
  scalebox: 2,
  textlnum: 1,
  centerline: 1
};
var FAMILIES = {
  psy: "symbol",
  pzd: "dingbats",
  ptm: "times",
  utm: "times",
  pbk: "times",
  pnc: "times",
  ppl: "times",
  cmr: "times",
  phv: "helvetica",
  uhv: "helvetica",
  pag: "helvetica"
};
var Setter = class _Setter {
  constructor(setting, font) {
    this.setting = setting;
    this.font = font;
  }
  setting;
  font;
  x = 0;
  y = 0;
  lineStart = 0;
  pieces = [];
  glue = [];
  input = "";
  at = 0;
  /** \setbox0=..., \dimen0=...; shared by the boxes inside a line. */
  boxes = /* @__PURE__ */ new Map();
  dimens = /* @__PURE__ */ new Map();
  fonts = /* @__PURE__ */ new Map();
  steps = { left: 4e3 };
  problems = [];
  finish() {
    return { pieces: this.pieces.filter((p) => p.kind !== "text" || p.text.trim() !== ""), width: this.x, glue: this.glue };
  }
  run(tex) {
    const outer = { input: this.input, at: this.at };
    this.input = tex;
    this.at = 0;
    while (this.at < this.input.length) this.step();
    this.input = outer.input;
    this.at = outer.at;
  }
  /** A group: whatever it changes about the font ends with it. */
  group(tex, change = {}, dy = 0) {
    const font = this.font;
    const y = this.y;
    this.font = { ...font, ...change };
    this.y += dy;
    this.run(tex);
    this.font = font;
    this.y = y;
  }
  box(tex, change = {}) {
    const inner = new _Setter(this.setting, { ...this.font, ...change });
    inner.boxes = this.boxes;
    inner.dimens = this.dimens;
    inner.fonts = this.fonts;
    inner.steps = this.steps;
    inner.problems = this.problems;
    inner.run(tex);
    return inner.finish();
  }
  /** Stretch a box to a width, the strongest glue taking up the difference. */
  stretch(box, width, pos = "") {
    if (box.pieces.length === 1 && box.pieces[0].kind === "math" && width > 0 && (pos === "c" || pos === "")) {
      return { pieces: [{ ...box.pieces[0], x: 0, width }], width, glue: [] };
    }
    const glue = [...box.glue];
    if (pos === "r" || pos === "c") glue.push({ index: 0, order: 1 });
    if (pos === "l" || pos === "c") glue.push({ index: box.pieces.length, order: 1 });
    const order = Math.max(0, ...glue.map((g) => g.order));
    const active = glue.filter((g) => g.order === order);
    const share = active.length ? (width - box.width) / active.length : 0;
    const pieces = box.pieces.map((p, i) => moved(p, share * active.filter((g) => g.index <= i).length, 0));
    return { pieces, width, glue: [] };
  }
  place(box, dx = 0) {
    for (const p of box.pieces) this.add(moved(p, this.x + dx, this.y));
  }
  // ---- input -----------------------------------------------------------
  skipSpaces() {
    while (/\s/.test(this.input[this.at] ?? "")) this.at++;
  }
  /** The next argument: a group, a command, or one character. */
  argument() {
    this.skipSpaces();
    const ch = this.input[this.at];
    if (ch === void 0) return "";
    if (ch === "{") {
      const g = readGroup(this.input, this.at);
      if (g) {
        this.at = g.end;
        return g.value;
      }
    }
    const m = ch === "\\" ? /^\\(?:[a-zA-Z@]+|[\s\S])/.exec(this.input.slice(this.at, this.at + 40)) : null;
    const token = m ? m[0] : ch;
    this.at += token.length;
    return token;
  }
  optional() {
    const from = this.at;
    this.skipSpaces();
    const opt = readOptional(this.input, this.at);
    if (!opt) {
      this.at = from;
      return null;
    }
    this.at = opt.end;
    return opt.value;
  }
  take(re) {
    const sticky = new RegExp(re.source, "y");
    sticky.lastIndex = this.at;
    const m = sticky.exec(this.input);
    if (m) this.at += m[0].length;
    return m;
  }
  /** A dimension, with \dimexpr arithmetic, off the input. In bp. */
  dimension() {
    this.take(/\s*=?\s*/);
    if (this.take(/\\ifdim(?![a-zA-Z@])/)) this.conditional("ifdim");
    if (this.take(/\\dimexpr(?![a-zA-Z@])/)) {
      const v = this.sum();
      this.take(/\s*\\relax(?![a-zA-Z@])[ \t]*\n?[ \t]*/);
      return v;
    }
    return this.factor();
  }
  sum() {
    let v = this.product();
    for (; ; ) {
      const op = this.take(/\s*([+-])/);
      if (!op) return v;
      v += (op[1] === "-" ? -1 : 1) * this.product();
    }
  }
  product() {
    let v = this.factor();
    for (; ; ) {
      const op = this.take(/\s*([*/])\s*(-?[\d.]+)/);
      if (!op) return v;
      v = op[1] === "*" ? v * Number(op[2]) : v / Number(op[2]);
    }
  }
  factor() {
    let sign = 1;
    for (let m = this.take(/\s*([+-])/); m; m = this.take(/\s*([+-])/)) if (m[1] === "-") sign = -sign;
    if (this.take(/\s*\(/)) {
      const v = this.sum();
      this.take(/\s*\)/);
      return sign * v;
    }
    const n = this.take(/\s*(\d*\.?\d+|\d+\.)/);
    const factor = n ? Number(n[1]) : 1;
    const unit = this.take(/\s*(?:true)?(bp|pt|in|mm|cm|pc|sp|dd|em|ex|mu|fil+|px)\s?/);
    if (unit) return sign * factor * this.unit(unit[1]);
    const reg = this.take(/\s*\\([a-zA-Z@]+)\s?(\d*)/);
    if (reg) return sign * factor * this.register(reg[1], reg[2]);
    return n ? sign * factor : 0;
  }
  unit(name) {
    if (name === "em") return this.font.size;
    if (name === "ex") return this.font.size * 0.5;
    if (name === "mu") return this.font.size / 18;
    return TO_BP2[name] ?? 0;
  }
  register(name, index) {
    if (name === "wd") return this.boxes.get(index)?.width ?? 0;
    if (name === "dimen") return this.dimens.get(index) ?? 0;
    return this.dimens.get(name) ?? this.setting.macros.lengths.get(name) ?? 0;
  }
  measure(tex) {
    const outer = { input: this.input, at: this.at };
    this.input = tex;
    this.at = 0;
    this.take(/\s*\\dimexpr(?![a-zA-Z@])/);
    const v = this.sum();
    this.input = outer.input;
    this.at = outer.at;
    return v;
  }
  // ---- printing --------------------------------------------------------
  print(ch) {
    const f = this.font;
    const width = ch === " " && f.size >= this.setting.size * 0.8 ? this.setting.wordSpace : advance(ch, f.size, f.family, f.bold, f.italic);
    this.add({
      kind: "text",
      text: ch,
      x: this.x,
      y: this.y,
      width,
      size: f.size,
      bold: f.bold,
      italic: f.italic,
      underline: f.underline,
      ...f.foreign ? { serif: true } : null
    });
    this.x += width;
  }
  code(code) {
    const ch = decode(code, this.font.family);
    if (ch) this.print(ch);
    else this.problems.push({ reason: "unknown-symbol", detail: `character ${code.toString(16)} of ${this.font.family}` });
  }
  /** Letters that run on are one piece; a gap or a new style starts another. */
  add(p) {
    const last = this.pieces[this.pieces.length - 1];
    if (p.kind === "text" && last?.kind === "text" && sameStyle(p, last) && Math.abs(p.y - last.y) < 0.01) {
      const gap2 = p.x - (last.x + last.width);
      if (Math.abs(gap2) < WORD_GAP * p.size) {
        last.text += p.text;
        last.width = p.x + p.width - last.x;
        return;
      }
    }
    this.pieces.push({ ...p });
  }
  space() {
    const last = this.pieces[this.pieces.length - 1];
    if (last?.kind === "text" && last.text.endsWith(" ") && last.y === this.y) return;
    if (this.x === this.lineStart && !this.pieces.some((p) => p.y === this.y)) return;
    this.print(" ");
  }
  breakLine() {
    this.x = this.lineStart;
    this.y -= this.setting.leading;
  }
  math(tex) {
    const t = tex.trim();
    if (!t) return;
    const width = mathWidth(t, this.font.size);
    this.add({ kind: "math", tex: t, x: this.x, y: this.y, width, size: this.font.size });
    this.x += width;
  }
  // ---- one token -------------------------------------------------------
  step() {
    const ch = this.input[this.at];
    if (ch === "\\") return this.command();
    if (ch === "{") {
      const g = readGroup(this.input, this.at);
      if (g) {
        this.at = g.end;
        return this.group(g.value);
      }
      this.at++;
      return;
    }
    if (ch === "}") {
      this.at++;
      return;
    }
    if (ch === "$") return this.typedMath();
    this.at++;
    if (/\s/.test(ch)) {
      this.skipSpaces();
      return this.space();
    }
    if (ch === "~") return this.print(" ");
    const two = this.input.slice(this.at - 1, this.at + 2);
    if (two === "---") {
      this.at += 2;
      return this.print("\u2014");
    }
    if (two.startsWith("--")) {
      this.at++;
      return this.print("\u2013");
    }
    if (ch === "`") return this.print("\u2018");
    if (ch === "'") return this.print("\u2019");
    if (this.font.family === "symbol" || this.font.family === "dingbats") return this.code(ch.charCodeAt(0));
    this.print(ch);
  }
  typedMath() {
    const display = this.input[this.at + 1] === "$";
    const open = this.at + (display ? 2 : 1);
    let i = open;
    while (i < this.input.length && this.input[i] !== "$") i += this.input[i] === "\\" ? 2 : 1;
    this.at = Math.min(this.input.length, i + (display ? 2 : 1));
    this.math(this.input.slice(open, i));
  }
  command() {
    const word = this.take(/\\([a-zA-Z@]+)/);
    if (!word) {
      this.at++;
      const sign = this.input[this.at] ?? "";
      this.at++;
      return this.sign(sign);
    }
    let name = word[1];
    if (name.includes("@") && !this.setting.macros.has(name) && !PRIMITIVE_AT.has(name)) {
      const short = name.slice(0, name.indexOf("@"));
      this.at -= name.length - short.length;
      name = short;
    }
    this.take(/[ \t]*\n?[ \t]*/);
    this.named(name);
  }
  sign(sign) {
    if (sign === "(" || sign === "[") {
      const close = this.input.indexOf(sign === "(" ? "\\)" : "\\]", this.at);
      const end = close === -1 ? this.input.length : close;
      this.math(this.input.slice(this.at, end));
      this.at = end + 2;
    } else if (sign === ",") this.x += this.setting.size * 0.139;
    else if (sign === ";" || sign === ":") this.x += this.font.size * 0.25;
    else if (sign === "!") this.x -= this.font.size * 0.16;
    else if (sign === "\\") {
      this.optional();
      this.breakLine();
    } else if (sign === "_" && this.y !== 0) {
      const y = this.y;
      this.y -= this.font.size * 0.41;
      this.print("\u2212");
      this.y = y;
    } else if (/[%&#_${}]/.test(sign)) this.print(sign);
    else if (/\s/.test(sign)) this.print(" ");
    else if (/["'`^~]/.test(sign)) {
      const letter = this.argument();
      const ch = accented(sign, letter.replace("\\i", "i"));
      if (ch) this.print(ch);
    }
  }
  named(name) {
    if (this.steps.left-- <= 0) {
      if (this.steps.left === -1) this.problems.push({ reason: "unknown-command", detail: `\\${name} expands without end` });
      this.at = this.input.length;
      return;
    }
    const f = this.font;
    if (name in STYLES) return void (this.font = { ...f, ...STYLES[name] });
    if (name in STYLED) return this.group(this.argument(), STYLED[name]);
    if (NOTHING.has(name)) return;
    switch (name) {
      case "kern":
      case "hskip":
      case "mskip":
      case "mkern": {
        this.x += this.dimension();
        while (this.take(/\s*(?:plus|minus)/)) this.dimension();
        return;
      }
      case "hspace": {
        this.take(/\*/);
        this.x += this.measure(this.argument());
        return;
      }
      case "quad":
        return void (this.x += f.size);
      case "qquad":
        return void (this.x += 2 * f.size);
      case "enspace":
        return void (this.x += f.size / 2);
      case "hfill":
      case "hfil":
      case "hss":
      case "dotfill":
      case "hrulefill":
        this.glue.push({ index: this.pieces.length, order: name === "hfill" ? 2 : 1 });
        return;
      case "unskip": {
        const last = this.pieces[this.pieces.length - 1];
        if (last?.kind === "text" && / $/.test(last.text)) {
          last.text = last.text.trimEnd();
          last.width -= this.setting.wordSpace;
          this.x -= this.setting.wordSpace;
        }
        return;
      }
      case "raisebox": {
        const dy = this.measure(this.argument());
        this.optional();
        this.optional();
        return this.group(this.argument(), {}, dy);
      }
      case "raise":
      case "lower": {
        const dy = this.dimension();
        const box = this.readBox();
        if (box) this.placeRaised(box, name === "raise" ? dy : -dy);
        return;
      }
      case "makebox":
      case "framebox": {
        const width = this.optional();
        const pos = this.optional() ?? "c";
        const box = this.box(this.argument());
        const set = width === null ? box : this.stretch(box, this.measure(width), pos);
        this.place(set);
        this.x += set.width;
        return;
      }
      case "hbox":
      case "hb@xt@":
      case "vbox":
      case "vtop": {
        const box = this.readBox(name);
        if (box) {
          this.place(box);
          this.x += box.width;
        }
        return;
      }
      case "rlap": {
        this.place(this.box(this.argument()));
        return;
      }
      case "llap": {
        const box = this.box(this.argument());
        this.place(box, -box.width);
        return;
      }
      case "clap": {
        const box = this.box(this.argument());
        this.place(box, -box.width / 2);
        return;
      }
      case "phantom":
      case "hphantom":
        this.x += this.box(this.argument()).width;
        return;
      case "setbox": {
        const m = this.take(/\s*(\\?[a-zA-Z@]+|\d+)\s*=?\s*/);
        const box = this.readBox();
        if (m && box) this.boxes.set(m[1], box);
        return;
      }
      case "box":
      case "copy":
      case "unhbox":
      case "unhcopy": {
        const m = this.take(/\s*(\\?[a-zA-Z@]+|\d+)\s?/);
        const box = m ? this.boxes.get(m[1]) : null;
        if (box) {
          this.place(box);
          this.x += box.width;
        }
        return;
      }
      case "dimen":
      case "wd":
      case "ht":
      case "dp": {
        const m = this.take(/\s*(\d+)/);
        const v = this.dimension();
        if (m && name === "dimen") this.dimens.set(m[1], v);
        return;
      }
      case "fontsize": {
        const size = this.measure(this.argument());
        this.argument();
        if (size > 0) this.font = { ...f, size };
        return;
      }
      case "fontfamily":
        return this.family(this.argument());
      case "usefont": {
        this.argument();
        this.family(this.argument());
        const series = this.argument();
        const shape = this.argument();
        this.font = { ...this.font, bold: /^b/.test(series), italic: /it|sl/.test(shape) };
        return;
      }
      case "font": {
        const m = this.take(/\\?([a-zA-Z@]+)\s*=?\s*([a-z0-9-]+)(?:\s+(?:at|scaled)\s*([\d.]+)(?:bp|pt)?)?\s?/);
        if (m) this.fonts.set(m[1], /^.(?:tm|bk|nc|pl)/.test(m[2]) ? "times" : "helvetica");
        return;
      }
      case "char": {
        const m = this.take(/\s*(?:"([0-9A-Fa-f]+)|'([0-7]+)|`\\?(.)|(\d+))\s?/);
        if (m) this.code(m[1] ? parseInt(m[1], 16) : m[2] ? parseInt(m[2], 8) : m[3] ? m[3].charCodeAt(0) : Number(m[4]));
        return;
      }
      case "rule": {
        const raise = this.optional();
        const width = this.measure(this.argument());
        const thickness = this.measure(this.argument());
        this.ruleAt(width, thickness, raise ? this.measure(raise) : 0);
        this.x += width;
        return;
      }
      case "vrule":
      case "hrule": {
        const size = {};
        for (let m = this.take(/\s*(width|height|depth)/); m; m = this.take(/\s*(width|height|depth)/)) size[m[1]] = this.dimension();
        this.ruleAt(size.width ?? 0.4, (size.height ?? 0) + (size.depth ?? 0), -(size.depth ?? 0));
        this.x += size.width ?? 0.4;
        return;
      }
      case "underline":
        return this.group(this.argument(), { underline: true });
      case "textsuperscript":
        return this.group(this.argument(), { size: f.size * 0.73 }, f.size * 0.36);
      case "textsubscript":
        return this.group(this.argument(), { size: f.size * 0.73 }, -f.size * 0.16);
      case "ensuremath": {
        const tex = this.argument();
        const one = /^\s*\\([a-zA-Z]+)\s*$/.exec(tex);
        const ch = one && MATH_CHARACTERS[one[1]];
        return ch ? this.print(ch) : this.math(tex);
      }
      case "linebreak":
      case "newline":
        this.optional();
        return this.breakLine();
      case "leaders":
      case "cleaders":
      case "xleaders": {
        this.readBox();
        return;
      }
      case "advance": {
        this.take(/\\[a-zA-Z@]+\d*\s*(?:by)?/);
        this.dimension();
        return;
      }
      case "penalty":
      case "hangafter":
      case "looseness":
        this.take(/\s*=?\s*(?:-?\d+|\\[a-zA-Z@]+)\s?/);
        return;
      case "IfFileExists": {
        this.argument();
        const then = this.argument();
        this.argument();
        return this.group(then);
      }
      case "includegraphics":
        return this.picture(this.optional(), this.argument());
      case "begin":
        return this.environment(this.argument());
      case "end":
        this.argument();
        return;
      case "begingroup":
      case "bgroup": {
        const close = this.endOfGroup();
        const inner = this.input.slice(this.at, close.from);
        this.at = close.to;
        return this.group(inner);
      }
      case "endgroup":
      case "egroup":
        return;
      case "gdef":
      case "def":
      case "edef":
      case "xdef":
        this.take(/\\[a-zA-Z@]+[^{]*/);
        this.argument();
        return;
      case "else":
        return this.skipTo(["fi"]);
      case "fi":
        return;
    }
    if (/^if[a-z@]*$/i.test(name) && !this.setting.macros.has(name)) return this.conditional(name);
    if (name === "at" && !this.setting.macros.has("at")) return this.builtin("\\rlap{\\kern\\dimexpr #1bp-49.6bp\\relax\\raisebox{#2bp}{#3}}", 3);
    if (name === "ruleat" && !this.setting.macros.has("ruleat")) {
      return this.builtin(
        "\\rlap{\\kern\\dimexpr #1bp-49.6bp\\relax\\raisebox{\\dimexpr #3bp-#4bp/2\\relax}{\\rule{\\dimexpr #2bp-#1bp\\relax}{#4bp}}}",
        4
      );
    }
    if ((name === "lab" || name === "plab") && !this.setting.macros.has(name)) {
      return this.builtin("\\llap{\\makebox[#1bp][l]{#2}}", 2);
    }
    if (name in SWALLOW) {
      this.take(/\*/);
      this.optional();
      for (let i = 0; i < SWALLOW[name]; i++) this.argument();
      return;
    }
    if (name in WRAPPER) {
      this.optional();
      for (let i = 1; i < WRAPPER[name]; i++) this.argument();
      return this.group(this.argument());
    }
    const own = this.fonts.get(name);
    if (own) return void (this.font = { ...f, family: own, foreign: own === "times" && this.setting.macros.get("familydefault")?.body !== "\\rmdefault" });
    const macro = this.setting.macros.get(name);
    if (macro) return this.expand(macro);
    if (name in CHARACTERS) {
      for (const ch of CHARACTERS[name]) this.print(ch);
      return;
    }
    if (name in HOUSE) return this.expand(HOUSE[name]);
    if (/(?:skip|glue|indent|margin|penalty|width|space)$/.test(name)) {
      if (this.take(/\s*=?\s*(?=-?[\d.]|\\)/)) {
        this.dimension();
        while (this.take(/\s*(?:plus|minus)/)) this.dimension();
      }
      return;
    }
    this.unknown(name);
  }
  builtin(body, args) {
    this.expand({ args, optional: null, body });
  }
  family(code) {
    const family = FAMILIES[code.trim().slice(0, 3)] ?? this.font.family;
    this.font = { ...this.font, family, foreign: family === "times" && !/rmdefault/.test(this.setting.macros.get("familydefault")?.body ?? "") };
  }
  expand(macro) {
    const args = [];
    if (macro.delimiters) {
      const [before, ...after] = macro.delimiters;
      if (before && this.input.startsWith(before, this.at)) this.at += before.length;
      for (const stop of after) {
        if (stop === "") {
          args.push(this.argument());
          continue;
        }
        const end = this.input.indexOf(stop, this.at);
        args.push(this.input.slice(this.at, end === -1 ? this.input.length : end));
        this.at = end === -1 ? this.input.length : end + stop.length;
      }
    } else {
      let wanted = macro.args;
      if (macro.optional !== null) {
        args.push(this.optional() ?? macro.optional);
        wanted--;
      }
      for (let i = 0; i < wanted; i++) args.push(this.argument());
    }
    const body = macro.body.replace(/(\\[a-zA-Z@]+)?#(\d)/g, (_, before, n) => {
      const arg = args[Number(n) - 1] ?? "";
      return before ? `${before}${/^[a-zA-Z@]/.test(arg) ? " " : ""}${arg}` : arg;
    });
    const rest = this.input.slice(this.at);
    this.input = body + (/\\[a-zA-Z@]+$/.test(body) && /^[a-zA-Z@]/.test(rest) ? " " : "") + rest;
    this.at = 0;
  }
  /** \hbox{..}, \hbox to 12bp{..}, \hb@xt@ 12bp{..}; or a box register. */
  readBox(name) {
    this.skipSpaces();
    if (!name) {
      const m = this.take(/\\(hbox|hb@xt@|vbox|vtop|box|copy)\s*/);
      if (!m) return null;
      if (m[1] === "box" || m[1] === "copy") {
        const reg = this.take(/(\\?[a-zA-Z@]+|\d+)\s?/);
        return reg && this.boxes.get(reg[1]) || null;
      }
      name = m[1];
    }
    let width = null;
    if (name === "hb@xt@" || this.take(/\s*to(?![a-z])/)) width = this.dimension();
    this.skipSpaces();
    const g = readGroup(this.input, this.at);
    if (!g) return null;
    this.at = g.end;
    const box = this.box(g.value);
    return width === null ? box : this.stretch(box, width);
  }
  placeRaised(box, dy) {
    const y = this.y;
    this.y += dy;
    this.place(box);
    this.y = y;
    this.x += box.width;
  }
  ruleAt(width, thickness, raise) {
    if (width <= 0.05 || thickness <= 0.01) return;
    if (width < thickness) {
      const x = this.x + width / 2;
      const y = this.y + raise;
      this.add({ kind: "path", x, y, width: 0, stroke: width, points: [{ x, y }, { x, y: y + thickness }] });
    } else this.add({ kind: "rule", x: this.x, y: this.y + raise + thickness / 2, width, thickness });
  }
  picture(options, file) {
    const clip = parseClipOptions(options);
    if (!clip || !file) {
      this.problems.push({ reason: "unknown-shape", detail: "a picture that is not cut from the PDF" });
      return;
    }
    const width = round(PAGE.width - clip.left - clip.right);
    const height = round(PAGE.height - clip.bottom - clip.top);
    this.add({ kind: "glyph", clip, x: this.x, y: this.y, width, height });
    this.x += width;
  }
  environment(name) {
    const close = `\\end{${name}}`;
    const end = this.input.indexOf(close, this.at);
    const body = this.input.slice(this.at, end === -1 ? this.input.length : end);
    const after = end === -1 ? this.input.length : end + close.length;
    if (/^(tikzpicture|pgfpicture|picture)\*?$/.test(name)) {
      this.at = after;
      return this.drawing(body);
    }
    if (/^(align|equation|gather|displaymath|math)\*?$/.test(name)) {
      this.at = after;
      return this.math(/^(align|gather)/.test(name) ? `\\begin{${name.replace("*", "")}ed}${body}\\end{${name.replace("*", "")}ed}` : body);
    }
    this.optional();
  }
  /** Paths of a picture drawn over the line, in the line's own coordinates. */
  drawing(body) {
    const clean = body.replace(/^\s*\[[^\]]*\]/, "");
    for (const m of clean.matchAll(/\\(path|draw|fill|filldraw|node|clip)(?![a-zA-Z])\s*(?:\[([^\]]*)\])?([^;]*);/g)) {
      const [, verb, style = "", path] = m;
      if (verb === "clip") continue;
      if (verb === "node" || /controls|arc|circle|node/.test(path)) {
        this.problems.push({ reason: "unknown-shape", detail: "a drawn curve or label" });
        continue;
      }
      const points = [...path.matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map((p) => ({
        x: round(this.x + Number(p[1])),
        y: round(this.y + Number(p[2]))
      }));
      if (points.length < 2) continue;
      if (/rectangle/.test(path)) {
        const [a, b] = points;
        points.splice(0, points.length, a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y });
      }
      const xs = points.map((p) => p.x);
      const piece = {
        kind: "path",
        x: Math.min(...xs),
        y: Math.min(...points.map((p) => p.y)),
        width: Math.max(...xs) - Math.min(...xs),
        points
      };
      const stroke = /line width\s*=\s*([\d.]+)/.exec(style);
      if (verb === "draw" || /draw/.test(style)) piece.stroke = stroke ? Number(stroke[1]) : 0.4;
      this.add(piece);
    }
  }
  // ---- conditionals ----------------------------------------------------
  conditional(name) {
    let truth = false;
    if (name === "ifdim") {
      const a = this.dimension();
      const op = this.take(/\s*([<>=])/);
      const b = this.dimension();
      truth = op?.[1] === "<" ? a < b : op?.[1] === ">" ? a > b : a === b;
    } else if (name === "ifx" || name === "if") {
      const a = this.argument();
      const b = this.argument();
      truth = a === b;
    } else if (name === "ifnum") this.take(/[^\\]*(?:\\[a-zA-Z@]+\s*)?[<>=][^\\]*?(?=\\|\s)/);
    else if (name === "iftrue") truth = true;
    else if (name === "ifdefined" || name === "ifcsname") truth = this.setting.macros.has(this.argument());
    if (!truth) this.skipTo(["else", "fi"]);
  }
  skipTo(stops) {
    let depth = 0;
    const re = /\\([a-zA-Z@]+)/g;
    re.lastIndex = this.at;
    for (let m = re.exec(this.input); m; m = re.exec(this.input)) {
      if (depth === 0 && stops.includes(m[1])) {
        this.at = re.lastIndex;
        this.take(/\s?/);
        return;
      }
      if (/^if/.test(m[1]) && m[1] !== "iff") depth++;
      else if (m[1] === "fi") depth--;
    }
    this.at = this.input.length;
  }
  endOfGroup() {
    let depth = 1;
    const re = /\\(begingroup|bgroup|endgroup|egroup)(?![a-zA-Z@])/g;
    re.lastIndex = this.at;
    for (let m = re.exec(this.input); m; m = re.exec(this.input)) {
      depth += m[1].startsWith("b") ? 1 : -1;
      if (depth === 0) return { from: m.index, to: re.lastIndex };
    }
    return { from: this.input.length, to: this.input.length };
  }
  /** No definition: report it, and take its arguments away with it. */
  unknown(name) {
    const from = this.at;
    while (this.input[this.at] === "[" || this.input[this.at] === "{" || this.input[this.at] === "*") {
      if (this.input[this.at] === "*") {
        this.at++;
        continue;
      }
      const g = this.input[this.at] === "[" ? readOptional(this.input, this.at) : readGroup(this.input, this.at);
      if (!g) break;
      this.at = g.end;
    }
    const took = this.input.slice(from, this.at);
    this.problems.push({ reason: "unknown-command", detail: `\\${name}${took.length > 40 ? `${took.slice(0, 40)}...` : took}` });
  }
};
var PRIMITIVE_AT = /* @__PURE__ */ new Set(["hb@xt@"]);
var STYLES = {
  bfseries: { bold: true },
  bf: { bold: true },
  mdseries: { bold: false },
  itshape: { italic: true },
  it: { italic: true },
  em: { italic: true },
  slshape: { italic: true },
  upshape: { italic: false },
  normalfont: { bold: false, italic: false },
  rmfamily: {},
  sffamily: {},
  ttfamily: {},
  rm: {},
  sf: {}
};
var STYLED = {
  textbf: { bold: true },
  textit: { italic: true },
  emph: { italic: true },
  textsl: { italic: true },
  textmd: { bold: false },
  textrm: {},
  textsf: {},
  texttt: {},
  text: {}
};
var HOUSE = {
  pow: { args: 1, optional: null, body: "\\textsuperscript{#1}" },
  ohms: { args: 0, optional: null, body: "\u03A9" },
  dg: { args: 0, optional: null, body: "\\textdegree{}" },
  degC: { args: 0, optional: null, body: "\\textdegree{}C" },
  x: { args: 0, optional: null, body: "\\texttimes{}" }
};
function round(v) {
  return Math.round(v * 100) / 100;
}
function sameStyle(a, b) {
  return a.size === b.size && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.serif === b.serif;
}
function moved(p, dx, dy) {
  const out = { ...p, x: p.x + dx, y: p.y + dy };
  if (out.kind === "path") out.points = out.points.map((q) => ({ x: q.x + dx, y: q.y + dy }));
  return out;
}
function mathWidth(tex, size) {
  const frac = /\\d?frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}/;
  let t = tex;
  for (let m = frac.exec(t); m; m = frac.exec(t)) t = t.replace(m[0], m[1].length > m[2].length ? m[1] : m[2]);
  const plain2 = t.replace(/\\(?:mathrm|mathbf|text|left|right|begin\{[a-z]*\}|end\{[a-z]*\})/g, "").replace(/\\(?:quad)/g, "mm").replace(/\\[a-zA-Z]+/g, "m").replace(/[_^{}&\s]|\\./g, "");
  return plain2.length * size * 0.5;
}

// src/extract/flow.ts
var SMALL = 0.86;
var SAME_LINE = 0.26;
function flow(line, loose = false) {
  const pieces = line.pieces.filter((p) => p.kind === "text" || p.kind === "math");
  if (!pieces.length) return { tex: "", rebuilt: false, ambiguous: false };
  const largest = Math.max(...pieces.map((p) => sizeOf(p, 0)));
  const base = largest > 0 && largest < SMALL * baseSize(pieces, line.size) ? largest : baseSize(pieces, line.size);
  const read = toRows(pieces, base);
  const rows = loose ? foldShortRows(read.rows, base) : read.rows;
  const span = (r) => [Math.min(...r.anchors.map((p) => p.x)), Math.max(...r.anchors.map(right))];
  const stacked = read.rows.some((r, i) => {
    const next = read.rows[i + 1];
    if (!next || r.y - next.y >= 0.95 * base) return false;
    const [a, b] = [span(r), span(next)];
    return a[0] < b[1] && b[0] < a[1];
  });
  const unsure = read.ambiguous || stacked;
  const doubt = { ambiguous: unsure };
  const columns = splitColumns(rows, base);
  const parts = columns ?? rows.map((row) => rowTex(row, base, doubt));
  return {
    tex: parts.join(" ").replace(/ {2,}/g, " ").trim(),
    rebuilt: rows.length > 1 || rows.some((r) => r.small.length > 0 || r.anchors.some(isComposite)),
    ambiguous: doubt.ambiguous
  };
}
function foldShortRows(rows, base) {
  const size = (r) => [...r.anchors, ...r.small].reduce((n, p) => n + (p.kind === "text" ? p.text.trim().length : 4), 0);
  const kept = rows.filter((r) => size(r) > 4);
  for (const r of rows.filter((x) => size(x) <= 4)) {
    const left = (x) => Math.min(...[...x.anchors, ...x.small].map((p) => p.x));
    const host = kept.filter((k) => Math.abs(k.y - r.y) < 1.2 * base && left(r) > left(k) + 0.5 * base).sort((a, b) => Math.abs(a.y - r.y) - Math.abs(b.y - r.y))[0];
    if (host) {
      host.anchors.push(...r.anchors);
      host.small.push(...r.small);
    } else kept.push(r);
  }
  return kept.sort((a, b) => b.y - a.y);
}
function toRows(pieces, base, sameLine = SAME_LINE) {
  const isSmall = (p) => sizeOf(p, base) < SMALL * base;
  const rows = [];
  const isSign = (p) => p.kind === "text" && !/[\p{L}\p{N}]/u.test(p.text) && p.size > 1.2 * base;
  const anchors = pieces.filter((q) => !isSmall(q));
  const typed = (p) => p.kind === "math" && !isComposite(p) && p.tex.length <= 12;
  const ordered = anchors.filter((q) => !isSign(q)).sort((a, b) => Number(typed(a)) - Number(typed(b)) || b.y - a.y);
  for (const p of ordered) {
    let row = rows.find((r) => Math.abs(r.y - p.y) <= sameLine * base);
    if (!row && typed(p)) {
      row = rows.find(
        (r) => p.y - r.y > 0.2 * base && p.y - r.y < 0.8 * base && // Straight after something of that line (typed maths is measured only roughly).
        r.anchors.some((a) => p.x > a.x && p.x - right(a) < (a.kind === "math" ? 1.5 : 0.5) * base)
      );
    }
    if (row) row.anchors.push(p);
    else rows.push({ y: p.y, anchors: [p], small: [] });
  }
  for (const row of rows) row.y = commonY(row.anchors);
  for (const p of anchors.filter(isSign)) {
    const e = extent(p, base);
    const mid = (e.top + e.bottom) / 2;
    const row = rows.find((r) => mid > r.y - 0.22 * base && mid < r.y + 0.72 * base);
    if (row) row.anchors.push(p);
    else rows.push({ y: p.y, anchors: [p], small: [] });
  }
  let ambiguous = false;
  for (const p of pieces.filter(isSmall)) {
    const fits = rows.filter((r) => {
      const dy = p.y - r.y;
      const host = r.anchors.find((a) => isComposite(a) && p.x >= a.x - 1 && p.x - right(a) < 4);
      const up = host ? Math.max(0.95 * base, extent(host, base).top - r.y + 0.2 * base) : 0.95 * base;
      return dy > -0.75 * base && dy < up;
    });
    const clear = fits.filter((r) => !r.anchors.some((a) => overlap(a, p) > 0.4 * p.width));
    const from = clear.length ? clear : fits.length ? fits : rows;
    const off = (r) => Math.min(Math.abs(p.y - r.y - 0.42 * base), Math.abs(p.y - r.y + 0.2 * base));
    const [best, next] = [...from].sort((a, b) => off(a) - off(b));
    if (next && clear.length !== 1 && Math.abs(off(best) - off(next)) < 0.06 * base) ambiguous = true;
    best.small.push(p);
  }
  return { rows: rows.sort((a, b) => b.y - a.y), ambiguous };
}
function commonY(list2) {
  const weight = /* @__PURE__ */ new Map();
  for (const p of list2) {
    const key = Math.round(p.y * 10) / 10;
    weight.set(key, (weight.get(key) ?? 0) + (p.kind === "text" ? p.text.length : 2));
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0][0];
}
function overlap(a, b) {
  return Math.min(right(a), right(b)) - Math.max(a.x, b.x);
}
function splitColumns(rows, base) {
  if (rows.length < 2) return null;
  const all = rows.flatMap((r) => [...r.anchors, ...r.small]);
  const edges = [...new Set(all.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const left = edges[0];
  const gutter = edges.find((x) => x > left + base && all.every((p) => right(p) <= x - 0.9 * base || p.x >= x - 1));
  if (gutter === void 0) return null;
  const inLeft = (p) => p.x < gutter - 1;
  const starts = rows.filter((r) => r.anchors.some(inLeft));
  if (starts.length === rows.length) {
    const bothWrap = rows.length === 2 && rows[0].y - rows[1].y < 1.4 * base && rows[0].anchors.filter(inLeft).length === 1;
    if (!bothWrap || !/[a-z]$/.test(textOf(rows[0].anchors.filter(inLeft)))) return null;
    if (!/^[a-z]/.test(textOf(rows[1].anchors.filter(inLeft)).trim())) return null;
    return [inLeft, (p) => !inLeft(p)].map(
      (side) => rows.map((r) => rowTex({ y: r.y, anchors: r.anchors.filter(side), small: r.small.filter(side) }, base)).join(" ")
    );
  }
  return null;
}
var textOf = (list2) => list2.map((p) => p.kind === "text" ? p.text : "").join("");
function rowTex(row, base, doubt = { ambiguous: false }) {
  const items = [
    ...row.anchors.map((p) => ({ p, script: null })),
    ...row.small.map((p) => {
      const dy = p.y - row.y;
      return { p, script: dy > 0.2 * base ? "sup" : dy < -0.07 * base ? "sub" : null };
    })
  ].sort((a, b) => a.p.x - b.p.x || (a.script === "sup" ? -1 : 1));
  const tokens = [];
  let loose = false;
  for (let i = 0; i < items.length; i++) {
    const { p, script } = items[i];
    if (script === null) {
      if (p.kind === "text") {
        tokens.push({
          x: p.x,
          end: right(p),
          text: p.text,
          style: styleOf(p),
          loose,
          ...p.serif ? { serif: true } : null,
          ...p.pictured ? { pictured: true } : null
        });
      } else if (p.kind === "math") {
        loose ||= !isComposite(p);
        tokens.push({ x: p.x, end: right(p), math: p.tex, loose: !isComposite(p) });
        if (isComposite(p)) tokens[tokens.length - 1].tex = "composite";
      }
      continue;
    }
    const group = [p];
    while (items[i + 1]?.script === script && items[i + 1].p.x - right(group[group.length - 1]) < 0.45 * base && !(items[i + 1].p.x < group[0].x - 1)) group.push(items[++i].p);
    const inner = flow({ pieces: group, size: baseSize(group, base) }).tex;
    tokens.push({ x: p.x, end: Math.max(...group.map(right)), script, text: inner, loose });
  }
  tokens.forEach((t, i) => {
    const n = tokens[i + 1];
    if (t.script && n?.script && n.script !== t.script && n.x < t.end && t.x < n.end) {
      t.end = n.end = Math.max(t.end, n.end);
      t.leads = n.leads = true;
    }
  });
  quantities(tokens);
  return write(nuclides(tokens, base, doubt), base);
}
function styleOf(p) {
  const letters = /\p{L}/u.test(p.text);
  return `${p.bold ? "b" : ""}${p.italic && letters ? "i" : ""}${p.underline ? "u" : ""}`;
}
function write(tokens, base) {
  let out = "";
  let run2 = "";
  let style = "";
  const flush = () => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(run2);
    if (m[2]) {
      let t = escape(m[2]);
      if (style.includes("i")) t = `\\textit{${t}}`;
      if (style.includes("b")) t = `\\textbf{${t}}`;
      if (style.includes("u")) t = `\\underline{${t}}`;
      out += m[1] + t + m[3];
    } else out += run2;
    run2 = "";
  };
  tokens.forEach((token, i) => {
    const prev = tokens[i - 1];
    if (prev && needsSpace(prev, token, base, tokens[i + 1])) run2 += " ";
    if (token.script) {
      const host = prev?.tex === "composite" && prev.math !== void 0;
      const inner = token.text ?? "";
      const short = /^[\d+\-−–=()]+$|^[A-Za-z]$/.test(inner.trim());
      const maths = host || short || inner.includes("$") ? toMath2(inner) : null;
      const mark = token.script === "sup" ? "^" : "_";
      const close = prev !== void 0 && token.x - prev.end < 0.3 * base;
      const joins = close && (prev.script !== void 0 && prev.script !== token.script || prev.math !== void 0 && !prev.script && !prev.math.trimEnd().endsWith("}") && !prev.math.includes(mark) || prev.math !== void 0 && !prev.script && new RegExp(`[${mark === "^" ? "_" : "^"}]\\{[^{}]*\\}$`).test(prev.math.trim()));
      flush();
      if (maths !== null && (host || joins) && out.endsWith("$")) {
        out = `${out.slice(0, -1)}${mark}{${maths}}$`;
      } else if (maths !== null) out += `${out.endsWith("$") ? " " : ""}$${mark}{${maths}}$`;
      else out += `\\text${token.script === "sup" ? "superscript" : "subscript"}{${inner}}`;
      style = "";
    } else if (token.math !== void 0 && attachedScript(prev, token, tokens[i + 1], base)) {
      flush();
      out = out.replace(/\s+$/, "");
      const mark = token.math.trim()[0];
      const before = /\$((?:\\[\s\S]|[^$\\])*)\$$/.exec(out)?.[1];
      if (before !== void 0 && !new RegExp(`\\${mark}\\{[^{}]*\\}\\s*$`).test(before)) out = `${out.slice(0, -1)}${token.math.trim()}$`;
      else out += `${out.endsWith("$") ? " " : ""}$${token.math}$`;
      style = "";
    } else if (token.math !== void 0) {
      flush();
      if (out.endsWith("$")) out += " ";
      out += `$${token.math}$`;
      style = "";
    } else {
      const next = token.style ?? "";
      if (next !== style && run2.trim() !== "") flush();
      else if (run2.trim() === "" && next !== style) flush();
      style = next;
      run2 += token.text ?? "";
    }
  });
  flush();
  return out;
}
function attachedScript(prev, token, next, base) {
  if (token.math === void 0 || !/^\s*[_^]/.test(token.math) || /^\s*\^\{?\\circ\}?\s*$/.test(token.math)) return false;
  const gapBefore = !prev || /\s$/.test(prev.text ?? "") || token.x - prev.end >= WORD_GAP * base;
  const leads = /^\s*\^/.test(token.math) && gapBefore && next?.text !== void 0 && /^\p{Lu}/u.test(next.text) && next.x - token.x < 2.5 * base;
  return !leads;
}
function needsSpace(prev, token, base, next) {
  if (attachedScript(prev, token, next, base)) return false;
  const before = prev.text ?? "";
  const after = token.text ?? "";
  if (prev.pictured && /^\p{L}/u.test(after) && token.x - prev.end <= 0.2 * base) return false;
  if (/\s$/.test(before) || /^\s/.test(after)) return false;
  const stacked = token.script && next?.script && next.script !== token.script && next.x < token.end && token.x < next.end;
  if (token.script && !stacked) return false;
  if (prev.leads && !token.script && token.x - prev.end < 0.25 * base) return false;
  const gap2 = token.x - prev.end;
  if (!token.script && /^(?:[,;)\]]|\.(?!\.))/.test(after) && gap2 < 0.6 * base) return false;
  if (!prev.script && /[([]$/.test(before) && gap2 < 0.4 * base) return false;
  if (prev.loose && gap2 < -0.02 && /^[\p{L}\p{N}=(]/u.test(after)) return true;
  return gap2 >= WORD_GAP * base;
}
function escape(s) {
  return s.replace(/([%#&_${}])/g, "\\$1");
}
var ELEMENT = /^([A-Z][a-z]?)(?![a-z])/;
var NUMBER = /^(?:\d{1,3}|[A-Za-z])$/;
function nuclides(tokens, base, doubt) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const [a, b, c, d] = [tokens[i], tokens[i + 1], tokens[i + 2], tokens[i + 3]];
    const prev = tokens[i - 1];
    const attached = prev !== void 0 && !/\s$/.test(prev.text ?? "") && a.x - prev.end < WORD_GAP * base;
    if (!a.leads || !b?.leads || attached) {
      out.push(a);
      continue;
    }
    const top = (a.script === "sup" ? a : b).text?.trim() ?? "";
    const bottom = (a.script === "sup" ? b : a).text?.trim() ?? "";
    const symbol = c && !c.script && c.text !== void 0 && c.x - a.end < 0.25 * base ? ELEMENT.exec(c.text) : null;
    if (!symbol || !NUMBER.test(top) || !NUMBER.test(bottom)) {
      doubt.ambiguous = true;
      out.push(a);
      continue;
    }
    let sym = symbol[1];
    let rest = c.text.slice(sym.length);
    let last = c;
    let used = 2;
    const e = tokens[i + 3];
    if (!rest && sym.length === 1 && e?.text !== void 0 && !e.script && /^[a-z](?![a-z])/.test(e.text) && e.x - c.end < 0.25 * base) {
      sym += e.text[0];
      rest = e.text.slice(1);
      last = e;
      used = 3;
    }
    let tex = `{}^{${top}}_{${bottom}}\\mathrm{${sym}}`;
    const n = tokens[i + used + 1];
    const typed = n?.math !== void 0 && !n.script ? /^\s*\^\{([^{}]*)\}\s*$/.exec(n.math)?.[1] : void 0;
    const charge = !rest && n && n.x - last.end < 0.25 * base ? n.script === "sup" ? chargeOf(n.text ?? "") : typed !== void 0 ? chargeOf(typed) : null : null;
    if (charge) tex += `^{${charge}}`;
    out.push({ x: a.x, end: charge ? n.end : last.end, math: tex, tex: "nuclide" });
    if (rest) out.push({ ...last, x: last.end - 0.01, text: rest });
    i += charge ? used + 1 : used;
  }
  return out;
}
function chargeOf(text) {
  const m = /^(\d?)([+−–-])$/.exec(text.trim());
  return m ? `${m[1]}${m[2] === "+" ? "+" : "-"}` : null;
}
function quantities(tokens) {
  tokens.forEach((t, i) => {
    if (!t.serif || t.text === void 0 || !/^\p{Lu}$/u.test(t.text.trim()) || t.style?.includes("i")) return;
    const [prev, next] = [tokens[i - 1], tokens[i + 1]];
    const bracketed = /\($/.test(prev?.text ?? "") && /^\)/.test(next?.text ?? "");
    const nuclide = prev?.leads === true || /^\s*\{\}\^/.test(prev?.math ?? "");
    if (!bracketed && !nuclide) t.style = `${t.style ?? ""}i`;
  });
}

// src/extract/equations/symbol.ts
var isDrawing = (g) => g.width >= 18 && g.height >= 14;
var SymbolPictures = class {
  name = "symbols";
  read(line, context) {
    const gone = [];
    const put = [];
    for (const p of line.pieces) {
      if (p.kind !== "glyph") continue;
      const char = context.symbols.read(p);
      if (char === null) continue;
      const known = context.symbols instanceof SymbolTable ? context.symbols.find(p) : null;
      const size = known?.size ?? line.size;
      const host = line.pieces.filter(isText).filter((t) => Math.abs(t.x - p.x) < 60 && t.y > extent(p, size).bottom - 2 && t.y < p.y + p.height).sort((a, b) => Math.abs(a.x + a.width - p.x) - Math.abs(b.x + b.width - p.x))[0];
      const y = p.y + (known?.drop ?? 0);
      const touching = line.pieces.filter(isText).filter((t) => /\p{L}/u.test(t.text) && Math.abs(t.y - y) < 0.3 * size && (Math.abs(right(t) - p.x) < 0.3 * size || Math.abs(t.x - right(p)) < 0.3 * size));
      gone.push(p);
      put.push({
        kind: "text",
        text: char,
        x: p.x,
        width: p.width,
        size,
        // Cut to its ink, a picture's foot is only near the baseline.
        y: host && host.size >= 0.8 * size && Math.abs(host.y - y) < 0.2 * size ? host.y : y,
        // Set in the same weight as the letters it is set against (Cl in a bold heading).
        bold: touching.length > 0 && touching.every((t) => t.bold),
        italic: known?.italic ?? false,
        underline: false,
        // A Latin letter stands in for part of a word; a Greek one is a symbol of its own.
        .../^[A-Za-z]$/.test(char) ? { pictured: true } : null
      });
    }
    return gone.length ? context.read(without(line, gone, put)) : null;
  }
};

// src/extract/equations/pass.ts
var UNREAD = "\u25A1";
var PassOver = class {
  name = "pass";
  read(line, context) {
    const pictures = line.pieces.filter((p) => p.kind === "glyph");
    if (pictures.length) {
      const boxes = pictures.filter((p) => !isDrawing(p)).map(
        (p) => ({
          kind: "text",
          text: UNREAD,
          x: p.x,
          width: p.width,
          size: line.size,
          bold: false,
          italic: false,
          underline: false,
          y: nearestBaseline(line, p.x, p.y, p.y + p.height)
        })
      );
      const rest = context.read({ ...line, pieces: [...line.pieces.filter((p) => p.kind !== "glyph"), ...boxes] });
      return { ok: false, reason: "unknown-symbol", tex: rest.tex };
    }
    const left = line.pieces.filter(unresolved);
    const reason = !left.length ? "ambiguous-layout" : left.every((p) => underWords(line, p)) ? "lost-underline" : left.every(asBar) ? "ambiguous-layout" : "unknown-shape";
    return { ok: false, reason, tex: flow(line, true).tex };
  }
};
function underWords(line, p) {
  const bar = asBar(p);
  if (!bar) return false;
  const over = line.pieces.filter(
    (t) => t.kind === "text" && t.y - bar.y > 0.4 && t.y - bar.y < 0.3 * t.size && right(t) > bar.x1 && t.x < bar.x2
  );
  const under = line.pieces.some(
    (q) => q !== p && q.y < bar.y && extent(q, line.size).top > bar.y - 0.25 * line.size && q.x < bar.x2 && right(q) > bar.x1
  );
  return over.length > 0 && !under;
}
function nearestBaseline(line, x, from, to) {
  const near = line.pieces.filter((p) => p.kind === "text" && p.y >= from - 4 && p.y <= to).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  return near?.y ?? from;
}

// src/extract/equations/root.ts
var Roots = class {
  name = "roots";
  read(line, context) {
    const signs = line.pieces.map(asRoot).filter((r) => r !== null).sort((a, b) => a.end - a.x - (b.end - b.x));
    const cut = cutPunctuation(line, signs.map((r) => r.end));
    if (cut !== line) return this.read(cut, context);
    for (const r of signs) {
      const tick = line.pieces.filter((p) => p.kind === "path" && p !== r.piece && Math.abs(right(p) - r.x) < 0.6 && p.width < 8);
      const within2 = line.pieces.filter((p) => {
        if (p === r.piece || tick.includes(p)) return false;
        const e = extent(p, line.size);
        if (unresolved(p) && e.top <= r.foot + 1 && (p.x < r.rise - 1.5 || right(p) > r.end + 2.5)) return false;
        return middle(p) > r.rise - 1 && middle(p) < r.end + 0.5 && (e.top + e.bottom) / 2 < r.top && e.bottom > r.foot - 4;
      });
      if (!within2.length || within2.some((p) => unresolved(p) || right(p) > r.end + 2.5)) continue;
      const index = line.pieces.filter(
        // Within the sign's own height: small print above it belongs to the line above.
        (p) => isText(p) && p.size < 0.75 * line.size && p.x > r.x - 8 && right(p) < r.rise + 1 && p.y > r.foot + 4 && p.y + 0.72 * p.size <= r.top + 1
      );
      const inner = context.read(sub(line, within2));
      const tex = toMath2(inner.tex);
      const n = index.length ? toMath2(context.read(sub(line, index)).tex) : "";
      if (!tex || n === null || !/^\w*$/.test(n)) continue;
      const size = baseSize(within2, line.size);
      const main = within2.filter((p) => !isText(p) || p.size >= 0.86 * size).sort((a, b) => a.x - b.x)[0] ?? within2[0];
      const left = Math.min(r.x, ...tick.map((p) => p.x));
      const made = {
        kind: "math",
        tex: `\\sqrt${n ? `[${n}]` : ""}{${tex}}`,
        x: left,
        width: r.end - left,
        y: main.y,
        size,
        top: r.top,
        bottom: Math.min(r.foot, ...within2.map((p) => extent(p, size).bottom)),
        ...!inner.ok || within2.some((p) => isComposite(p) && p.failed) ? { failed: { reason: "unknown-symbol" } } : null
      };
      return rebuilt(context.read(without(line, [r.piece, ...tick, ...index, ...within2], [made])));
    }
    return null;
  }
};
function cutPunctuation(line, ends) {
  let changed = false;
  const pieces = line.pieces.flatMap((p) => {
    if (!isText(p)) return [p];
    const m = /^(.*?[^\s.,;:])([.,;:]+)$/.exec(p.text);
    const end = ends.find((x) => p.x < x && right(p) > x + 1);
    if (!m || end === void 0) return [p];
    const family = p.serif ? "times" : "helvetica";
    const w = (s) => [...s].reduce((n, ch) => n + advance(ch, p.size, family, p.bold, p.italic), 0);
    const scale = p.width / Math.max(0.01, w(p.text));
    const head = w(m[1]) * scale;
    if (Math.abs(p.x + head - end) > 2.5) return [p];
    changed = true;
    return [
      { ...p, text: m[1], width: head },
      { ...p, text: m[2], x: right(p) - (p.width - head), width: p.width - head }
    ];
  });
  return changed ? { ...line, pieces } : line;
}

// src/extract/equations/script.ts
var TextAndScripts = class {
  name = "scripts";
  read(line) {
    if (line.pieces.some(unresolved)) return null;
    const read = flow(line);
    if (read.ambiguous) return null;
    const failed = line.pieces.find((p) => isComposite(p) && p.failed);
    if (failed && isComposite(failed)) return { ok: false, reason: failed.failed.reason, tex: read.tex };
    return { ok: true, tex: read.tex, rebuilt: read.rebuilt };
  }
};

// src/extract/equations/typed.ts
var TypedMaths = class {
  name = "typed";
  read(line) {
    const [only, ...more] = line.pieces;
    if (!only || more.length || only.kind !== "math" || isComposite(only)) return null;
    return { ok: true, tex: `$${only.tex}$`, rebuilt: false };
  }
};

// src/extract/equations/underline.ts
var Underline = class {
  name = "underline";
  read(line, context) {
    const split = splitUnderBars(line);
    if (split !== line) return this.read(split, context) ?? null;
    for (const p of line.pieces) {
      const bar = unresolved(p) ? asBar(p) : null;
      if (!bar) continue;
      const over = line.pieces.filter(isText).filter((t) => t.y - bar.y > 0.4 && t.y - bar.y < 0.22 * t.size && right(t) > bar.x1 + 1 && t.x < bar.x2 - 1);
      if (!over.length) continue;
      const from = Math.min(...over.map((t) => t.x));
      const to = Math.max(...over.map(right));
      if (Math.abs(from - bar.x1) > 2 || Math.abs(to - bar.x2) > 2) continue;
      const under = line.pieces.some(
        (q) => q !== p && q.y < bar.y && extent(q, line.size).top > bar.y - 0.25 * line.size && middle(q) > bar.x1 && middle(q) < bar.x2
      );
      if (under) continue;
      const put = over.map((t) => ({ ...t, underline: true }));
      return context.read(without(line, [p, ...over], put));
    }
    return null;
  }
};
function splitUnderBars(line) {
  const bars = line.pieces.filter(unresolved).map(asBar).filter((b) => b !== null);
  if (!bars.length) return line;
  let changed = false;
  const pieces = line.pieces.flatMap((p) => {
    if (!isText(p) || !p.text.includes(" ")) return [p];
    const cuts = bars.filter((b) => p.y - b.y > 0.4 && p.y - b.y < 0.3 * p.size && (inside(b.x1, p) || inside(b.x2, p)));
    if (!cuts.length) return [p];
    const words = wordsOf(p);
    const ends = cuts.flatMap((b) => [b.x1, b.x2]).filter((x) => inside(x, p));
    const fits = ends.every((x) => words.some((w) => Math.abs(w.x - x) < 1.5 || Math.abs(right(w) - x) < 1.5));
    if (!fits) return [p];
    changed = true;
    return words;
  });
  return changed ? { ...line, pieces } : line;
}
var inside = (x, p) => x > p.x + 1 && x < right(p) - 1;
function wordsOf(p) {
  const family = p.serif ? "times" : "helvetica";
  const widths = [...p.text].map((ch) => advance(ch, p.size, family, p.bold, p.italic));
  const scale = p.width / Math.max(0.01, widths.reduce((a, b) => a + b, 0));
  const out = [];
  let x = p.x;
  let i = 0;
  for (const word of p.text.split(/(?<= )/)) {
    const w = widths.slice(i, i + word.length).reduce((a, b) => a + b, 0) * scale;
    const text = word.trimEnd();
    const ink = widths.slice(i, i + text.length).reduce((a, b) => a + b, 0) * scale;
    if (text) out.push({ ...p, text: out.length ? text : text, x, width: ink });
    x += w;
    i += word.length;
  }
  return out;
}

// src/extract/equations/chain.ts
var STANDARD_READERS = [
  new TypedMaths(),
  new SymbolPictures(),
  new Underline(),
  new Roots(),
  new Fractions(),
  new TextAndScripts(),
  new PassOver()
];
var EquationChain = class {
  constructor(symbols, readers = STANDARD_READERS) {
    this.symbols = symbols;
    this.readers = readers;
  }
  symbols;
  readers;
  read(line) {
    for (const reader of this.readers) {
      const reading = reader.read(line, this);
      if (reading) return reading;
    }
    return { ok: false, reason: "ambiguous-layout", tex: "" };
  }
};

// src/extract/equations/integral.ts
var Integrals = class {
  name = "integrals";
  read(line, context) {
    const signs = line.pieces.filter((p) => p.kind === "glyph" && isIntegral(p));
    for (const g of signs) {
      const size = line.size;
      const small = (p) => p !== g && sizeOf(p, size) < 0.86 * size;
      const near = line.pieces.filter((p) => p !== g && p.x >= g.x + 0.25 * g.width && p.x <= right(g) + 0.8 * size);
      const upper = near.filter((p) => small(p) && extent(p, size).bottom >= g.y + 0.5 * g.height);
      const lower = near.filter((p) => small(p) && extent(p, size).top <= g.y + 0.5 * g.height);
      const zone = (p) => extent(p, size).bottom >= g.y + 0.5 * g.height || extent(p, size).top <= g.y + 0.5 * g.height;
      if (near.some((p) => unresolved(p) && zone(p)) || [...upper, ...lower].some(unresolved)) continue;
      if (!upper.length !== !lower.length) continue;
      let tex = "\\int";
      let ok = true;
      if (upper.length) {
        const [up, lo] = [context.read(sub(line, upper)), context.read(sub(line, lower))];
        const [u, l] = [toMath2(up.tex), toMath2(lo.tex)];
        if (!u || !l) continue;
        ok = up.ok && lo.ok;
        tex = `\\int_{${l}}^{${u}}`;
      }
      const used = [...upper, ...lower];
      const made = {
        kind: "math",
        tex,
        x: g.x,
        width: Math.max(right(g), ...used.map(right)) - g.x,
        // The sign is centred on the maths axis, a quarter of the size above the baseline.
        y: g.y + g.height / 2 - 0.25 * size,
        size,
        top: g.y + g.height,
        bottom: g.y,
        ...!ok || used.some((p) => isComposite(p) && p.failed) ? { failed: { reason: "unknown-symbol" } } : null
      };
      return rebuilt(context.read(without(line, [g, ...used], [made])));
    }
    return null;
  }
};

// src/extract/equations/modulus.ts
function asPost(p, size) {
  if (p.kind !== "path" && p.kind !== "rule") return null;
  const e = extent(p, size);
  const tall = e.top - e.bottom;
  if (p.width > 1.2 || tall < 0.7 * size || tall > 3 * size) return null;
  if (p.kind === "path") {
    const xs = p.points.map((q) => q.x);
    if (Math.max(...xs) - Math.min(...xs) > 1.2) return null;
  }
  return { piece: p, x: p.x + p.width / 2, top: e.top, bottom: e.bottom };
}
var Modulus = class {
  name = "modulus";
  read(line, context) {
    const posts = line.pieces.map((p) => asPost(p, line.size)).filter((p) => p !== null);
    if (!posts.length) return null;
    const first = posts.sort((a2, b2) => a2.x - b2.x)[0];
    const row = posts.filter((p) => p.bottom < first.top && p.top > first.bottom && Math.abs(p.top - p.bottom - (first.top - first.bottom)) < 1.5);
    if (row.length % 2 !== 0) return null;
    const inside2 = (a2, b2) => line.pieces.filter((p) => !posts.some((q) => q.piece === p) && middle(p) > a2.x && middle(p) < b2.x && overlaps(p, a2, line.size));
    for (let i = 0; i + 1 < row.length; i += 2) {
      if (!inside2(row[i], row[i + 1]).length) return null;
      if (i + 2 < row.length && !inside2(row[i + 1], row[i + 2]).length) return null;
    }
    const [a, b] = row;
    const within2 = inside2(a, b);
    const reading = context.read(sub(line, within2));
    const tex = toMath2(reading.tex);
    if (!tex) return null;
    const words = reading.tex.replace(/\\[a-zA-Z]+/g, " ").match(/[A-Za-z]{4,}/g) ?? [];
    if (words.some((w) => !FUNCTIONS2.test(w))) return null;
    const size = baseSize(within2, line.size);
    const main = within2.filter((p) => isText(p) && p.size >= 0.86 * size)[0] ?? within2[0];
    const made = {
      kind: "math",
      tex: `\\left|${tex}\\right|`,
      x: a.piece.x,
      width: b.piece.x + b.piece.width - a.piece.x,
      y: main.y,
      size,
      top: Math.max(a.top, b.top),
      bottom: Math.min(a.bottom, b.bottom),
      ...!reading.ok || within2.some((p) => isComposite(p) && p.failed) ? { failed: { reason: "unknown-symbol" } } : null
    };
    return rebuilt(context.read(without(line, [a.piece, b.piece, ...within2], [made])));
  }
};
function overlaps(p, post, size) {
  const e = extent(p, size);
  return e.bottom < post.top && e.top > post.bottom;
}
var FUNCTIONS2 = /^(?:cosec|sinh|cosh|tanh|arcsin|arccos|arctan)$/;

// src/extract/bands.ts
function bands(line) {
  const boxes = line.pieces.map((piece) => {
    const e = extent(piece, line.size);
    const reach = piece.kind === "rule" || piece.kind === "path" && e.top - e.bottom < 1.5 ? 0.5 * line.size : 0;
    return { piece, top: e.top + reach, bottom: e.bottom - reach };
  });
  boxes.sort((a, b) => b.top - a.top);
  const out = [];
  for (const b of boxes) {
    const last = out[out.length - 1];
    if (last && b.top > last.bottom) {
      last.pieces.push(b.piece);
      last.bottom = Math.min(last.bottom, b.bottom);
    } else out.push({ pieces: [b.piece], top: b.top, bottom: b.bottom, y: 0 });
  }
  for (const band of out) band.y = baseline(band.pieces);
  return out;
}
function baseline(pieces) {
  const weight = /* @__PURE__ */ new Map();
  for (const p of pieces) {
    if (p.kind !== "text" && p.kind !== "math") continue;
    const key = Math.round(p.y);
    weight.set(key, (weight.get(key) ?? 0) + (p.kind === "text" ? p.text.length : 4));
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? pieces[0].y;
}

// src/extract/roles.ts
var COLUMN = { body: 72.3, option: 93.6, right: 545.7 };
var ROLES = {
  mcq: { role: "line", args: 3, label: 1, text: 2 },
  stem: { role: "line", args: 2, text: 1 },
  row: { role: "line", args: 3, x: 1, text: 2 },
  prow: { role: "line", args: 3, x: 1, text: 2 },
  freerow: { role: "positioned", args: 2, text: 1 },
  choice: { role: "option", args: 3, label: 1, text: 2 },
  optrow: { role: "options", args: 5 },
  dotline: { role: "answer", args: 5, x: 1, text: 2 },
  qmark: { role: "mark", args: 2, text: 1 },
  qfig: { role: "figure", args: 6, optional: true },
  total: { role: "total", args: 1 },
  newpage: { role: "page", args: 0 },
  clearpage: { role: "page", args: 0 },
  swpage: { role: "page", args: 0 },
  partbreak: { role: "skip", args: 0 },
  pagestart: { role: "skip", args: 0 },
  gap: { role: "skip", args: 1 },
  hang: { role: "skip", args: 1 },
  dotgrid: { role: "skip", args: 3 },
  swtotalas: { role: "skip", args: 1 },
  normalsize: { role: "skip", args: 0 }
};
var isElement = (t) => t.name !== "text";
function specOf(name, macros) {
  if (!Object.hasOwn(ROLES, name)) return null;
  const spec = ROLES[name];
  const own = macros?.get(name);
  if (!own || spec.role === "total" || spec.role === "page" || spec.role === "skip") return spec;
  const args = own.args - (own.optional !== null ? 1 : 0);
  if (args === spec.args || args < 1) return spec;
  const last = (i) => i === void 0 ? void 0 : i === spec.args - 1 ? args - 1 : Math.min(i, args - 1);
  return { ...spec, args, text: last(spec.text), x: last(spec.x), label: last(spec.label) };
}
function tokenize2(body, macros) {
  const src = dropComments(body);
  const out = [];
  let text = "";
  const flush = () => {
    if (text.trim()) out.push({ name: "text", raw: text.trim() });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const m = src[i] === "\\" ? /^\\([a-zA-Z]+)/.exec(src.slice(i, i + 24)) : null;
    const spec = m ? specOf(m[1], macros) : null;
    const read = m && spec ? readArgs(src, i + m[0].length, spec) : null;
    if (m && spec && read) {
      flush();
      out.push({ name: m[1], spec, args: read.args, optional: read.optional });
      i = read.end;
      continue;
    }
    const step = m ? m[0].length : src[i] === "\\" ? 2 : 1;
    text += src.slice(i, i + step);
    i += step;
  }
  flush();
  return out;
}
function readArgs(src, from, spec) {
  let i = from;
  let optional = null;
  const opt = spec.optional ? readOptional(src, i) : null;
  if (opt) {
    optional = opt.value;
    i = opt.end;
  }
  const args = [];
  for (let n = 0; n < spec.args; n++) {
    while (/\s/.test(src[i] ?? "")) i++;
    const g = readGroup(src, i);
    if (!g) {
      if (spec.role === "total") return { args, optional, end: from };
      return null;
    }
    args.push(g.value);
    i = g.end;
  }
  return { args, optional, end: i };
}

// src/extract/questions.ts
var WRITTEN = /* @__PURE__ */ new Set(["textbf", "textit", "underline", "textsuperscript", "textsubscript", "newline", "qfig"]);
var ROMAN3 = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
var LABEL = /^\(([a-z]{1,4})\)$/;
var FURNITURE = /^\W*(?:BLANK PAGE|\[?Turn over\]?|Please turn over.*|Question [\w()]+ (?:is printed|is on|starts|begins|continues).*|(?:Continuation of|Additional) working space.*|(?:The )?question continues.*|Continue your (?:working|answer).*|Additional Page.*|Permission to reproduce.*|DO NOT WRITE IN THIS MARGIN)\W*$/i;
var SECTION = /^\W*Section [A-D]\W*$/i;
var QuestionBuilder = class {
  constructor(source, setting, chain, rules, images) {
    this.source = source;
    this.setting = setting;
    this.chain = chain;
    this.rules = rules;
    this.images = images;
    this.origin = -(this.setting.line("\\at{0}{0}{x}").pieces[0]?.x ?? 0);
  }
  source;
  setting;
  chain;
  rules;
  images;
  stem = [];
  parts = [];
  options = [];
  passes = [];
  part = null;
  sub = null;
  /** Parts are (i), (ii) with no (a) above them. */
  topRoman = false;
  numbered = false;
  rebuilt = false;
  hasFigure = false;
  /** Where loose text after an element belongs. */
  open = null;
  choice = 0;
  /** Text after OR that the next label takes as its lead-in. */
  lead = null;
  done = false;
  pageBreak = false;
  figures = [];
  origin;
  build() {
    for (const token of tokenize2(this.source.body, this.setting.macros)) {
      if (this.done) break;
      if (isElement(token)) this.element(token);
      else this.loose(token.raw);
    }
    if (this.lead?.length) (this.target()?.paras ?? this.stem).push(...this.lead);
    const letters = this.options.map((o) => o.label);
    if (letters.length > 0 && letters.length < 4 && this.hasFigure && !this.parts.length) {
      const missing = ["A", "B", "C", "D"].filter((l) => !letters.includes(l));
      this.pass("unknown-shape", `options ${missing.join(", ")} are printed only in a picture`);
    }
    if (this.besideFigure.length > 1) {
      this.pass("unknown-shape", `marks ${this.besideFigure.map((n) => `[${n}]`).join(" ")} are printed beside a figure: what they are for is in the picture`);
    }
    const parts = this.parts.map((d) => this.finish(d));
    const total = (choice) => this.parts.filter((d) => d.choice === choice).reduce((sum, d) => sum + (marksOf(d) ?? 0), 0);
    return {
      stem: this.blocks(this.stem),
      parts,
      options: this.options.length ? { source: "choices", items: this.options.map((o) => ({ label: o.label, content: inlineToHtml(o.para?.tex ?? o.tex) })) } : this.hasFigure ? { source: "figure", items: [] } : null,
      passes: this.passes,
      rebuilt: this.rebuilt,
      // Marks printed before the first part (against a table of tests in a figure) are the question's own.
      partMarks: this.ownMarks + total(0) + Math.max(total(1), total(2))
    };
  }
  // ---- reading text ----------------------------------------------------
  pass(reason, detail) {
    this.passes.push({ question: this.source.number, reason, detail: detail.slice(0, 160) });
  }
  set(tex) {
    const line = this.setting.line(tex);
    for (const p of line.problems ?? []) this.pass(p.reason, p.detail);
    return this.rules.pieces(line);
  }
  read(line) {
    const drawings = [];
    const pieces = line.pieces.map((p) => {
      if (p.kind !== "glyph" || !isDrawing(p)) return p;
      const { page, left, bottom, right: r, top } = p.clip;
      drawings.push(`\\qfig[page=${page},trim=${left}bp ${bottom}bp ${r}bp ${top}bp,clip]{source.pdf}{}`);
      const char = String.fromCharCode(57344 + drawings.length - 1);
      return { kind: "text", text: char, x: p.x, y: lineOf(line, p), width: p.width, size: line.size, bold: false, italic: false, underline: false };
    });
    const reading = this.chain.read({ ...line, pieces });
    if (reading.ok) this.rebuilt ||= reading.rebuilt;
    else this.pass(reading.reason, reading.tex);
    const tex = this.rules.tidy(reading.tex);
    return tex.replace(/[\uE000-\uF8FF]/g, (c) => drawings[c.charCodeAt(0) - 57344] ?? c);
  }
  /** A run of LaTeX as inline LaTeX, its own line breaks kept apart. */
  inline(tex) {
    return splitLines(tex).map((part) => this.read(this.set(part.tex)) + part.after).join("").replace(/ {2,}/g, " ").trim();
  }
  // ---- structure -------------------------------------------------------
  target() {
    return this.sub ?? this.part;
  }
  addMarks(n) {
    this.resume();
    const t = this.target();
    if (t) {
      t.marks = (t.marks ?? 0) + n;
      this.marked.set(t, t.paras.length);
    } else this.ownMarks += n;
  }
  /** How many paragraphs a part had when its marks were last set. */
  marked = /* @__PURE__ */ new Map();
  /**
   * Marks on their own line under a figure that came after the current part
   * was already answered: they are the marks of the part that names the
   * figure ("On Fig. 1.6, plot ..."), which takes the figure with them.
   */
  figureMarks(n) {
    const t = this.target();
    if (!t || t.marks === null) return false;
    const tail = t.paras.slice(this.marked.get(t) ?? t.paras.length);
    if (!tail.some((p) => p.figure)) return false;
    const caption = tail.map((p) => /Fig(?:ure)?\.?\s*(\d+\.\d+)/.exec(p.tex)?.[1]).find((c) => c !== void 0);
    if (!caption) return false;
    const names = new RegExp(`Fig(?:ure)?\\.?\\s*${caption.replace(".", "\\.")}(?!\\d)`);
    const all = this.parts.flatMap((d) => [d, ...d.subs]);
    const owners = all.filter((d) => d !== t && d.subs.length === 0 && d.marks === null && d.paras.some((p) => !p.figure && names.test(p.tex)));
    if (owners.length !== 1) return false;
    t.paras.splice(t.paras.length - tail.length, tail.length);
    owners[0].paras.push(...tail);
    owners[0].marks = n;
    return true;
  }
  /** Marks set against a question that has no parts. */
  ownMarks = 0;
  /** Of those, the ones printed beside a figure. */
  besideFigure = [];
  draft(label, parentRef) {
    return { label, ref: `${parentRef}(${label})`, paras: [], marks: null, lines: 0, value: null, subs: [], choice: this.choice };
  }
  openLabel(label) {
    this.resume();
    const roman = ROMAN3.includes(label);
    if (!this.part && roman) this.topRoman = true;
    const part = this.part;
    const continues = part !== null && part.subs.length === 0 && label.length === 1 && label.charCodeAt(0) === part.label.charCodeAt(0) + 1;
    if (part && (this.topRoman ? !roman : roman && !continues)) {
      this.sub = this.draft(label, part.ref);
      part.subs.push(this.sub);
    } else {
      this.part = this.draft(label, String(this.source.number));
      this.parts.push(this.part);
      this.sub = null;
    }
    if (this.lead) {
      this.target().paras.push(...this.lead);
      this.lead = null;
    }
  }
  /** A paragraph, or the continuation of the one it wraps on from. */
  addPara(tex, x, end, gap2, firstWord, columns = []) {
    const text = tex.trim();
    if (!text) return;
    if (this.furniture(text)) return;
    const list2 = this.tail ?? this.lead ?? this.target()?.paras ?? this.stem;
    const prev = list2[list2.length - 1];
    const wraps = prev !== void 0 && prev === this.open && !prev.figure && !/^(?:\\textbf\{)?•/.test(text) && gap2 > 0 && gap2 < 1.32 * this.setting.leading && !/[.:?]$/.test(prev.tex) && (Math.abs(prev.x - x) < 2 && // The line above was full; or, where a paper sets a narrower measure,
    // it was long and this one carries on the sentence in lower case.
    (prev.end + firstWord + this.setting.wordSpace > COLUMN.right - 18 || /^[a-z]/.test(text) && !/^[a-z]+ \d/.test(text) && prev.end - prev.x > 0.7 * (COLUMN.right - prev.x)) || // Or it starts under the second column of the line above, in lower case: that column wraps.
    (prev.columns ?? []).some((c) => Math.abs(c - x) < 2) && /[a-z$]$/.test(prev.tex) && /^[a-z]/.test(text) && !/^[a-z]+ \d/.test(text));
    if (wraps) {
      prev.tex += ` ${text}`;
      prev.end = end;
      return;
    }
    const para = { tex: text, x, end, ...columns.length ? { columns } : null };
    list2.push(para);
    this.open = para;
  }
  /** Page furniture is dropped; a section heading ends (or precedes) a question. */
  furniture(text) {
    const plain2 = text.replace(/\\[a-z]+\{|\}/g, "").replace(/\s+/g, " ").trim();
    if (SECTION.test(plain2)) {
      if (this.numbered || this.parts.length || this.options.length) this.done = true;
      else this.dropUntilNumber = true;
      return true;
    }
    if (this.dropUntilNumber && !this.numbered) return true;
    if (/^BLANK PAGE$/i.test(plain2)) {
      if (this.source.last && this.complete()) this.done = true;
      return true;
    }
    return FURNITURE.test(plain2);
  }
  dropUntilNumber = false;
  /** What follows the last question once it is complete, until something shows it is still the question. */
  tail = null;
  resume() {
    if (this.tail === null) return;
    const tail = this.tail;
    this.tail = null;
    (this.lead ?? this.target()?.paras ?? this.stem).push(...tail);
  }
  /** Every mark (or every option) the question should have has been seen. */
  complete() {
    if (this.choice === 1) return false;
    if (this.options.length >= 4) return true;
    const sum = this.parts.filter((d) => d.choice !== 2).reduce((n, d) => n + (marksOf(d) ?? 0), 0);
    if (this.parts.length) return sum >= this.source.marks;
    if (this.source.marks > 0 && this.ownMarks >= this.source.marks) return true;
    return this.source.marks <= 1 && this.hasFigure && this.pageBreak;
  }
  takeMarks(tex) {
    const marks = [];
    let out = tex;
    for (const call of findCommand(tex, "swmark", 1).reverse()) {
      const m = /\[\s*(\d+)\s*\]/.exec(call.args[0]);
      if (!m) continue;
      marks.unshift(Number(m[1]));
      out = out.slice(0, call.start) + out.slice(call.end);
    }
    return { tex: out, marks };
  }
  /**
   * Labels off the front of a line. The question's own number is dropped,
   * (a) and (ii) open parts, and what is left is the line's text.
   */
  takeLabels(pieces) {
    const rest = [...pieces].sort((a, b) => a.x - b.x);
    for (; ; ) {
      const first = rest[0];
      if (!first || !isText(first) || !(first.bold || right(first) <= 0.5)) return rest;
      const text = first.text.trim();
      const pair = /^\(([a-z]{1,4})\)\s*\(([ivx]+)\)$/.exec(text);
      const label = LABEL.exec(text);
      if (pair) {
        this.openLabel(pair[1]);
        this.openLabel(pair[2]);
      } else if (label) this.openLabel(label[1]);
      else if (!this.numbered && (text === this.source.label || text === String(this.source.number))) {
        this.numbered = true;
        if (this.dropUntilNumber) this.stem.length = 0;
      } else return rest;
      rest.shift();
    }
  }
  /** EITHER and OR stand alone on their line. */
  alternative(text) {
    const word = /^\\textbf\{(EITHER|OR)\}$/.exec(text.trim())?.[1];
    if (!word || word === "OR" && this.choice !== 1) return false;
    this.resume();
    this.choice = word === "EITHER" ? 1 : 2;
    if (this.lead?.length) (this.target()?.paras ?? this.stem).push(...this.lead);
    this.lead = [];
    if (word === "OR") {
      this.lead.push({ tex: "\\textbf{OR}", x: 0, end: 0 });
      this.open = this.lead[0];
    } else {
      const para = { tex: "\\textbf{EITHER}", x: 0, end: 0 };
      this.lead.push(para);
      this.open = para;
    }
    return true;
  }
  // ---- elements --------------------------------------------------------
  element(el) {
    if (el.spec.role === "skip") return;
    const floating = this.floating;
    this.floating = null;
    if (floating && el.spec.role === "line" && (Number(el.args[0]) || 0) < 0.9 * this.setting.leading) {
      this.pass("ambiguous-layout", `${floating === "#" ? "a drawing" : `"${floating}"`} is set by itself just above the line that follows it`);
    }
    switch (el.spec.role) {
      case "line":
        return this.line(el);
      case "positioned":
        return this.positioned(el);
      case "option":
        return this.option(el);
      case "options":
        ["A", "B", "C", "D"].forEach((label, i) => this.addOption(label, this.inline(el.args[i + 1] ?? "")));
        return;
      case "answer":
        return this.answer(el);
      case "mark": {
        const m = /\[\s*(\d+)\s*\]/.exec(el.args[1]);
        if (m && !this.figureMarks(Number(m[1]))) {
          if (!this.target() && this.stem[this.stem.length - 1]?.figure) this.besideFigure.push(Number(m[1]));
          this.addMarks(Number(m[1]));
        }
        this.open = null;
        return;
      }
      case "figure":
        return this.figure(el);
      case "total":
        this.done = true;
        return;
      case "page":
        this.pageBreak = true;
        if (this.source.last && this.tail === null && this.complete()) this.tail = [];
        this.open = null;
        return;
    }
  }
  loose(raw) {
    const taken = this.takeMarks(raw);
    const text = this.inline(taken.tex);
    const open = this.open;
    if (text && open) {
      open.tex += ` ${text}`;
      open.end = this.endOf(taken.tex, open.x);
    } else if (text && !this.furniture(text)) this.addPara(text, COLUMN.body, COLUMN.body, 0, 0);
    taken.marks.forEach((n) => this.addMarks(n));
  }
  endOf(tex, x) {
    const last = splitLines(tex).pop();
    return last ? x + Math.max(0, ...this.setting.line(last.tex).pieces.map(right)) : x;
  }
  line(el) {
    const x = el.spec.x !== void 0 ? Number(el.args[el.spec.x]) : COLUMN.body;
    const label = el.spec.label !== void 0 ? this.set(el.args[el.spec.label]).pieces : [];
    if (label.length) this.takeLabels(label.map((p) => isText(p) ? { ...p, bold: true } : p));
    const taken = this.takeMarks(el.args[el.spec.text]);
    const lines = splitLines(taken.tex);
    let tex = "";
    let word = 0;
    lines.forEach((part, i) => {
      const line = this.set(part.tex);
      const pieces = i === 0 ? this.takeLabels(line.pieces) : line.pieces;
      if (i === 0) word = this.firstWord(pieces);
      const body = this.textMarks(pieces, x, taken.marks);
      tex += this.read({ ...line, pieces: body }) + part.after;
    });
    tex = tex.replace(/ {2,}/g, " ").trim();
    if (!this.alternative(tex)) {
      this.addPara(tex, x, this.endOf(taken.tex, x), Number(el.args[0]) || 0, word);
    }
    taken.marks.forEach((n) => this.addMarks(n));
  }
  /** "[2]" set at the right margin as plain text is the part's marks. */
  textMarks(pieces, x, marks) {
    return pieces.filter((p) => {
      const m = isText(p) && x + p.x > 480 ? /^\[(\d+)\]$/.exec(p.text.trim()) : null;
      if (m) marks.push(Number(m[1]));
      return !m;
    });
  }
  firstWord(pieces) {
    const first = pieces[0];
    if (!first) return 0;
    if (!isText(first)) return first.width;
    const word = first.text.trim().split(" ")[0];
    return first.width * word.length / Math.max(1, first.text.length);
  }
  /** The text of a positioned block of a few characters only, until the next element. */
  floating = null;
  positioned(el) {
    const taken = this.takeMarks(el.args[1]);
    const line = this.set(taken.tex);
    const all = this.textMarks(line.pieces, this.origin, taken.marks);
    const chars = all.map((p) => isText(p) ? p.text.trim() : p.kind === "math" ? p.tex : "#").join("");
    if (all.length && chars.length <= 3) this.floating = chars;
    const list2 = bands({ ...line, pieces: all });
    const first = list2.findIndex((band) => this.letters(band.pieces).length > 0);
    const letters = this.letters(all);
    const options = first >= 0 && this.source.marks <= 1 && this.parts.length === 0 && this.options.length + letters.length <= 5 && (letters.length >= 2 || list2[first].pieces.every((p) => p.x >= letters[0].x));
    let y = 0;
    let gap2 = Number(el.args[0]) || 0;
    for (const band of options ? list2.slice(0, first) : list2) {
      this.band(band, line, gap2 + (y - band.y));
      y = band.y;
      gap2 = 0;
    }
    if (options) this.optionBlock(list2.slice(first).flatMap((b) => b.pieces), letters, line);
    taken.marks.forEach((n) => this.addMarks(n));
  }
  band(band, line, gap2) {
    const pieces = this.takeLabels(band.pieces);
    if (!pieces.length) return;
    const tex = this.read({ ...line, pieces });
    if (this.alternative(tex)) return;
    const x = this.origin + Math.min(...pieces.map((p) => p.x));
    const sorted = [...pieces].sort((a, b) => a.x - b.x);
    const columns = sorted.filter((p, i) => i > 0 && p.x - Math.max(...sorted.slice(0, i).map(right)) > 3 * this.setting.wordSpace).map((p) => this.origin + p.x);
    this.addPara(tex, x, this.origin + Math.max(...pieces.map(right)), gap2, this.firstWord(pieces), columns);
  }
  letters(pieces) {
    return pieces.filter((p) => isText(p) && p.bold && /^[A-D]$/.test(p.text.trim())).sort((a, b) => b.y - a.y || a.x - b.x);
  }
  /** Options in a row, a column or a grid: each piece goes with its letter. */
  optionBlock(pieces, letters, line) {
    const size = line.size;
    const owner = (p) => {
      const y = p.kind === "path" ? Math.min(...p.points.map((q) => q.y)) : p.y;
      const near = Math.min(...letters.map((l) => Math.abs(l.y - y)));
      const above = letters.filter((l) => l.y >= y - 0.75 * size);
      const row = (above.length ? above : letters).filter((l) => Math.abs(l.y - y) < near + 0.3 * size || above.length === 1);
      const pick = row.length ? row : letters.filter((l) => Math.abs(l.y - y) < near + 3);
      const top = Math.min(...pick.map((l) => l.y));
      const same = pick.filter((l) => Math.abs(l.y - top) < 3);
      return same.filter((l) => l.x <= p.x + 1).sort((a, b) => b.x - a.x)[0] ?? same[0];
    };
    for (const letter of [...letters].sort((a, b) => a.text.localeCompare(b.text))) {
      const own = pieces.filter((p) => !letters.includes(p) && owner(p) === letter);
      const texts = bands({ ...line, pieces: own }).map((b) => this.read({ ...line, pieces: b.pieces }));
      this.addOption(letter.text.trim(), texts.join(" ").trim());
    }
    this.open = null;
  }
  addOption(label, tex) {
    this.resume();
    this.options.push({ label, tex, para: null });
    this.open = null;
  }
  option(el) {
    const label = this.set(el.args[1]).pieces.map((p) => isText(p) ? p.text : "").join("").trim();
    const para = { tex: this.inline(el.args[2]), x: COLUMN.option, end: 0 };
    this.resume();
    this.options.push({ label, tex: "", para });
    this.open = para;
  }
  /** \dotline{gap}{from}{before the dots}{after them}{to} */
  answer(el) {
    const x = Number(el.args[1]);
    const before = this.set(el.args[2]);
    const pieces = this.takeLabels(before.pieces);
    const labelled = pieces.length < before.pieces.length;
    const text = pieces.length ? this.read({ ...before, pieces }) : "";
    const equals = /=\s*$/.test(text);
    if (text && (labelled || !equals)) this.addPara(text, x, x, 0, 0);
    const mark = /\[\s*(\d+)\s*\]/.exec(el.args[3]);
    const unit = this.inline(el.args[3].replace(/\[\s*\d+\s*\]/, ""));
    const t = this.target();
    if (t) {
      t.lines++;
      if (!labelled && equals && !t.value) t.value = { label: inlineToHtml(text), unit: inlineToHtml(unit) };
    }
    if (mark) this.addMarks(Number(mark[1]));
    this.open = null;
  }
  /** \qfig{page}{l b r t}{caption}{above}{below}{left} */
  figure(el) {
    this.open = null;
    if (this.dropUntilNumber && !this.numbered) return;
    if (this.source.last && this.pageBreak && this.complete() && isPageSized(el.args[1])) {
      this.done = true;
      return;
    }
    this.hasFigure = true;
    const trim = el.args[1].trim().replace(/\s+/g, " ");
    const extra = el.optional ? `,${el.optional}` : "";
    const caption = el.args[2].trim() ? this.inline(el.args[2]) : "";
    const tex = `\\qfig[page=${el.args[0].trim()},trim=${trim},clip${extra}]{source.pdf}{${caption}}`;
    (this.tail ?? this.lead ?? this.target()?.paras ?? this.stem).push({ tex, x: 0, end: 0, figure: true });
  }
  // ---- output ----------------------------------------------------------
  /**
   * Only the commands this extractor writes may reach the HTML step, which
   * drops any other silently: one there means text was run together.
   */
  ownCommands(tex) {
    const prose = tex.replace(/\$(?:\\[\s\S]|[^$\\])*\$/g, " ");
    for (const m of prose.matchAll(/\\([a-zA-Z]+)/g)) {
      if (!WRITTEN.has(m[1])) this.pass("unknown-command", `\\${m[1]} left in the text: ${prose.slice(Math.max(0, m.index - 30), m.index + 30)}`);
    }
  }
  blocks(paras) {
    const kept = labelsToFigures(paras.filter((p) => p.figure || !/^[.…\s]*$/.test(p.tex.replace(/\\newline/g, ""))));
    for (const p of kept) if (!p.figure) this.ownCommands(p.tex);
    return toBlocks(kept.map((p) => p.tex.replace(/(?:\s*\\newline)+$/, "")).join("\n\n"), this.images);
  }
  finish(d) {
    const subparts = d.subs.map((s) => this.finish(s));
    const answerSpace = d.value ? { kind: "value", ...d.value } : d.lines > 0 ? { kind: "lines", lines: d.lines } : d.marks !== null ? { kind: "markright" } : null;
    return { label: d.label, ref: d.ref, marks: marksOf(d), answerSpace, content: this.blocks(d.paras), subparts };
  }
};
function lineOf(line, p) {
  const ys = line.pieces.filter(isText).map((t) => t.y).filter((y) => y >= p.y - 1 && y <= p.y + p.height);
  return ys.sort((a, b) => Math.abs(a - p.y) - Math.abs(b - p.y))[0] ?? p.y;
}
function labelsToFigures(paras) {
  const out = [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    out.push(p);
    if (!p.figure) continue;
    let j = i + 1;
    while (j < paras.length && !paras[j].figure && isLabel(paras[j].tex)) j++;
    if (j === i + 1 || j >= paras.length || paras[j].figure || !CAPTION.test(plainText(paras[j].tex))) continue;
    const labels = paras.slice(i + 1, j).map((q) => q.tex.trim()).join("; ");
    out[out.length - 1] = { ...p, tex: p.tex.replace(/\{\}$/, `{${labels}}`) };
    i = j - 1;
  }
  return out;
}
var CAPTION = /^(?:Fig(?:ure)?\.?|Table)\s*\d/;
var plainText = (tex) => tex.replace(/\\[a-zA-Z]+\{|\}/g, "").trim();
var isLabel = (tex) => {
  const t = plainText(tex);
  return t.length > 0 && t.length <= 40 && !/[.?!:]$/.test(t) && !CAPTION.test(t) && !/^\(?[a-z]{1,3}\)\s/.test(t);
};
function marksOf(d) {
  if (!d.subs.length) return d.marks;
  const known = d.subs.map(marksOf).filter((m) => m !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) + (d.marks ?? 0) : d.marks;
}
function isPageSized(trim) {
  const [l, b, r, t] = trim.split(/\s+/).map((v) => parseFloat(v));
  return 595 - l - r > 390 && 842 - b - t > 400;
}
function splitLines(tex) {
  const out = [];
  const re = /\\(?:(linebreak)(?:\[\d\])?|(newline))(?![a-zA-Z])/g;
  let from = 0;
  for (let m = re.exec(tex); m; m = re.exec(tex)) {
    const part = tex.slice(from, m.index);
    const depth = (part.match(/(?<!\\)\{/g)?.length ?? 0) - (part.match(/(?<!\\)\}/g)?.length ?? 0);
    if (depth !== 0) continue;
    out.push({ tex: part, after: m[1] ? " " : "\\newline " });
    from = re.lastIndex;
  }
  out.push({ tex: tex.slice(from), after: "" });
  return out;
}

// src/extract/paper-extractor.ts
function splitPaper(tex) {
  const src = dropComments(tex ?? "");
  const begin = src.lastIndexOf("\\begin{document}");
  if (begin === -1) return { preamble: "", body: src };
  const from = begin + "\\begin{document}".length;
  const end = src.indexOf("\\end{document}", from);
  return { preamble: src.slice(0, begin), body: src.slice(from, end === -1 ? void 0 : end) };
}
function paperOf(source) {
  const first = splitQuestions(splitPaper(source.questions).body)[0];
  return first ? parsePaperId(first.paperId) : null;
}
var POSITIONING = ["at", "freerow", "swglyph", "swcut", "row", "prow", "mcq", "stem", "optrow", "choice", "dotline"];
var PLAIN_RULES = { pieces: (line) => line, tidy: (tex) => tex };
var PaperExtractor = class {
  constructor(source) {
    this.source = source;
    this.paper = paperOf(source);
  }
  source;
  paper;
  result = { warnings: [], passes: [], rebuilt: [] };
  // ---- what the paper is ---------------------------------------------------
  /** Syllabus code, "5054". */
  get code() {
    return this.paper?.subjectCode ?? null;
  }
  /** Paper number, "2" of 5054/21. */
  get paperNumber() {
    return this.paper?.paper ?? null;
  }
  get variant() {
    return this.paper?.variant ?? null;
  }
  /** "M/J" or "O/N". */
  get session() {
    return this.paper?.session ?? null;
  }
  get year() {
    return this.paper?.year ?? null;
  }
  // ---- what the last extract() found --------------------------------------
  get warnings() {
    return this.result.warnings;
  }
  get passes() {
    return this.result.passes;
  }
  /** Questions with a line rebuilt from position: right as far as known, worth a look. */
  get rebuilt() {
    return this.result.rebuilt;
  }
  // ---- the template --------------------------------------------------------
  extract() {
    const doc = this.document();
    if (!this.isPositioned(doc)) return this.remember(this.documented(), [], []);
    const setting = this.understand(doc.preamble);
    const chain = this.chain();
    const images = this.source.images ?? {};
    const blocks = splitQuestions(doc.body);
    const labels = findCommand(doc.body, "examq", 4).map((call) => call.args[1].trim());
    const drafts = blocks.map((block, i) => {
      const source = {
        number: block.number,
        label: labels[i] || String(block.number),
        marks: parseMarks(block.marksRaw),
        body: block.body,
        last: i === blocks.length - 1
      };
      return { block, marks: source.marks, read: this.readQuestion(source, setting, chain, images) };
    });
    const questions = this.classify(drafts);
    const passes = drafts.flatMap((d) => d.read.passes);
    const rebuilt2 = drafts.filter((d) => d.read.rebuilt).map((d) => d.block.number);
    const paper = parsePaperId(blocks[0].paperId);
    const warnings = [];
    if (!paper) {
      warnings.push({ code: "bad-paper-id", message: `Could not read paper id "${blocks[0].paperId}" (expected code/paper-and-variant/session/year).` });
    }
    warnings.push(...this.check(questions, drafts, passes, rebuilt2));
    const sourcePdf = findSourcePdf(this.source.questions);
    let parsed = { paper, questions, warnings, ...sourcePdf ? { sourcePdf } : null };
    parsed = this.attachAnswers(parsed);
    return this.remember(parsed, passes, rebuilt2);
  }
  // ---- the steps -----------------------------------------------------------
  /** The file -> preamble and body. */
  document() {
    return splitPaper(this.source.questions);
  }
  /** Written as a copy of the printed page (positions on every line), not in the documented format. */
  isPositioned(doc) {
    if (!splitQuestions(doc.body).length) return false;
    const own = MacroTable.fromPreamble(doc.preamble);
    return POSITIONING.some((name) => own.has(name)) || isLayoutDialect(doc.body);
  }
  /** A paper in the documented format keeps its own reader. */
  documented() {
    const qp = parseQuestionPaper(this.source.questions, this.source.images ?? {});
    return this.source.answers ? mergePaper(qp, parseAnswerPaper(this.source.answers, this.source.images ?? {})) : qp;
  }
  /** The preamble's own definitions, and a typesetter that carries them out. */
  understand(preamble) {
    return new Typesetter(MacroTable.fromPreamble(preamble));
  }
  /** Pictures of characters -> characters. */
  symbolReader() {
    return new SymbolTable();
  }
  /**
   * The ways of reading an equation, tried in order. A subclass adds its own
   * with `[...super.readers(), new Mine()]`. Plain text and scripts, and then
   * the pass, always follow: a reader added here sees every line first.
   */
  readers() {
    return [new TypedMaths(), new SymbolPictures(), new Underline(), new Modulus(), new Roots(), new Fractions(), new Integrals(), new Brackets()];
  }
  /** What a subject changes about a line before it is read (pieces) and after (tidy). */
  rules() {
    return PLAIN_RULES;
  }
  /** The chain: this paper's readers, then text and scripts, then the pass. */
  chain() {
    return new EquationChain(this.symbolReader(), [...this.readers(), new TextAndScripts(), new PassOver()]);
  }
  /** One \examq block -> what it prints. */
  readQuestion(source, setting, chain, images) {
    return new QuestionBuilder(source, setting, chain, this.rules(), images).build();
  }
  /**
   * MCQ or structured. Decided over the whole paper: a figure-only MCQ looks
   * exactly like a one-mark question with a diagram.
   */
  classify(drafts) {
    const real = (o) => o !== null && o.source !== "figure" && o.items.length > 0;
    const mcqPaper = drafts.length > 0 && drafts.every((d) => d.read.parts.length === 0 && d.marks <= 1) && drafts.filter((d) => real(d.read.options)).length >= Math.max(3, drafts.length * 0.5);
    return drafts.map(({ block, marks, read }) => {
      const options = read.parts.length === 0 ? read.options : null;
      const kind = read.parts.length === 0 && marks <= 1 && (real(options) || mcqPaper) ? "mcq" : "structured";
      const topics = splitTopics(block.topicsRaw);
      return {
        number: block.number,
        kind,
        topics,
        topic: topics.join(" \xB7 "),
        marks,
        stem: read.stem,
        parts: read.parts,
        options: kind === "mcq" ? options : null,
        answer: null
      };
    });
  }
  /** What a person saving the paper should look at. */
  check(questions, drafts, passes, rebuilt2) {
    const out = [];
    const byQuestion = /* @__PURE__ */ new Map();
    for (const p of passes) byQuestion.set(p.question, [...byQuestion.get(p.question) ?? [], p]);
    for (const [n, list2] of byQuestion) {
      const reasons = [...new Set(list2.map((p) => p.reason))].join(", ");
      out.push({
        code: "unsupported-layout",
        questionNumber: n,
        message: `Q${n}: ${list2.length} thing${list2.length === 1 ? "" : "s"} could not be read for certain (${reasons}). Check against the paper.`
      });
    }
    const looked = positionedMaths(rebuilt2.filter((n) => !byQuestion.has(n)));
    if (looked) out.push(looked);
    const garbled = detectGarbledText(questions);
    if (garbled) out.push(garbled);
    questions.forEach((q, i) => {
      if (q.kind === "mcq" && q.options?.source === "figure") {
        out.push({ code: "mcq-options-unparseable", questionNumber: q.number, message: `Q${q.number}: options exist only inside the figure image and cannot be extracted.` });
      }
      const sum = drafts[i].read.partMarks;
      if (q.kind === "structured" && q.parts.length > 0 && sum !== q.marks) {
        out.push({ code: "marks-mismatch", questionNumber: q.number, message: `Q${q.number}: \\examq says ${q.marks} marks but the parts sum to ${sum}.` });
      }
    });
    return out;
  }
  /** The answers file, read by the existing mark-scheme and solution readers. */
  attachAnswers(paper) {
    if (!this.source.answers) return paper;
    const merged = mergePaper(paper, parseAnswerPaper(hideMathBreaks(this.source.answers), this.source.images ?? {}));
    return { ...merged, questions: merged.questions.map((q) => ({ ...q, answer: restoreMathBreaks(q.answer) })) };
  }
  remember(paper, passes, rebuilt2) {
    this.result = { warnings: paper.warnings, passes, rebuilt: rebuilt2 };
    return { ...paper, passes };
  }
};

// src/extract/chemistry.ts
var ChemistryExtractor = class extends PaperExtractor {
  subject = "Chemistry";
};

// src/extract/generic.ts
var GenericExtractor = class extends PaperExtractor {
  subject = "Generic";
};

// src/extract/maths.ts
var MathsExtractor = class extends PaperExtractor {
  subject = "Mathematics";
};

// src/extract/physics.ts
var PhysicsExtractor = class extends PaperExtractor {
  subject = "Physics";
};

// src/extract/index.ts
var SUBJECTS = {
  "5054": PhysicsExtractor,
  "5070": ChemistryExtractor,
  "4037": MathsExtractor,
  "4024": MathsExtractor
};
function createExtractor(source) {
  const code = paperOf(source)?.subjectCode ?? "";
  const Class = Object.hasOwn(SUBJECTS, code) ? SUBJECTS[code] : GenericExtractor;
  return new Class(source);
}
function extractPaper(source) {
  return createExtractor(source).extract();
}
export {
  extractPaper,
  flattenQuestion
};
