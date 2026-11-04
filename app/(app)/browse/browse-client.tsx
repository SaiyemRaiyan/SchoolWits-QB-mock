"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/browse/empty-state";
import { FiltersPanel } from "@/components/browse/filters-panel";
import { FiltersSheet } from "@/components/browse/filters-sheet";
import { PaperDocument } from "@/components/browse/paper-document";
import { QuestionCard } from "@/components/browse/question-card";
import { QuestionPicker } from "@/components/browse/question-picker";
import { EditQuestionDialog } from "@/components/edit/edit-question-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useFullPaper } from "@/hooks/use-full-paper";
import { useQuestionSearch } from "@/hooks/use-question-search";
import { useTopicsForSubject } from "@/hooks/use-topics-for-subject";
import { useUrlState } from "@/hooks/use-url-state";
import type { Question, SearchFilters } from "@/lib/supabase";

export function BrowseClient() {
  // Every filter lives in the query string, so a view is a link: it survives
  // a reload, it can be shared, and back/forward step through it.
  const [params, setParams] = useUrlState();
  const { admin } = useAuth();
  const { groups, facets, subjectNameByCode, failed } = useCatalogue();

  // Which question is on screen stays component state: it is a position in a
  // result set, not something worth putting in a link.
  const [pickedIndex, setPickedIndex] = useState<{ key: string; index: number } | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [edited, setEdited] = useState<Record<string, Question>>({});

  // ?code= is how the landing page hands off a chosen syllabus.
  const code = params.get("code");
  const preset = code ? groups?.flatMap((g) => g.subjects).find((s) => s.code === code) : undefined;

  const defaultQualification =
    groups?.find((g) => g.subjects.some((s) => s.paperCount > 0))?.qualification ?? "";
  const qualification =
    params.get("qual") ?? preset?.qualification ?? defaultQualification;
  const subject =
    params.get("subject") ?? (code ? (subjectNameByCode?.get(code) ?? "") : "");

  const topics = useTopicsForSubject(subject || null);
  const urlTopic = params.get("topic") ?? "";
  // A topic that matches nothing in this subject is dropped rather than
  // filtering everything away, which is how the landing page's hand-off
  // behaves when its topic does not apply.
  const topic = topics.topics.find((t) => t.toLowerCase() === urlTopic.toLowerCase()) ?? "";

  const filters: SearchFilters = {
    subject,
    paper: params.get("paper") ?? "",
    variant: params.get("variant") ?? "",
    session: params.get("session") ?? "",
    year: params.get("year") ?? "",
    topic,
    text: params.get("q") ?? "",
  };

  const search = useQuestionSearch(filters);
  const resultKey = JSON.stringify(filters);
  const activeIndex = pickedIndex?.key === resultKey ? pickedIndex.index : 0;
  const found = search.questions[activeIndex];
  const question = found ? (edited[found.uid] ?? found) : undefined;

  // Offered whenever the results come from one paper, which is usually well
  // before all five fields are set.
  const onePaperKey = useMemo(() => {
    if (!search.questions.length) return null;
    const keys = new Set(search.questions.map((q) => q.paperKey));
    return keys.size === 1 ? (keys.values().next().value as string) : null;
  }, [search.questions]);

  const fullView = params.get("view") === "full" && Boolean(onePaperKey);
  const paper = useFullPaper(fullView ? onePaperKey : null);

  const subjectOptions = useMemo(() => {
    const group = groups?.find((g) => g.qualification === qualification);
    return (group?.subjects ?? [])
      .filter((s) => s.paperCount > 0)
      .map((s) => ({
        value: subjectNameByCode?.get(s.code) ?? "",
        label: `${s.code} · ${s.title}`,
      }))
      .filter((o) => o.value);
  }, [groups, qualification, subjectNameByCode]);

  const panel = (
    <FiltersPanel
      groups={groups ?? []}
      qualification={qualification}
      // Subject options are scoped to the qualification, so the old choice
      // may not exist in the new list.
      onQualification={(next) => setParams({ qual: next, subject: null, code: null })}
      subjectOptions={subjectOptions}
      facets={facets}
      filters={filters}
      // Changing subject rescopes the topic list, so the old topic goes too.
      onChange={(patch) =>
        setParams({ ...patch, ...("subject" in patch ? { topic: null, code: null } : null) })
      }
      topics={topics.topics}
      topicsLoading={topics.loading}
    />
  );

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
            {onePaperKey && (
              <ToggleGroup
                value={[fullView ? "full" : "single"]}
                onValueChange={(next) =>
                  next[0] && setParams({ view: next[0] === "full" ? "full" : null })
                }
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
          ) : fullView ? (
            <PaperDocument
              questions={paper.questions}
              loading={paper.loading}
              matched={search.questions.length}
            />
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
