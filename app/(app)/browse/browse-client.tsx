"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/browse/empty-state";
import { EditQuestionDialog } from "@/components/edit/edit-question-dialog";
import { FiltersPanel } from "@/components/browse/filters-panel";
import { FiltersSheet } from "@/components/browse/filters-sheet";
import { PaperDocument } from "@/components/browse/paper-document";
import { QuestionCard } from "@/components/browse/question-card";
import { QuestionPicker } from "@/components/browse/question-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppSearch } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useQueryParams } from "@/hooks/use-query-params";
import { useQuestionSearch } from "@/hooks/use-question-search";
import { useTopicsForSubject } from "@/hooks/use-topics-for-subject";
import { activePaperKey, type Question, type SearchFilters } from "@/lib/supabase";

/** Anything the user has explicitly chosen. Unset fields fall back to the
    deep link or the default, so nothing has to be copied into state up front. */
type Picked = Partial<SearchFilters & { qualification: string }>;

export function BrowseClient() {
  const params = useQueryParams();
  const headerSearch = useAppSearch();
  const { admin } = useAuth();
  const [editing, setEditing] = useState<Question | null>(null);
  // Edits are applied to the in-memory copy so paging away and back does not
  // show the text from before the edit.
  const [edited, setEdited] = useState<Record<string, Question>>({});
  const { groups, facets, subjectNameByCode, failed } = useCatalogue();
  const [picked, setPicked] = useState<Picked>({});
  const [viewMode, setViewMode] = useState("single");
  const [pickedIndex, setPickedIndex] = useState<{ key: string; index: number } | null>(null);

  // ?code= and ?topic= are how the landing page hands off a chosen syllabus.
  const code = params.get("code");
  const preset = code ? groups?.flatMap((g) => g.subjects).find((s) => s.code === code) : undefined;

  const defaultQualification =
    groups?.find((g) => g.subjects.some((s) => s.paperCount > 0))?.qualification ?? "";
  const qualification = picked.qualification ?? preset?.qualification ?? defaultQualification;
  const subject = picked.subject ?? (code ? (subjectNameByCode?.get(code) ?? "") : "");

  const topics = useTopicsForSubject(subject || null);
  const urlTopic = params.get("topic") ?? "";
  const presetTopic = topics.topics.find((t) => t.toLowerCase() === urlTopic.toLowerCase()) ?? "";

  const filters: SearchFilters = {
    subject,
    paper: picked.paper ?? "",
    variant: picked.variant ?? "",
    session: picked.session ?? "",
    year: picked.year ?? "",
    topic: picked.topic ?? presetTopic,
    text: headerSearch.value,
  };

  const search = useQuestionSearch(filters);
  const resultKey = JSON.stringify(filters);
  const activeIndex = pickedIndex?.key === resultKey ? pickedIndex.index : 0;
  const found = search.questions[activeIndex];
  const question = found ? (edited[found.uid] ?? found) : undefined;

  const subjectOptions = useMemo(() => {
    const group = groups?.find((g) => g.qualification === qualification);
    return (group?.subjects ?? [])
      .filter((s) => s.paperCount > 0)
      .map((s) => ({ value: subjectNameByCode?.get(s.code) ?? "", label: `${s.code} · ${s.title}` }))
      .filter((o) => o.value);
  }, [groups, qualification, subjectNameByCode]);

  const panel = (
    <FiltersPanel
      groups={groups ?? []}
      qualification={qualification}
      // Subject options are scoped to the qualification, so the old choice may
      // not exist in the new list.
      onQualification={(next) => setPicked((p) => ({ ...p, qualification: next, subject: "" }))}
      subjectOptions={subjectOptions}
      facets={facets}
      filters={filters}
      // Changing subject rescopes the topic list, so the old topic goes too.
      onChange={(patch) =>
        setPicked((p) => ({ ...p, ...patch, ...("subject" in patch ? { topic: "" } : null) }))
      }
      topics={topics.topics}
      topicsLoading={topics.loading}
    />
  );

  const paperKey = activePaperKey(filters);
  const showFullPaper = viewMode === "full" && paperKey;

  return (
    <div className="flex flex-1 items-start">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r bg-background lg:block">
          {panel}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FiltersSheet>{panel}</FiltersSheet>
                <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                  {describe(filters)}
                </p>
              </div>
              {paperKey && (
                <ToggleGroup
                  value={[viewMode]}
                  onValueChange={(next) => next[0] && setViewMode(next[0])}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="single">Question-by-question</ToggleGroupItem>
                  <ToggleGroupItem value="full">Full paper view</ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>

            {failed ? (
              <EmptyState title="Could not load the question bank">
                Please refresh the page. If this keeps happening the database may be unreachable.
              </EmptyState>
            ) : !search.active ? (
              <EmptyState title="Choose a subject">
                Pick a qualification and subject in the filters to load its questions.
              </EmptyState>
            ) : search.loading ? (
              <EmptyState title="Searching…">Loading questions that match your filters.</EmptyState>
            ) : !search.questions.length ? (
              <EmptyState title="No questions match those filters">
                Try widening a filter or clearing the search box.
              </EmptyState>
            ) : showFullPaper ? (
              // The filters already name one paper, so the results are that
              // paper and no second query is needed.
              <PaperDocument questions={search.questions} />
            ) : (
              <>
                <QuestionPicker
                  questions={search.questions}
                  activeIndex={activeIndex}
                  onSelect={(index) => setPickedIndex({ key: resultKey, index })}
                />
                {question && (
                  <QuestionCard
                    question={question}
                    hasPrev={activeIndex > 0}
                    hasNext={activeIndex < search.questions.length - 1}
                    onPrev={() => setPickedIndex({ key: resultKey, index: activeIndex - 1 })}
                    onNext={() => setPickedIndex({ key: resultKey, index: activeIndex + 1 })}
                    onEdit={admin ? () => setEditing(question) : undefined}
                  />
                )}
              </>
            )}

            <footer className="pt-2 text-center font-mono text-[11px] text-muted-foreground">
              School Wits &middot; Every result traces back to a .tex file you uploaded, nothing is
              invented
            </footer>
          </div>
      </main>

      <EditQuestionDialog
        question={editing}
        onClose={() => setEditing(null)}
        onSaved={(content) =>
          editing && setEdited((prev) => ({ ...prev, [editing.uid]: { ...editing, content } }))
        }
        onVideoSaved={(updated) => setEdited((prev) => ({ ...prev, [updated.uid]: updated }))}
      />
    </div>
  );
}

function describe(filters: SearchFilters): string {
  const bits = [
    filters.subject,
    filters.paper && `Paper ${filters.paper}`,
    filters.variant && `Var. ${filters.variant}`,
    filters.session,
    filters.year,
    filters.topic,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "All uploaded papers";
}
