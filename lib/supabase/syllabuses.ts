/* =====================================================================
   The subject catalogue: which subjects exist, under which qualification,
   and how many papers each one actually has.

   Joined to papers on `subject_code`, never on the subject NAME:
   papers.subject comes from a folder name at import time ("Add Maths")
   while the catalogue carries the board's own title ("Additional
   Mathematics"). They differ today for 2 of the 5 subjects.
   ===================================================================== */
import { check, supabase } from "./client";
import { getAllPapers } from "./papers";
import type { Paper } from "./mappers";

export type Syllabus = {
  code: string;
  title: string;
  qualification: string;
  board: string;
  sortOrder: number;
  paperCount: number;
};

export type QualificationGroup = {
  qualification: string;
  board: string;
  subjects: Syllabus[];
  paperCount: number;
};

export type Syllabuses = {
  subjects: Syllabus[];
  byQualification: QualificationGroup[];
  /** A subject nobody has uploaded a paper for yet is a dead end in the nav. */
  withPapers: Syllabus[];
};

let syllabusCache: Promise<Syllabuses> | null = null;

export function getSyllabuses(knownPapers?: Paper[]): Promise<Syllabuses> {
  if (syllabusCache) return syllabusCache;
  syllabusCache = buildSyllabuses(knownPapers);
  syllabusCache.catch(() => {
    syllabusCache = null;
  });
  return syllabusCache;
}

/** Dropped by invalidateReferenceData() after any write to papers. */
export function invalidateSyllabusCache() {
  syllabusCache = null;
}

async function buildSyllabuses(knownPapers?: Paper[]): Promise<Syllabuses> {
  const [{ data: rows, error }, papers] = await Promise.all([
    supabase.from("syllabuses").select("*").order("qualification").order("sort_order"),
    // The caller usually has the paper list already (Browse loads it for
    // its filters); refetching it here made three round-trips for the
    // same rows on every page load.
    knownPapers ? Promise.resolve(knownPapers) : getAllPapers(),
  ]);
  check(error);

  const paperCount = new Map<string, number>();
  papers.forEach((p) => {
    if (p.subjectCode) paperCount.set(p.subjectCode, (paperCount.get(p.subjectCode) || 0) + 1);
  });

  const subjects: Syllabus[] = (rows || []).map((r) => ({
    code: r.code,
    title: r.title,
    qualification: r.qualification,
    board: r.board,
    sortOrder: r.sort_order,
    paperCount: paperCount.get(r.code) || 0,
  }));

  // Preserve the order the query returned rather than re-sorting by name:
  // sort_order is editable data, and that is the point of the table.
  const byQualification: QualificationGroup[] = [];
  subjects.forEach((s) => {
    let group = byQualification.find((g) => g.qualification === s.qualification);
    if (!group) {
      group = { qualification: s.qualification, board: s.board, subjects: [], paperCount: 0 };
      byQualification.push(group);
    }
    group.subjects.push(s);
  });

  // Qualifications that actually have papers come first, then alphabetical.
  // Plain alphabetical put "IGCSE" (0 papers) ahead of "O Level" (9), so
  // the picker opened on an empty branch.
  byQualification.forEach((g) => {
    g.paperCount = g.subjects.reduce((n, x) => n + x.paperCount, 0);
  });
  byQualification.sort(
    (a, b) =>
      Number(b.paperCount > 0) - Number(a.paperCount > 0) ||
      a.qualification.localeCompare(b.qualification),
  );

  return {
    subjects,
    byQualification,
    withPapers: subjects.filter((s) => s.paperCount > 0),
  };
}
