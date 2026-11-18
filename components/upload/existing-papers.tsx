"use client";

import { Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Paper } from "@/lib/supabase";

type ExistingPapersProps = { papers: Paper[]; onDelete: (paperKey: string) => Promise<void> };

const ANY = "__any";

/**
 * Every paper in the bank, with the filters an admin needs to find one fast:
 * a search box, and subject, session and year. A paper can be deleted from any
 * filtered view, so cleaning up a bad upload never means scrolling a long list.
 */
export function ExistingPapers({ papers, onDelete }: ExistingPapersProps) {
  const [pending, setPending] = useState<Paper | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [session, setSession] = useState("");
  const [year, setYear] = useState("");

  const subjects = useMemo(() => uniq(papers.map((p) => p.subject)), [papers]);
  const sessions = useMemo(() => uniq(papers.map((p) => p.session)), [papers]);
  const years = useMemo(
    () => uniq(papers.map((p) => String(p.year))).sort((a, b) => Number(b) - Number(a)),
    [papers],
  );

  const shown = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return papers
      .filter(
        (p) =>
          (!subject || p.subject === subject) &&
          (!session || p.session === session) &&
          (!year || String(p.year) === year) &&
          (!needle ||
            `${p.label} ${p.subject} ${p.session} ${p.year} paper ${p.paper} variant ${p.variant}`
              .toLowerCase()
              .includes(needle)),
      )
      .sort((a, b) => b.year - a.year || a.label.localeCompare(b.label));
  }, [papers, text, subject, session, year]);

  const filtered = Boolean(text.trim() || subject || session || year);
  const clear = () => {
    setText("");
    setSubject("");
    setSession("");
    setYear("");
  };

  return (
    <div className="sw-sheet-in overflow-hidden rounded-3xl bg-card text-foreground shadow-[var(--sw-shadow-sheet)] ring-1 ring-white/10">
      <header className="bg-[image:var(--sw-grad-q)] px-5 py-4 text-white sm:px-6">
        <h2 className="font-serif text-xl font-semibold">Papers already in the bank</h2>
        <p className="text-sm text-white/75">
          Find a paper with the filters, then delete it. Deleting removes every question it
          contributed.
        </p>
      </header>

      <div className="grid gap-3 border-b bg-muted/50 p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search a paper, e.g. 5054 or 2016"
            aria-label="Search papers"
            className="h-9 bg-card pl-9"
          />
        </div>
        <ListFilter label="Subject" value={subject} options={subjects} onChange={setSubject} />
        <ListFilter label="Session" value={session} options={sessions} onChange={setSession} />
        <ListFilter label="Year" value={year} options={years} onChange={setYear} />
        <Button variant="outline" size="sm" onClick={clear} disabled={!filtered} className="h-9">
          <X className="size-3.5" />
          Clear
        </Button>
      </div>

      <p className="px-5 pt-3 text-xs text-muted-foreground sm:px-6" role="status">
        {papers.length === 0
          ? "Nothing uploaded yet."
          : `Showing ${shown.length} of ${papers.length} paper${papers.length === 1 ? "" : "s"}`}
      </p>

      {papers.length > 0 && shown.length === 0 ? (
        <p className="m-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground sm:mx-6">
          No paper matches those filters.
        </p>
      ) : (
        <ul className="grid gap-2 p-4 sm:px-6 sm:pb-6 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p) => (
            <li
              key={p.paperKey}
              className="flex items-center gap-3 rounded-2xl border bg-background p-3 shadow-[var(--sw-shadow-box)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--sw-grad-q)] font-mono text-xs font-bold text-white shadow-[0_6px_12px_-4px_rgba(10,23,48,0.6)]">
                {p.subjectCode || p.paper + p.variant}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.subject} · Paper {p.paper} · Variant {p.variant} · {p.session} {p.year}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                aria-label={`Delete ${p.label}`}
                onClick={() => {
                  setError("");
                  setPending(p);
                }}
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pending?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every question from this paper goes too, and disappears from search and from any
              module that used it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pending) return;
                try {
                  await onDelete(pending.paperKey);
                  setPending(null);
                } catch (err) {
                  // Without this a refused delete left the dialog open and silent.
                  setError((err as Error).message || "The paper could not be deleted.");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ListFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const items = { [ANY]: `Any ${label.toLowerCase()}`, ...Object.fromEntries(options.map((o) => [o, o])) };
  return (
    <Select items={items} value={value || ANY} onValueChange={(next) => onChange(next === ANY ? "" : String(next))}>
      <SelectTrigger size="sm" aria-label={label} className="h-9 w-full bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
