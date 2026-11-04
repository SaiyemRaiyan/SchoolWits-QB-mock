/* =====================================================================
   The paper list: small, read-mostly, and wanted by several independent
   things on one page load (the nav, the Browse filters, the syllabus
   picker, the facet counts). Cached for the lifetime of the page; a
   reload refetches.

   The cache holds the *promise*, not the resolved array. Two components
   mounting in the same tick would both see an empty cache and both fire
   a query if only the value were cached.
   ===================================================================== */
import { check, supabase } from "./client";
import { paperRowToRecord, type Paper } from "./mappers";

let paperCache: Promise<Paper[]> | null = null;

export function getAllPapers(): Promise<Paper[]> {
  if (paperCache) return paperCache;
  paperCache = (async () => {
    const { data, error } = await supabase.from("papers").select("*");
    check(error);
    return (data || []).map(paperRowToRecord);
  })();
  paperCache.catch(() => {
    paperCache = null; // never cache a failure
  });
  return paperCache;
}

/** Cascades: the paper's questions and module links go with it. */
export async function deletePaper(paperKey: string) {
  const { error } = await supabase.from("papers").delete().eq("paper_key", paperKey);
  check(error);
}

/** Dropped by invalidateReferenceData() after any write to papers. */
export function invalidatePaperCache() {
  paperCache = null;
}
