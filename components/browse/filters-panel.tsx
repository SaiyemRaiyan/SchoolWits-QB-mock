"use client";

import { Separator } from "@/components/ui/separator";
import type { Facets, QualificationGroup, SearchFilters } from "@/lib/supabase";

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
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  topics: string[];
  topicsLoading?: boolean;
};

/** The whole search rail. Rendered beside the results on desktop and inside a
    Sheet on mobile, so it takes no layout of its own. */
export function FiltersPanel({
  groups,
  qualification,
  onQualification,
  subjectOptions,
  facets,
  filters,
  onChange,
  topics,
  topicsLoading,
}: FiltersPanelProps) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        Refine your search
      </p>

      <Section title="Qualification">
        <QualificationPills groups={groups} value={qualification} onChange={onQualification} />
      </Section>

      <Section title="Subject & paper">
        <div className="grid gap-3">
          <FilterSelect
            id="f-subject"
            label="Subject"
            value={filters.subject ?? ""}
            options={subjectOptions}
            onChange={(subject) => onChange({ subject })}
            anyLabel="Any subject"
          />
          <FilterSelect
            id="f-paper"
            label="Paper"
            value={filters.paper ?? ""}
            options={toOptions(facets?.papers)}
            onChange={(paper) => onChange({ paper })}
          />
          <FilterSelect
            id="f-variant"
            label="Variant"
            value={filters.variant ?? ""}
            options={toOptions(facets?.variants)}
            onChange={(variant) => onChange({ variant })}
          />
          <FilterSelect
            id="f-session"
            label="Session"
            value={filters.session ?? ""}
            options={toOptions(facets?.sessions)}
            onChange={(session) => onChange({ session })}
          />
          <FilterSelect
            id="f-year"
            label="Year"
            value={filters.year ?? ""}
            options={toOptions(facets?.years.map(String))}
            onChange={(year) => onChange({ year })}
          />
        </div>
      </Section>

      <Section title="Topic">
        <TopicFilter
          topics={topics}
          value={filters.topic ?? ""}
          onChange={(topic) => onChange({ topic })}
          loading={topicsLoading}
        />
      </Section>

      <Separator />
      <StatStrip facets={facets} />
    </div>
  );
}

/* No card, no colour dot: a heading and its controls, like the shadcn docs rail. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function StatStrip({ facets }: { facets: Facets | null }) {
  if (!facets) return null;
  if (!facets.paperCount) {
    return <p className="font-mono text-[11px] text-muted-foreground">No papers indexed yet.</p>;
  }

  return (
    <dl className="grid gap-1 font-mono text-[11px] text-muted-foreground">
      <div className="flex gap-1.5">
        <dt className="font-medium text-foreground">{facets.paperCount}</dt>
        <dd>papers indexed</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="font-medium text-foreground">{facets.questionCount}</dt>
        <dd>questions searchable</dd>
      </div>
    </dl>
  );
}

function toOptions(values: string[] | undefined): Option[] {
  return (values ?? []).map((v) => ({ value: v, label: v }));
}
