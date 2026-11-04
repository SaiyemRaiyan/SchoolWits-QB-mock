import type { QuestionContent } from "./types";

export type MarkSchemeDisplayRow = {
  part: string;
  answer: string;
  marks: string;
  isBanner: boolean;
};

export type MarkSchemeOptions = {
  /** A 4-column-paper extra (Add Maths, Maths D); Physics papers have none. */
  showGuidance?: boolean;
  /**
   * Off by default, and not an oversight: `answer` is the whole authored
   * cell, which already reads "X or Y", while `alternatives` is a split of
   * that same cell. Rendering both prints Y twice. Turn this on only in a
   * view that lists the forms INSTEAD of the raw cell.
   */
  showAlternatives?: boolean;
};

export function toMarkSchemeRows(
  content: QuestionContent | null,
  { showGuidance = false, showAlternatives = false }: MarkSchemeOptions = {},
): MarkSchemeDisplayRow[] {
  const rows = content?.answer?.markScheme;
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    part: row.banner ? "" : row.ref || "",
    answer: answerHtml(row, showGuidance, showAlternatives),
    marks: row.banner ? "" : markLabel(row),
    isBanner: row.banner === true,
  }));
}

/** `alternatives` includes the first form, which is already in `answer`, so
    it is sliced to avoid printing it twice. */
function answerHtml(
  row: { answer?: string; guidance?: string; alternatives?: string[] },
  showGuidance: boolean,
  showAlternatives: boolean,
): string {
  let html = row.answer || "";

  if (showAlternatives && Array.isArray(row.alternatives) && row.alternatives.length > 1) {
    const rest = row.alternatives
      .slice(1)
      .map((alt) => `<li>${alt}</li>`)
      .join("");
    if (rest) html += `<ul class="ms-alternatives">${rest}</ul>`;
  }

  if (showGuidance && row.guidance) html += `<div class="ms-guidance">${row.guidance}</div>`;
  return html;
}

// "B1", "M1", "A2": the letter says how the mark is earned, which is what
// students are taught to read a mark scheme for. The digit is only a fallback.
function markLabel(row: { code?: string; marks?: number | string | null }): string {
  if (row.code) return row.code;
  return String(row.marks == null ? "" : row.marks);
}
