"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsedPaper } from "@/lib/supabase";

type PaperMetaProps = {
  paper: ParsedPaper | null;
  subject: string;
  onSubject: (subject: string) => void;
};

/** Everything but the subject is read from the \examq header, and read-only
    because the questions are filed under whatever that header says. */
export function PaperMeta({ paper, subject, onSubject }: PaperMetaProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Subject" id="m-subject">
        <Input
          id="m-subject"
          value={subject}
          onChange={(e) => onSubject(e.target.value)}
          placeholder="Physics"
        />
      </Field>
      <Field label="Subject code" id="m-code">
        <Input id="m-code" value={paper?.subjectCode ?? ""} readOnly className="bg-muted" />
      </Field>
      <Field label="Paper" id="m-paper">
        <Input id="m-paper" value={paper?.paper ?? ""} readOnly className="bg-muted" />
      </Field>
      <Field label="Variant" id="m-variant">
        <Input id="m-variant" value={paper?.variant ?? ""} readOnly className="bg-muted" />
      </Field>
      <Field label="Session" id="m-session">
        <Input id="m-session" value={paper?.session ?? ""} readOnly className="bg-muted" />
      </Field>
      <Field label="Year" id="m-year">
        <Input id="m-year" value={String(paper?.year ?? "")} readOnly className="bg-muted" />
      </Field>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
