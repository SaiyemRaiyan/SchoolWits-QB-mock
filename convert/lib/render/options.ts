import type { QuestionContent } from "@/lib/supabase";

import { escapeAttr, escapeHTML } from "./escape";

const FIGURE_NOTE = "The answer options are part of the figure above.";

// `source: "figure"` means the options exist only as pixels in the image, so
// there is nothing to list and an empty option row would read as a bug.
export function renderOptions(options: QuestionContent["options"]): string {
  if (!options) return "";

  const items = Array.isArray(options.items) ? options.items : [];
  if (!items.length) {
    return options.source === "figure"
      ? `<p class="mcq-note"><i>${escapeHTML(FIGURE_NOTE)}</i></p>`
      : "";
  }

  const rows = items
    .map(
      (item) =>
        '<div class="qpart qpart--sub qpart--choice">' +
        `<span class="pmark">${escapeHTML(item.label)}</span>` +
        `<div>${item.content || ""}</div>` +
        "</div>",
    )
    .join("");

  return `<div class="mcq-options" data-source="${escapeAttr(options.source || "")}">${rows}</div>`;
}
