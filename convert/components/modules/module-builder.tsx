"use client";

import { useMemo, useState } from "react";

import { FilterSelect } from "@/components/browse/filter-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuestionPool } from "@/hooks/use-question-pool";
import {
  addModuleQuestion,
  getModule,
  getModuleQuestions,
  paperLabel,
  saveModule,
  type Module,
  type Question,
} from "@/lib/supabase";

import { EditQuestionDialog } from "@/components/edit/edit-question-dialog";

import { QuestionPreview } from "./question-preview";
import { BuiltModulesList } from "./builder/built-modules-list";
import { ModuleForm, type ModuleDraft } from "./builder/module-form";
import { QuestionPickList } from "./builder/question-pick-list";
import { TopicPills } from "./builder/topic-pills";
import { Step } from "@/components/common/step";

const EMPTY_DRAFT: ModuleDraft = { title: "", description: "", premium: true, price: 199 };

type ModuleBuilderProps = { modules: Module[]; onSaved: () => void; onDelete: (id: number) => void };

export function ModuleBuilder({ modules, onSaved, onDelete }: ModuleBuilderProps) {
  const pool = useQuestionPool();
  const [pickedSubject, setPickedSubject] = useState<string | null>(null);
  const [paperKey, setPaperKey] = useState("");
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excludedTopics, setExcludedTopics] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ModuleDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  // uids whose copy in this module has been edited, so rows can be marked.
  const [overridden, setOverridden] = useState<Set<string>>(new Set());

  const subjects = useMemo(
    () => Array.from(new Set(pool.questions.map((q) => q.subject))).sort(),
    [pool.questions],
  );
  const subject = pickedSubject ?? subjects[0] ?? "";
  const subjectQuestions = useMemo(
    () => pool.questions.filter((q) => q.subject === subject),
    [pool.questions, subject],
  );

  // A question with three topics counts toward all three, so this is a tally
  // rather than a groupBy.
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    subjectQuestions.forEach((q) => q.topics.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return counts;
  }, [subjectQuestions]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return subjectQuestions
      .filter((q) => !paperKey || q.paperKey === paperKey)
      .filter((q) => !activeTopics.size || q.topics.some((t) => activeTopics.has(t)))
      .filter(
        (q) =>
          !needle ||
          `${q.topic} ${q.ref ?? ""} ${q.qText ?? ""}`.toLowerCase().includes(needle),
      )
      .sort((a, b) => (a.paperKey === b.paperKey ? a.id - b.id : a.paperKey.localeCompare(b.paperKey)));
  }, [subjectQuestions, paperKey, activeTopics, search]);

  const pickedQuestions = useMemo(() => {
    const byUid = new Map(pool.questions.map((q) => [q.uid, q]));
    return Array.from(selected)
      .map((uid) => byUid.get(uid))
      .filter(Boolean) as Question[];
  }, [pool.questions, selected]);

  // Derived from the picked questions, not typed: a free-text box let a
  // "Vectors" pack quietly fill up with Kinematics.
  const derivedTopics = useMemo(
    () => Array.from(new Set(pickedQuestions.flatMap((q) => q.topics))).sort(),
    [pickedQuestions],
  );

  const paperOptions = useMemo(
    () =>
      pool.papers
        .filter((p) => p.subject === subject)
        .sort((a, b) => b.year - a.year || String(a.paper).localeCompare(String(b.paper)))
        .map((p) => ({ value: p.paperKey, label: paperLabel(p) })),
    [pool.papers, subject],
  );

  function changeSubject(next: string) {
    // Topics and papers are subject-specific, so a stale choice here would
    // silently filter everything out.
    setPickedSubject(next);
    setPaperKey("");
    setActiveTopics(new Set());
  }

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function handleSave(): Promise<number | null> {
    if (!draft.title.trim()) {
      setStatus({ kind: "error", message: "Give the module a title first." });
      return null;
    }
    if (!pickedQuestions.length) {
      setStatus({ kind: "error", message: "Select at least one question." });
      return null;
    }
    // The subject comes from the questions, not the filter: the dropdown is
    // where picking started, and a stale value there would mislabel the pack.
    const subjects = Array.from(new Set(pickedQuestions.map((q) => q.subject)));
    if (subjects.length > 1) {
      setStatus({
        kind: "error",
        message: `This pack mixes ${subjects.join(" and ")}. A module covers one subject.`,
      });
      return null;
    }

    setSaving(true);
    try {
      const id = await saveModule({
        id: editingId,
        title: draft.title.trim(),
        subject: subjects[0],
        topics: derivedTopics.filter((t) => !excludedTopics.has(t)),
        description: draft.description.trim(),
        premium: draft.premium,
        price: draft.price,
        questionUids: Array.from(selected),
      });
      setEditingId(id);
      setStatus({ kind: "ok", message: "Saved. Visible on the Storefront tab." });
      onSaved();
      return id;
    } catch (err) {
      setStatus({ kind: "error", message: `Could not save: ${(err as Error).message}` });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function openForEditing(id: number) {
    const [mod, questions] = await Promise.all([getModule(id), getModuleQuestions(id)]);
    if (!mod) return;

    // An edited copy lives on the module, so the builder shows the module's
    // version of a question rather than the bank's.
    questions.forEach((q) => pool.replace(q));

    setEditingId(mod.id);
    setSelected(new Set(questions.map((q) => q.uid)));
    setOverridden(new Set(questions.filter((q) => q.hasOverride).map((q) => q.uid)));
    setPickedSubject(mod.subject || subject);
    setDraft({
      title: mod.title,
      description: mod.description,
      premium: mod.premium,
      price: mod.price,
    });
    const all = Array.from(new Set(questions.flatMap((q) => q.topics)));
    setExcludedTopics(new Set(all.filter((t) => !mod.topics.includes(t))));
    setStatus({ kind: "ok", message: `Editing "${mod.title}". Saving updates it.` });
  }

  function startNew() {
    setEditingId(null);
    setSelected(new Set());
    setExcludedTopics(new Set());
    setOverridden(new Set());
    setDraft(EMPTY_DRAFT);
    setStatus(null);
  }

  /**
   * An edit hangs off (module_id, question_id), so the pack has to exist and
   * the question has to be linked. Rather than making the admin save first
   * and come back, both happen here and they carry on.
   */
  async function openEditor(q: Question) {
    let id = editingId;
    if (!id) {
      id = await handleSave();
      if (!id) return;
    }
    // Ticking it is the only reading of "edit this for the pack" that works.
    if (!selected.has(q.uid)) setSelected((prev) => new Set(prev).add(q.uid));
    try {
      await addModuleQuestion(id, q.pk, Array.from(selected).indexOf(q.uid));
    } catch (err) {
      setStatus({ kind: "error", message: `Could not add Q${q.id}: ${(err as Error).message}` });
      return;
    }
    setEditing(q);
  }

  const totalMarks = pickedQuestions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
  const paperCount = new Set(pickedQuestions.map((q) => q.paperKey)).size;

  return (
    <div className="grid gap-5">
      <Step number={1} title="Choose a subject" hint="A module covers one subject, and everything below narrows to it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterSelect
            id="b-subject"
            label="Subject"
            value={subject}
            options={subjects.map((s) => ({ value: s, label: s }))}
            onChange={changeSubject}
            anyLabel="Any subject"
            disabled={pool.loading}
          />
          <FilterSelect
            id="b-paper"
            label="Paper"
            value={paperKey}
            options={paperOptions}
            onChange={setPaperKey}
            anyLabel="Any paper"
            disabled={pool.loading}
          />
        </div>
      </Step>

      <Step
        number={2}
        title="Narrow by topic"
        hint="Pick as many as you like. Your ticked questions are kept when you change these."
      >
        <TopicPills
          counts={topicCounts}
          total={subjectQuestions.length}
          active={activeTopics}
          onToggle={(t) => setActiveTopics((prev) => toggle(prev, t))}
          onClear={() => setActiveTopics(new Set())}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search within results…"
          className="mt-3 max-w-sm"
        />
      </Step>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Step number={3} title="Select questions" hint={summarise(pickedQuestions.length, totalMarks, paperCount, derivedTopics.length)}>
          <QuestionPickList
            questions={visible}
            selected={selected}
            overridden={overridden}
            onToggle={(uid) => setSelected((prev) => toggle(prev, uid))}
            onView={setPreview}
            onEdit={(q) => void openEditor(q)}
          />
        </Step>

        <Step number={4} title="Package & price">
          <ModuleForm
            draft={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            topics={derivedTopics}
            excluded={excludedTopics}
            onToggleTopic={(t) => setExcludedTopics((prev) => toggle(prev, t))}
            onSave={handleSave}
            saving={saving}
            status={status}
          />
          {editingId && (
            <Button variant="ghost" size="sm" onClick={startNew} className="mt-2 w-full">
              Start a new module
            </Button>
          )}
        </Step>
      </div>

      <Step title="Modules you've built">
        <BuiltModulesList
          modules={modules}
          editingId={editingId}
          onEdit={(id) => void openForEditing(id)}
          onDelete={onDelete}
        />
      </Step>

      <EditQuestionDialog
        question={editing}
        moduleId={editingId}
        onClose={() => setEditing(null)}
        onSaved={(content, info) => {
          if (!editing) return;
          // Keep the builder's copy in step so View shows the edit at once.
          pool.replace({ ...editing, content });
          setOverridden((prev) => {
            const next = new Set(prev);
            if (info.edited) next.add(editing.uid);
            else next.delete(editing.uid);
            return next;
          });
        }}
        onVideoSaved={(updated) => pool.replace(updated)}
      />

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Question preview</DialogTitle>
          </DialogHeader>
          {preview && <QuestionPreview question={preview} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function summarise(picked: number, marks: number, papers: number, topics: number): string {
  if (!picked) return "Nothing picked yet.";
  return `${picked} selected · ${marks} marks · ${papers} paper${papers === 1 ? "" : "s"} · ${topics} topic${topics === 1 ? "" : "s"}`;
}
