"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTopicsForSubject } from "@/hooks/use-topics-for-subject";
import type { QualificationGroup } from "@/lib/supabase";

import { TopicCombobox } from "./topic-combobox";

type SubjectPickerProps = {
  /** null while the catalogue is still loading. */
  groups: QualificationGroup[] | null;
  /** syllabus code -> papers.subject name; they are not the same string. */
  subjectNameByCode: Map<string, string> | null;
  loadFailed: boolean;
};

/**
 * Subject -> Curriculum -> optional Topic -> Browse.
 *
 * All this has to produce is one syllabus `code` (plus an optional
 * `topic`) in the query string. Browse already knows how to apply both,
 * so the picker resolves the user's choices down to that and hands off.
 */
export function SubjectPicker({ groups, subjectNameByCode, loadFailed }: SubjectPickerProps) {
  const router = useRouter();
  // null means "the user has not chosen one", which falls back to the
  // default below. Storing the default in state instead would mean
  // setting it from an effect once the catalogue loads, and an extra
  // render pass to do it.
  const [pickedQualification, setPickedQualification] = useState<string | null>(null);
  const [subjectCode, setSubjectCode] = useState("");
  const [topic, setTopic] = useState("");
  const [submitError, setSubmitError] = useState(false);

  // Default to the first qualification that actually has papers. Plain
  // first-in-the-list opened on IGCSE, which has none, so the subject
  // dropdown came up empty.
  const defaultQualification = groups?.length
    ? (groups.find((g) => g.subjects.some((s) => s.paperCount > 0)) ?? groups[0]).qualification
    : "";
  const qualification = pickedQualification ?? defaultQualification;

  const subjects = groups?.find((g) => g.qualification === qualification)?.subjects ?? [];
  const subjectName = subjectCode ? subjectNameByCode?.get(subjectCode) ?? null : null;
  const topics = useTopicsForSubject(subjectName);

  const ready = Boolean(subjectCode && qualification);
  const loading = !groups && !loadFailed;

  function changeQualification(next: string) {
    setPickedQualification(next);
    // Keep the chosen subject if the new curriculum also offers it;
    // otherwise it would sit in the select as a value with no option.
    const nextSubjects = groups?.find((g) => g.qualification === next)?.subjects ?? [];
    if (!nextSubjects.some((s) => s.code === subjectCode)) {
      setSubjectCode("");
      setTopic("");
    }
  }

  function changeSubject(next: string) {
    setSubjectCode(next);
    setTopic("");
    setSubmitError(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) {
      setSubmitError(true);
      return;
    }
    const params = new URLSearchParams({ code: subjectCode });
    if (topic) params.set("topic", topic);
    router.push(`/browse?${params.toString()}`);
  }

  let hint = "Pick a subject and curriculum to continue.";
  if (loadFailed) hint = "Could not load subjects. Please refresh the page.";
  else if (submitError) hint = "Please choose a subject and a curriculum first.";
  else if (ready) hint = "Ready. Opens the question bank filtered to your choice.";

  let topicPlaceholder = "Any topic";
  if (!subjectCode) topicPlaceholder = "Choose a subject first";
  else if (topics.loading) topicPlaceholder = "Loading topics…";
  else if (!topics.failed && topics.topics.length === 0) topicPlaceholder = "No topics for this subject yet";

  return (
    <form className="picker-card" onSubmit={submit} noValidate>
      <div className="picker-steps">
        <div className="picker-step">
          <div className="picker-step-head">
            <span>
              <span className="num">1</span>Subject choice
            </span>
          </div>
          <select
            value={subjectCode}
            disabled={loading || loadFailed || subjects.length === 0}
            onChange={(e) => changeSubject(e.target.value)}
            required
          >
            {loadFailed ? (
              <option value="">Unavailable</option>
            ) : loading ? (
              <option value="">Loading subjects&hellip;</option>
            ) : (
              <>
                <option value="">Choose a subject</option>
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.title}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div className="picker-step">
          <div className="picker-step-head">
            <span>
              <span className="num">2</span>Curriculum
            </span>
          </div>
          <select
            value={qualification}
            disabled={loading || loadFailed || !groups?.length}
            onChange={(e) => changeQualification(e.target.value)}
            required
          >
            {loadFailed ? (
              <option value="">Unavailable</option>
            ) : loading ? (
              <option value="">Loading&hellip;</option>
            ) : (
              (groups ?? []).map((g) => (
                <option key={g.qualification} value={g.qualification}>
                  {g.board} {g.qualification}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="picker-step">
          <div className="picker-step-head">
            <span>
              <span className="num">3</span>Topic
            </span>
            <span className="optional">optional</span>
          </div>
          {/* Keyed on the subject so changing subject remounts the box,
              which is what clears whatever was typed in it. */}
          <TopicCombobox
            key={subjectCode}
            topics={topics.topics}
            placeholder={topicPlaceholder}
            disabled={!subjectCode || topics.loading}
            onChange={setTopic}
          />
        </div>
      </div>

      <div className="picker-footer">
        <span className={`picker-hint${loadFailed || submitError ? " is-error" : ""}`}>{hint}</span>
        <button type="submit" className="btn-search" disabled={!ready}>
          Search Question Bank
        </button>
      </div>
    </form>
  );
}
