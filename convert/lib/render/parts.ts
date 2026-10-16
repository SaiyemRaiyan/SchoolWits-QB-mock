import type { QuestionPart } from "@/lib/supabase";

import { renderBlocks } from "./blocks";
import { escapeHTML } from "./escape";

// Cycled per part so a multi-part question reads as a colour-coded set.
const PART_ACCENTS = [
  "#2F6FB3",
  "#1D8A5C",
  "#B9762A",
  "#8B4FB0",
  "#C0392B",
  "#1A9E96",
  "#7A6A1E",
  "#4A5568",
];

export function renderParts(parts: QuestionPart[] | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts.map((part, i) => renderPart(part, false, i)).join("");
}

// The parser already decided every label and ref, so nothing here counts or letters.
function renderPart(part: QuestionPart, isSub: boolean, index: number): string {
  if (!part) return "";
  const accent = PART_ACCENTS[index % PART_ACCENTS.length];

  let body = renderBlocks(part.content);
  body += renderMarkTag(part);
  // Subparts nest inside the parent so (c)(i) sits under (c), not beside it.
  if (part.subparts?.length) {
    body += part.subparts.map((sub, i) => renderPart(sub, true, i)).join("");
  }

  return (
    `<div class="${isSub ? "qpart qpart--sub" : "qpart"}" style="--paccent:${accent}">` +
    `<span class="pmark">(${escapeHTML(part.label)})</span>` +
    `<div>${body}</div>` +
    `</div>`
  );
}

// A part that only groups subparts carries their summed marks, so its own
// badge would double-count on screen.
function renderMarkTag(part: QuestionPart): string {
  if (part.subparts?.length || part.marks == null) return "";
  return `<span class="marktag">${escapeHTML(part.marks)}</span>`;
}
