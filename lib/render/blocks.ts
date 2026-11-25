import type { ContentBlock } from "./types";

import { escapeAttr, escapeHTML } from "./escape";

// What a student sees where a figure has not been uploaded. The file name is
// for the admin, so it lives in a tooltip rather than on the page.
const MISSING_IMAGE_LABEL = "Figure not available";

// "Fig. 2.2", "Figure 3", "Fig. 1.1 (not to scale)": text that only names a figure.
const FIGURE_LABEL = /^(?:fig\.?|figure)\s*\d+(?:\.\d+)*[a-z]?(?:\s*\([^)]*\))?\.?$/i;

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function isFigureLabel(block: ContentBlock | undefined): block is Extract<ContentBlock, { type: "text" }> {
  return block?.type === "text" && Boolean(block.html) && FIGURE_LABEL.test(plainText(block.html!));
}

export function renderBlocks(blocks: ContentBlock[] | undefined): string {
  if (!Array.isArray(blocks)) return "";

  let out = "";
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    // The label under a picture arrives as the next paragraph of text, not as
    // part of the figure. Folding it in is what puts it centred beneath the
    // image instead of left-aligned in the body.
    if (block?.type === "figure" && !block.caption && isFigureLabel(blocks[i + 1])) {
      out += renderFigure({ ...block, caption: (blocks[i + 1] as { html: string }).html });
      i++;
      continue;
    }
    // A label with no picture next to it (a table's title, say) still centres.
    if (isFigureLabel(block)) {
      out += `<p class="fig-label">${block.html}</p>`;
      continue;
    }
    out += renderBlock(block);
  }
  return out;
}

function renderBlock(block: ContentBlock): string {
  if (!block || !block.type) return "";
  if (block.type === "text") return block.html ? renderText(block.html) : "";
  if (block.type === "figure") return renderFigure(block);
  if (block.type === "table") return renderTable(block);
  return "";
}

// A list is not valid inside <p>; the browser would close the paragraph early
// and leave an empty one behind, so list-bearing text gets a <div> instead.
function renderText(html: string): string {
  return /<(ul|ol)[ >]/.test(html) ? `<div class="text-block">${html}</div>` : `<p>${html}</p>`;
}

// A figure with no resolved src is normal: most source papers ship without them.
function renderFigure(block: Extract<ContentBlock, { type: "figure" }>): string {
  const file = (block.file || "").trim();
  const caption = (block.caption || "").trim();
  const src = block.src || "";
  const missing = src ? "" : ' data-missing="1"';

  let out = `<figure class="qfig"${missing}>`;
  out += `<img src="${escapeAttr(src)}" alt="${escapeAttr(plainText(caption) || file)}">`;
  if (!src) {
    const title = file ? ` title="${escapeAttr(file)}"` : "";
    out += `<div class="imgmissing"${title}>${escapeHTML(MISSING_IMAGE_LABEL)}</div>`;
  }
  if (caption) out += `<figcaption>${caption}</figcaption>`;
  return `${out}</figure>`;
}

/** Tables arrive as finished HTML from the parser; only the class is ours. */
function renderTable(block: Extract<ContentBlock, { type: "table" }>): string {
  const html = block.html || "";
  if (!html) return "";
  return html.includes("class=") ? html : html.replace(/^<table/, '<table class="datatable"');
}
