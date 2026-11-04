import { check, supabase } from "./client";
import { questionRowToRecord, type Question } from "./mappers";

export type SearchFilters = {
  subject?: string;
  paper?: string;
  variant?: string;
  session?: string;
  year?: string;
  topic?: string;
  text?: string;
};

/** Filtering runs in Postgres; the generated search_vector holds the flattened text. */
export async function searchQuestions(filters: SearchFilters = {}): Promise<Question[]> {
  let query = supabase.from("questions").select("*, papers!inner(*)");

  if (filters.subject) query = query.eq("papers.subject", filters.subject);
  if (filters.paper) query = query.eq("papers.paper", String(filters.paper));
  if (filters.variant) query = query.eq("papers.variant", String(filters.variant));
  if (filters.session) query = query.eq("papers.session", filters.session);
  if (filters.year) query = query.eq("papers.year", String(filters.year));
  // `contains` hits the GIN index on topics[]; one matching topic is enough.
  if (filters.topic) query = query.contains("topics", [filters.topic]);

  const needle = (filters.text || "").trim();
  if (needle) {
    // 'simple' must match the config the column was generated with.
    query = query.textSearch("search_vector", needle, { config: "simple", type: "websearch" });
  }

  const { data, error } = await query;
  check(error);
  return (data || [])
    .map((row) => questionRowToRecord(row, row.papers))
    .sort((a, b) => (a.paperKey === b.paperKey ? a.id - b.id : a.paperKey.localeCompare(b.paperKey)));
}

/** Every question with its content. The module builder filters client-side,
    so it needs the whole pool rather than one query per filter change. */
export async function getAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase.from("questions").select("*, papers(*)");
  check(error);
  return (data || []).map((row) => questionRowToRecord(row, row.papers));
}

export async function getQuestionsByPaperKey(paperKey: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, papers!inner(*)")
    .eq("papers.paper_key", paperKey);
  check(error);
  return (data || []).map((row) => questionRowToRecord(row, row.papers)).sort((a, b) => a.id - b.id);
}

/** True once the user has narrowed to something worth fetching. */
export function hasAnyFilter(f: SearchFilters): boolean {
  return Boolean(
    f.subject || f.paper || f.variant || f.session || f.year || f.topic || (f.text || "").trim(),
  );
}

/** A fully specified paper, which is what unlocks the full-paper view. */
export function activePaperKey(f: SearchFilters): string | null {
  if (f.subject && f.paper && f.variant && f.session && f.year) {
    return paperKeyOf(f as Required<SearchFilters>);
  }
  return null;
}

export function paperKeyOf(p: {
  subject: string;
  paper: string;
  variant: string;
  session: string;
  year: string | number;
}): string {
  return [slug(p.subject), p.paper, p.variant, slug(p.session), p.year].join("|");
}

export function paperLabel(p: {
  subjectCode?: string;
  paper: string;
  variant: string;
  session: string;
  year: string | number;
}): string {
  return `${p.subjectCode ? p.subjectCode + "/" : ""}${p.paper}${p.variant}/${p.session}/${String(p.year).slice(-2)}`;
}

function slug(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
