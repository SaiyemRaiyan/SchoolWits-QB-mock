import type { ContentBlock } from "@/lib/supabase";

import { escapeAttr, escapeHTML } from "./escape";

const MISSING_IMAGE_LABEL = "Image not uploaded";

export function renderBlocks(blocks: ContentBlock[] | undefined): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(renderBlock).join("");
}

function renderBlock(block: ContentBlock): string {
  if (!block || !block.type) return "";
  if (block.type === "text") return block.html ? `<p>${block.html}</p>` : "";
  if (block.type === "figure") return renderFigure(block);
  if (block.type === "table") return renderTable(block);
  return "";
}

// A figure with no resolved src is normal: most source papers ship without them.
function renderFigure(block: Extract<ContentBlock, { type: "figure" }>): string {
  const file = (block.file || "").trim();
  const caption = (block.caption || "").trim();
  const src = block.src || "";
  const missing = src ? "" : ' data-missing="1"';

  let out = `<figure class="qfig"${missing}>`;
  out += `<img src="${escapeAttr(src)}" alt="${escapeAttr(caption || file)}">`;
  if (!src) out += `<div class="imgmissing">${MISSING_IMAGE_LABEL}: ${escapeHTML(file)}</div>`;
  if (caption) out += `<figcaption>${caption}</figcaption>`;
  return `${out}</figure>`;
}

/** Tables arrive as finished HTML from the parser; only the class is ours. */
function renderTable(block: Extract<ContentBlock, { type: "table" }>): string {
  const html = block.html || "";
  if (!html) return "";
  return html.includes("class=") ? html : html.replace(/^<table/, '<table class="datatable"');
}
