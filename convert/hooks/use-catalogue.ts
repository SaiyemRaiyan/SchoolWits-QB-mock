"use client";

import { useEffect, useState } from "react";

import {
  getAllPapers,
  getFacets,
  getSyllabuses,
  type Facets,
  type QualificationGroup,
} from "@/lib/supabase";

export type Catalogue = {
  groups: QualificationGroup[] | null;
  facets: Facets | null;
  /** syllabus code -> papers.subject name; the two are not the same string. */
  subjectNameByCode: Map<string, string> | null;
  failed: boolean;
};

/** Papers, facets and the subject catalogue: everything a page needs before it
    can offer a filter. Loaded once on mount; the data layer caches below this. */
export function useCatalogue(): Catalogue {
  const [state, setState] = useState<Omit<Catalogue, "failed">>({
    groups: null,
    facets: null,
    subjectNameByCode: null,
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [papers, facets] = await Promise.all([getAllPapers(), getFacets()]);
      // Passing the papers in stops getSyllabuses refetching the same rows.
      const { byQualification } = await getSyllabuses(papers);
      if (!alive) return;

      const names = new Map<string, string>();
      papers.forEach((p) => p.subjectCode && names.set(p.subjectCode, p.subject));
      setState({ groups: byQualification, facets, subjectNameByCode: names });
    })().catch((err) => {
      if (!alive) return;
      console.error("Could not load the subject catalogue:", err);
      setFailed(true);
    });

    return () => {
      alive = false;
    };
  }, []);

  return { ...state, failed };
}
