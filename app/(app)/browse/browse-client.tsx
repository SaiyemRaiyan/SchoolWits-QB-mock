"use client";

import { Layers, ListOrdered, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/browse/empty-state";
import { FiltersPanel } from "@/components/browse/filters-panel";
import { FiltersSheet } from "@/components/browse/filters-sheet";
import { PaperDocument } from "@/components/browse/paper-document";
import { PaperFinder } from "@/components/browse/paper-finder";
import { QuestionCard } from "@/components/browse/question-card";
import { QuestionPicker } from "@/components/browse/question-picker";
import { EditQuestionDialog } from "@/components/edit/edit-question-dialog";
import { ModeTabs } from "@/components/browse/mode-tabs";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useFullPaper } from "@/hooks/use-full-paper";
import { useQuestionSearch } from "@/hooks/use-question-search";
import { useTopicPapers } from "@/hooks/use-topic-papers";
import { useTopicsForSubject } from "@/hooks/use-topics-for-subject";
import { useUrlState } from "@/hooks/use-url-state";
import { scopeFacets, type Question, type SearchFilters } from "@/lib/supabase";

export function BrowseClient() {
  // Every filter lives in the query string, so a view is a link: it survives
  // a reload, it can be shared, and back/forward step through it.
  const [params, setParams] = useUrlState();
  const { admin } = useAuth();
  const { papers, groups, facets, subjectNameByCode, failed } = useCatalogue();

  // Which question is on screen stays component state: it is a position in a
  // result set, not something worth putting in a link.
  const [pickedIndex, setPickedIndex] = useState<{ key: string; index: number } | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  // On a wide screen the rail can be folded away, to give the paper the width.
  const [railOpen, setRailOpen] = useState(true);
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

  // Paper, variant, session and year only offer values that exist for the
  // other choices, so no combination of dropdowns can reach an empty page.
  const { paper: fPaper, variant: fVariant, session: fSession, year: fYear } = filters;
  const scoped = useMemo(
    () =>
      scopeFacets(papers ?? [], {
        subject,
        paper: fPaper,
        variant: fVariant,
        session: fSession,
        year: fYear,
      }),
    [papers, subject, fPaper, fVariant, fSession, fYear],
  );

  const search = useQuestionSearch(filters);
  // The shelf shown before results open only offers papers that have the topic.
  const topicPapers = useTopicPapers(
    !search.active && subject && topic ? { subject, topic } : null,
  );
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

  const resetFilters = () =>
    setParams({
      subject: null,
      paper: null,
      variant: null,
      session: null,
      year: null,
      topic: null,
      code: null,
      q: null,
      view: null,
    });

  // Left and right arrows step through the questions, unless the reader is
  // typing in a field or a dialog has the keyboard.
  const stepBy = (delta: number) =>
    setPickedIndex({
      key: resultKey,
      index: Math.min(Math.max(activeIndex + delta, 0), Math.max(search.questions.length - 1, 0)),
    });
  useEffect(() => {
    if (fullView || editing) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable], [role=tab], [role=combobox]")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") stepBy(1);
      else if (e.key === "ArrowLeft") stepBy(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullView, editing, activeIndex, search.questions.length, resultKey]);

  const panel = (
    <FiltersPanel
      groups={groups ?? []}
      qualification={qualification}
      // Subject options are scoped to the qualification, so the old choice
      // may not exist in the new list.
      onQualification={(next) => setParams({ qual: next, subject: null, code: null })}
      subjectOptions={subjectOptions}
      facets={facets}
      scoped={scoped}
      onReset={resetFilters}
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
      {railOpen && (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-[#07111f]/55 backdrop-blur-md xl:block 2xl:w-80">
          {panel}
        </aside>
      )}

      <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 md:py-6 xl:px-8">
        <div className="mx-auto grid w-full max-w-[1800px] grid-cols-[minmax(0,1fr)] gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiltersSheet>{panel}</FiltersSheet>
              <button
                type="button"
                onClick={() => setRailOpen((open) => !open)}
                aria-pressed={!railOpen}
                className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur transition-colors hover:bg-white/20 xl:inline-flex"
              >
                {railOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
                {railOpen ? "Hide filters" : "Show filters"}
              </button>
              <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[11px] tracking-wider text-[var(--sw-brass-light)] uppercase backdrop-blur">
                {describe(filters)}
              </p>
            </div>
            {onePaperKey && (
              <ModeTabs
                modes={[
                  { value: "single", label: "Question by question", tone: "q", icon: <ListOrdered className="size-4" /> },
                  { value: "full", label: "Full paper", tone: "q", icon: <Layers className="size-4" /> },
                ]}
                value={fullView ? "full" : "single"}
                onChange={(next) => setParams({ view: next === "full" ? "full" : null })}
                panelId="browse-results"
                label="How to read the paper"
              />
            )}
          </div>

          <div id="browse-results" className="contents">
          {failed ? (
            <EmptyState title="Could not load the question bank">
              Please refresh the page. If this keeps happening the database may be unreachable.
            </EmptyState>
          ) : !search.active ? (
            <PaperFinder
              filters={filters}
              papers={papers}
              topicPapers={topicPapers}
              subjectOptions={subjectOptions}
              onPickSubject={(next) => setParams({ subject: next, topic: null, code: null })}
              onPickPaper={(p) =>
                setParams({
                  paper: p.paper,
                  variant: p.variant,
                  session: p.session,
                  year: String(p.year),
                })
              }
            />
          ) : search.loading ? (
            <div className="grid gap-4" aria-busy="true" aria-live="polite">
              <div className="sw-skeleton sw-skeleton-dark h-24" />
              <div className="sw-skeleton sw-skeleton-dark h-80" />
              <span className="sr-only">Loading questions that match your filters.</span>
            </div>
          ) : !search.questions.length ? (
            <EmptyState title="No questions match those filters">
              Take away the last thing you added, or start again.
              <span className="mt-4 flex flex-wrap justify-center gap-2">
                {filters.text && (
                  <button type="button" onClick={() => setParams({ q: null })} className={EMPTY_ACTION}>
                    Clear the search
                  </button>
                )}
                {filters.topic && (
                  <button type="button" onClick={() => setParams({ topic: null })} className={EMPTY_ACTION}>
                    Clear the topic
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full bg-[var(--sw-ink)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--sw-ink-soft)]"
                >
                  Reset everything
                </button>
              </span>
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
                  position={{ index: activeIndex, total: search.questions.length }}
                  hasPrev={activeIndex > 0}
                  hasNext={activeIndex < search.questions.length - 1}
                  onPrev={() => setPickedIndex({ key: resultKey, index: activeIndex - 1 })}
                  onNext={() => setPickedIndex({ key: resultKey, index: activeIndex + 1 })}
                  onEdit={admin ? () => setEditing(question) : undefined}
                />
              )}
            </>
          )}
          </div>

          <footer className="pt-2 text-center font-mono text-[11px] text-white/45">
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

const EMPTY_ACTION =
  "rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-[var(--sw-brass)]";

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
