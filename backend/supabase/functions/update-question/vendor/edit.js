/* GENERATED - do not edit. Bundled from backend/src/edit/ by npm run build:edit-function. */

// src/edit/leaves.ts
var BLOCK_KEYS = { text: "html", figure: "caption" };
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function blockLeaves(blocks, basePath, labelPrefix, out) {
  if (!Array.isArray(blocks)) return;
  blocks.forEach((block, i) => {
    if (!isPlainObject(block)) return;
    const type = block.type;
    if (type !== "text" && type !== "figure") return;
    const key = BLOCK_KEYS[type];
    const value = block[key];
    if (typeof value !== "string") return;
    out.push({
      path: [...basePath, i, key],
      label: type === "figure" ? `${labelPrefix} \xB7 figure caption` : `${labelPrefix} \xB7 text`,
      kind: type === "figure" ? "caption" : "text",
      value
    });
  });
}
function partLeaves(parts, basePath, out) {
  if (!Array.isArray(parts)) return;
  parts.forEach((part, i) => {
    if (!isPlainObject(part)) return;
    const ref = typeof part.ref === "string" && part.ref ? part.ref : `part ${i + 1}`;
    blockLeaves(part.content, [...basePath, i, "content"], ref, out);
    partLeaves(part.subparts, [...basePath, i, "subparts"], out);
  });
}
function collectLeaves(content) {
  const out = [];
  if (!isPlainObject(content)) return out;
  blockLeaves(content.stem, ["stem"], "Stem", out);
  partLeaves(content.parts, ["parts"], out);
  const options = content.options;
  if (isPlainObject(options) && Array.isArray(options.items)) {
    options.items.forEach((item, i) => {
      if (!isPlainObject(item)) return;
      if (typeof item.content !== "string") return;
      const label = typeof item.label === "string" ? item.label : String(i + 1);
      out.push({
        path: ["options", "items", i, "content"],
        label: `Option ${label}`,
        kind: "option",
        value: item.content
      });
    });
  }
  const answer = content.answer;
  if (isPlainObject(answer)) {
    if (Array.isArray(answer.markScheme)) {
      answer.markScheme.forEach((row, i) => {
        if (!isPlainObject(row)) return;
        const ref = typeof row.ref === "string" && row.ref ? row.ref : `row ${i + 1}`;
        if (typeof row.answer === "string") {
          out.push({
            path: ["answer", "markScheme", i, "answer"],
            label: `${ref} \xB7 mark scheme`,
            kind: "markscheme",
            value: row.answer
          });
        }
        if (typeof row.code === "string") {
          out.push({
            path: ["answer", "markScheme", i, "code"],
            label: `${ref} \xB7 code`,
            kind: "code",
            value: row.code
          });
        }
        if (typeof row.guidance === "string" || row.guidance === null) {
          out.push({
            path: ["answer", "markScheme", i, "guidance"],
            label: `${ref} \xB7 guidance`,
            kind: "guidance",
            value: row.guidance ?? ""
          });
        }
      });
    }
    if (Array.isArray(answer.workedSolution)) {
      answer.workedSolution.forEach((seg, i) => {
        if (!isPlainObject(seg)) return;
        const ref = typeof seg.ref === "string" && seg.ref ? seg.ref : `segment ${i + 1}`;
        if (typeof seg.heading === "string" || seg.heading === null) {
          out.push({
            path: ["answer", "workedSolution", i, "heading"],
            label: `${ref} \xB7 solution heading`,
            kind: "heading",
            value: seg.heading ?? ""
          });
        }
        if (typeof seg.html === "string") {
          out.push({
            path: ["answer", "workedSolution", i, "html"],
            label: `${ref} \xB7 worked solution`,
            kind: "solution",
            value: seg.html
          });
        }
      });
    }
  }
  return out;
}
var EditError = class extends Error {
};
var MAX_VALUE_LENGTH = 2e4;
function applyEdits(content, edits) {
  if (!Array.isArray(edits)) throw new EditError("edits must be an array.");
  if (edits.length === 0) throw new EditError("No edits supplied.");
  if (edits.length > 500) throw new EditError("Too many edits in one request.");
  const allowed = new Map(collectLeaves(content).map((leaf) => [leaf.path.join("\0"), leaf]));
  const next = structuredClone(content);
  let applied = 0;
  for (const raw of edits) {
    if (!isPlainObject(raw)) throw new EditError("Each edit must be an object.");
    const { path, value } = raw;
    if (!Array.isArray(path)) throw new EditError("Each edit needs a path array.");
    if (typeof value !== "string") throw new EditError("Each edit needs a string value.");
    if (value.length > MAX_VALUE_LENGTH) {
      throw new EditError(`A value exceeds ${MAX_VALUE_LENGTH} characters.`);
    }
    const key = path.join("\0");
    const leaf = allowed.get(key);
    if (!leaf) throw new EditError(`Not an editable field: ${JSON.stringify(path)}`);
    if (value === leaf.value) continue;
    let cursor = next;
    for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
    const last = path[path.length - 1];
    const nullable = leaf.kind === "guidance" || leaf.kind === "heading";
    cursor[last] = nullable && value.trim() === "" ? null : value;
    applied++;
  }
  return { content: next, applied };
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
  return out.join(" ").replace(MATH, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
}
export {
  EditError,
  applyEdits,
  collectLeaves,
  flattenQuestion
};
