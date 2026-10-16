// The parser leaves raw LaTeX inside `html` fields for KaTeX, so renderer output
// is inserted as-is. Escaping is only for values that came from outside those fields.
export function escapeHTML(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttr(value: unknown): string {
  return escapeHTML(value).replace(/"/g, "&quot;");
}
