/* =====================================================================
   Facets: the distinct values the filters offer, plus the two counts the
   landing page shows.
   ===================================================================== */
import { check, supabase } from "./client";
import type { Paper } from "./mappers";
import { getAllPapers } from "./papers";

export type Facets = {
  subjects: string[];
  papers: string[];
  variants: string[];
  sessions: string[];
  years: number[];
  topics: string[];
  paperCount: number;
  questionCount: number;
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

export async function getFacets(): Promise<Facets> {
  // Only the columns the facets need. Selecting `content` as well (the
  // whole parsed question) just to count rows and union topics pulled
  // megabytes per page load. The two queries also run in parallel;
  // `[await a, await b]` ran them one after the other.
  const [topicRes, papers] = await Promise.all([
    supabase.from("questions").select("topics"),
    getAllPapers(),
  ]);
  check(topicRes.error);
  const qs = topicRes.data || [];
  return {
    subjects: uniq(papers.map((p) => p.subject)),
    papers: uniq(papers.map((p) => p.paper)),
    variants: uniq(papers.map((p) => p.variant)),
    sessions: uniq(papers.map((p) => p.session)),
    years: uniq(papers.map((p) => p.year)).sort((a, b) => b - a),
    // A question carries several topics, so the facet is the union across
    // all of them rather than one value each.
    topics: uniq(qs.flatMap((q) => q.topics || [])),
    paperCount: papers.length,
    questionCount: qs.length,
  };
}

/**
 * Topic facet scoped to one subject, for the landing page's Topic picker:
 * choosing Physics must not also offer Chemistry's topics. Deliberately
 * its own lightweight query rather than filtering getFacets()' global
 * list, which has no idea which subject each topic came from.
 */
export async function getTopicsForSubject(subject: string): Promise<string[]> {
  if (!subject) return [];
  const { data, error } = await supabase
    .from("questions")
    .select("topics, papers!inner(subject)")
    .eq("papers.subject", subject);
  check(error);
  return uniq((data || []).flatMap((q) => q.topics || []));
}

/** The filters that pick out a paper, as the URL carries them. */
export type PaperFilters = {
  subject?: string;
  paper?: string;
  variant?: string;
  session?: string;
  year?: string;
};

export type ScopedFacets = {
  papers: string[];
  variants: string[];
  sessions: string[];
  years: string[];
  /** How many papers satisfy every filter at once. Zero means a dead end. */
  matching: number;
};

const FIELDS = ["subject", "paper", "variant", "session", "year"] as const;

/**
 * Faceted cascade: the options for each filter are the values that exist on
 * papers matching every OTHER filter. Offering the bank-wide list instead let
 * you choose "Physics, variant 3" and land on an empty page, because nothing
 * of the kind exists. A filter never narrows its own list, so changing your
 * mind about one choice never needs a reset first.
 *
 * The value currently selected is always kept in its own list, so a
 * combination that has become impossible still shows what is blocking it.
 */
export function scopeFacets(papers: Paper[], f: PaperFilters): ScopedFacets {
  const matches = (p: Paper, skip?: (typeof FIELDS)[number]) =>
    FIELDS.every((key) => key === skip || !f[key] || String(p[key]) === f[key]);

  const values = (field: "paper" | "variant" | "session" | "year") => {
    const set = new Set(papers.filter((p) => matches(p, field)).map((p) => String(p[field])));
    if (f[field]) set.add(f[field]!);
    return [...set].filter(Boolean);
  };

  const byValue = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  return {
    papers: values("paper").sort(byValue),
    variants: values("variant").sort(byValue),
    sessions: values("session").sort(byValue),
    years: values("year").sort((a, b) => Number(b) - Number(a)),
    matching: papers.filter((p) => matches(p)).length,
  };
}
