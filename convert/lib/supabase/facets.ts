/* =====================================================================
   Facets: the distinct values the filters offer, plus the two counts the
   landing page shows.
   ===================================================================== */
import { check, supabase } from "./client";
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
