"use client";

import { BookOpen, CalendarRange, Check, FileStack, Layers, RotateCcw, Tags } from "lucide-react";

import {
  MIN_NARROWING,
  narrowingCount,
  resultsReady,
  type Facets,
  type QualificationGroup,
  type ScopedFacets,
  type SearchFilters,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { FilterSelect, type Option } from "./filter-select";
import { QualificationPills } from "./qualification-pills";
import { TopicFilter } from "./topic-filter";

export type FiltersPanelProps = {
  groups: QualificationGroup[];
  qualification: string;
  onQualification: (qualification: string) => void;
  /** Subjects for the chosen qualification, already labelled with their code. */
  subjectOptions: Option[];
  facets: Facets | null;
  /** Options for paper, variant, session and year, narrowed by the other choices. */
  scoped: ScopedFacets;
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
  topics: string[];
  topicsLoading?: boolean;
};

const FIELD_LABEL: [keyof SearchFilters, string][] = [
  ["subject", "Subject"],
  ["paper", "Paper"],
  ["variant", "Variant"],
  ["session", "Session"],
  ["year", "Year"],
  ["topic", "Topic"],
];

/**
 * The search rail, as three steps: pick a subject, narrow it down with at
 * least two more choices, and the paper appears. A progress card at the top
 * says which step you are on, so the rail explains itself without a manual.
 *
 * Rendered beside the results on desktop and inside a Sheet on mobile, so it
 * takes no layout of its own.
 */
export function FiltersPanel({
  groups,
  qualification,
  onQualification,
  subjectOptions,
  facets,
  scoped,
  filters,
  onChange,
  onReset,
  topics,
  topicsLoading,
}: FiltersPanelProps) {
  const active = FIELD_LABEL.filter(([key]) => Boolean(filters[key]));
  const hasSubject = Boolean(filters.subject);
  const narrowed = narrowingCount(filters);
  const ready = resultsReady(filters);
  // Not before the paper list has loaded: until then nothing matches anything.
  const deadEnd =
    Boolean(facets) &&
    scoped.matching === 0 &&
    active.some(([key]) => key !== "topic" && key !== "text");

  return (
    <div className="flex min-h-full flex-col gap-5 p-5 text-[var(--sidebar-foreground)]">
      <div className="flex items-center justify-between pr-9 xl:pr-0">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[var(--sw-brass-light)] uppercase">
          Find a paper
        </p>
        {(active.length > 0 || filters.text) && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}
      </div>

      {/* Where you are: three steps, the current one lit. */}
      <ol className="grid gap-0 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5" aria-label="Progress">
        <Step done={hasSubject} current={!hasSubject} title="Choose a subject">
          {hasSubject ? filters.subject : "Start here"}
        </Step>
        <Step
          done={narrowed >= MIN_NARROWING}
          current={hasSubject && narrowed < MIN_NARROWING}
          muted={!hasSubject}
          title={`Narrow it down`}
        >
          {hasSubject
            ? `${Math.min(narrowed, MIN_NARROWING)} of ${MIN_NARROWING} chosen`
            : `Pick ${MIN_NARROWING} more after the subject`}
        </Step>
        <Step done={ready} current={false} muted={!ready} last title="Read the paper">
          {ready ? "Showing questions" : "Appears when ready"}
        </Step>
      </ol>

      {active.length > 0 && (
        <ul className="-mt-1 flex flex-wrap gap-1.5" aria-label="Active filters">
          {active.map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => onChange({ [key]: "" })}
                title={`Remove ${label.toLowerCase()} filter`}
                className="sw-rise group inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--sw-brass)]/15 py-0.5 pr-1.5 pl-2.5 text-[11px] text-[var(--sw-brass-light)] transition-colors hover:bg-[var(--sw-brass)]/30"
              >
                <span className="truncate">{filters[key]}</span>
                <span aria-hidden className="text-sm leading-none opacity-60 group-hover:opacity-100">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Section n={1} icon={<BookOpen className="size-3.5" />} title="Subject">
        <QualificationPills groups={groups} value={qualification} onChange={onQualification} />
        <FilterSelect
          id="f-subject"
          label="Subject"
          value={filters.subject ?? ""}
          options={subjectOptions}
          onChange={(subject) => onChange({ subject })}
          anyLabel="Choose a subject"
        />
      </Section>

      <Section
        n={2}
        icon={<FileStack className="size-3.5" />}
        title="Narrow it down"
        hint={`Choose at least ${MIN_NARROWING}`}
        locked={!hasSubject}
      >
        <div className="grid grid-cols-2 gap-3">
          <FilterSelect
            id="f-paper"
            label="Paper"
            value={filters.paper ?? ""}
            options={toOptions(scoped.papers)}
            onChange={(paper) => onChange({ paper })}
            disabled={!hasSubject}
          />
          <FilterSelect
            id="f-variant"
            label="Variant"
            value={filters.variant ?? ""}
            options={toOptions(scoped.variants)}
            onChange={(variant) => onChange({ variant })}
            disabled={!hasSubject}
          />
          <FilterSelect
            id="f-session"
            label="Session"
            value={filters.session ?? ""}
            options={toOptions(scoped.sessions)}
            onChange={(session) => onChange({ session })}
            disabled={!hasSubject}
          />
          <FilterSelect
            id="f-year"
            label="Year"
            value={filters.year ?? ""}
            options={toOptions(scoped.years)}
            onChange={(year) => onChange({ year })}
            disabled={!hasSubject}
          />
        </div>
        <CalendarHint show={!hasSubject} />
      </Section>

      {deadEnd && (
        <p
          role="status"
          className="sw-rise rounded-lg border border-[var(--sw-marker)]/40 bg-[var(--sw-marker)]/15 p-3 text-xs leading-relaxed text-white/90"
        >
          No paper has all of those. Remove one of the chips above, or press Reset.
        </p>
      )}

      <Section
        n={3}
        icon={<Tags className="size-3.5" />}
        title="Topic"
        hint="Optional, and counts as one"
        locked={!hasSubject}
      >
        <TopicFilter
          topics={topics}
          value={filters.topic ?? ""}
          onChange={(topic) => onChange({ topic })}
          loading={topicsLoading}
          disabled={!hasSubject}
        />
      </Section>

      <StatStrip facets={facets} />
    </div>
  );
}

function CalendarHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-white/50">
      <CalendarRange className="size-3.5" />
      Choose a subject first.
    </p>
  );
}

function Step({
  title,
  children,
  done,
  current,
  muted,
  last,
}: {
  title: string;
  children: React.ReactNode;
  done: boolean;
  current: boolean;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-3.5 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-7 bottom-0 left-[13px] w-0.5 rounded-full transition-colors duration-500",
            done ? "bg-[var(--sw-ms)]" : "bg-white/15",
          )}
        />
      )}
      <span
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
          done
            ? "bg-[image:var(--sw-grad-ms-soft)] text-white shadow-[0_4px_10px_-2px_rgba(23,148,106,0.7)]"
            : current
              ? "bg-[image:var(--sw-grad-sol)] text-white shadow-[0_0_0_4px_rgba(196,146,42,0.25)]"
              : "bg-white/10 text-white/50",
        )}
      >
        {done ? <Check className="sw-rise size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <span className={cn("min-w-0", muted && "opacity-55")}>
        <span className="block text-xs font-semibold text-white">{title}</span>
        <span className="block truncate text-[11px] text-white/65">{children}</span>
      </span>
    </li>
  );
}

function Section({
  n,
  icon,
  title,
  hint,
  locked,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("grid gap-3 transition-opacity duration-300", locked && "opacity-60")}>
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white">
        <span className="flex size-6 items-center justify-center rounded-md bg-white/10 text-[var(--sw-brass-light)]">
          {icon}
        </span>
        <span>
          <span className="mr-1 font-mono text-[10px] text-white/45">{n}</span>
          {title}
        </span>
        {hint && <span className="ml-auto text-[10px] font-normal text-white/50">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function StatStrip({ facets }: { facets: Facets | null }) {
  if (!facets) return null;
  if (!facets.paperCount) {
    return <p className="mt-auto font-mono text-[11px] text-white/50">No papers indexed yet.</p>;
  }

  return (
    <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-white/10 pt-4 font-mono text-[11px]">
      <div className="rounded-xl bg-white/[0.06] p-2.5">
        <dt className="flex items-center gap-1 text-lg leading-none font-bold text-white">
          <Layers className="size-3.5 text-[var(--sw-brass-light)]" />
          {facets.paperCount}
        </dt>
        <dd className="mt-1 text-white/55">papers</dd>
      </div>
      <div className="rounded-xl bg-white/[0.06] p-2.5">
        <dt className="text-lg leading-none font-bold text-white">{facets.questionCount}</dt>
        <dd className="mt-1 text-white/55">questions</dd>
      </div>
    </dl>
  );
}

function toOptions(values: string[] | undefined): Option[] {
  return (values ?? []).map((v) => ({ value: v, label: v }));
}
