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

/**
 * The papers that have at least one question on a topic. The landing page
 * hands over a subject and a topic, and offering a paper with none of that
 * topic in it leads to an empty page.
 */
export async function getPaperKeysForTopic(subject: string, topic: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("questions")
    .select("papers!inner(paper_key)")
    .eq("papers.subject", subject)
    .contains("topics", [topic]);
  check(error);
  const rows = (data || []) as unknown as { papers: { paper_key: string } }[];
  return new Set(rows.map((r) => r.papers.paper_key));
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

/**
 * How many filters besides the subject must be set before questions show.
 *
 * A subject alone is 40-odd questions per paper from every year at once,
 * which reads as noise, not a paper. Two more choices (a paper, a session, a
 * year, a topic...) is enough to land on one paper or one topic.
 */
export const MIN_NARROWING = 2;

/** The filters that count toward MIN_NARROWING. A search term counts as one:
    typing a word is a real narrowing, and refusing it would make the search
    box look broken. */
export function narrowingCount(f: SearchFilters): number {
  return [f.paper, f.variant, f.session, f.year, f.topic, (f.text || "").trim()].filter(Boolean)
    .length;
}

/** The single rule for "show questions yet". The search hook and the screen
    both read it, so nothing is fetched while the screen says "keep choosing". */
export function resultsReady(f: SearchFilters): boolean {
  return Boolean(f.subject) && narrowingCount(f) >= MIN_NARROWING;
}

/** What is still missing, in words the empty state can print. */
export function whatIsMissing(f: SearchFilters): { subject: boolean; more: number } {
  return {
    subject: !f.subject,
    more: Math.max(MIN_NARROWING - narrowingCount(f), 0),
  };
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
