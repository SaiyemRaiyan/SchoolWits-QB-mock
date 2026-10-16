import type { QuestionContent } from "@/lib/supabase";

export type MarkSchemeDisplayRow = {
  part: string;
  answer: string;
  marks: string;
  isBanner: boolean;
};

// Guidance is a 4-column-paper extra (Add Maths, Maths D); Physics has none.
export function toMarkSchemeRows(
  content: QuestionContent | null,
  { showGuidance = false } = {},
): MarkSchemeDisplayRow[] {
  const rows = content?.answer?.markScheme;
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    part: row.banner ? "" : row.ref || "",
    answer: showGuidance && row.guidance
      ? `${row.answer || ""}<div class="ms-guidance">${row.guidance}</div>`
      : row.answer || "",
    marks: row.banner ? "" : markLabel(row),
    isBanner: row.banner === true,
  }));
}

// "B1", "M1", "A2": the letter says how the mark is earned, which is what
// students are taught to read a mark scheme for. The digit is only a fallback.
function markLabel(row: { code?: string; marks?: number | string | null }): string {
  if (row.code) return row.code;
  return String(row.marks == null ? "" : row.marks);
}
