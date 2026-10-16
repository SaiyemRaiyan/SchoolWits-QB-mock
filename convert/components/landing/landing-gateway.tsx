"use client";

import { useEffect, useState } from "react";

import {
  getAllPapers,
  getFacets,
  getSyllabuses,
  type Facets,
  type QualificationGroup,
} from "@/lib/supabase";

import { LandingStats } from "./landing-stats";
import { SubjectPicker } from "./subject-picker";

/**
 * The one place the landing page talks to the database.
 *
 * The picker and the stat strip both need the paper list, so they are
 * loaded here once and passed down rather than fetched twice. Client-side
 * on mount, deliberately: the whole app is meant to build as a static
 * export, so no page may depend on a server at request time.
 */
export function LandingGateway() {
  const [groups, setGroups] = useState<QualificationGroup[] | null>(null);
  const [subjectNameByCode, setSubjectNameByCode] = useState<Map<string, string> | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [papers, loadedFacets] = await Promise.all([getAllPapers(), getFacets()]);
        // Passing the papers in stops getSyllabuses from fetching the
        // same rows a second time.
        const { byQualification } = await getSyllabuses(papers);
        if (!alive) return;

        const names = new Map<string, string>();
        papers.forEach((p) => {
          if (p.subjectCode) names.set(p.subjectCode, p.subject);
        });

        setGroups(byQualification);
        setSubjectNameByCode(names);
        setFacets(loadedFacets);
      } catch (err) {
        if (!alive) return;
        console.error("Landing: could not load syllabuses:", err);
        setLoadFailed(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <SubjectPicker
        groups={groups}
        subjectNameByCode={subjectNameByCode}
        loadFailed={loadFailed}
      />
      <LandingStats facets={facets} />
    </>
  );
}
