"use client";

import { CheckCircle2, FileText, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminGate } from "@/components/modules/admin-gate";
import { Step } from "@/components/common/step";
import { Dropzone } from "@/components/upload/dropzone";
import { ExistingPapers } from "@/components/upload/existing-papers";
import { PaperMeta } from "@/components/upload/paper-meta";
import { PreviewPanel } from "@/components/upload/preview-panel";
import { WarningsList } from "@/components/upload/warnings-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  deletePaper,
  getAllPapers,
  invalidateReferenceData,
  parsePaper,
  uploadFigures,
  type Paper,
  type ParseResult,
} from "@/lib/supabase";

// The .tex carries a syllabus code, not a subject name. These cover the
// papers in hand; anything else the admin types in.
const SUBJECT_BY_CODE: Record<string, string> = {
  "5054": "Physics",
  "4037": "Add Maths",
  "4024": "Maths D",
};

type TexFile = { name: string; text: string };

export function UploadClient() {
  const { admin, loading } = useAuth();
  if (loading) return <Shell>Checking your account…</Shell>;
  if (!admin) {
    return (
      <Shell>
        <AdminGate />
      </Shell>
    );
  }
  return <UploadWorkspace />;
}

function UploadWorkspace() {
  const [qp, setQp] = useState<TexFile | null>(null);
  const [qa, setQa] = useState<TexFile | null>(null);
  const [figures, setFigures] = useState<Record<string, File>>({});
  const [figureUrls, setFigureUrls] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ count: number } | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);

  const loadPapers = useCallback(() => {
    getAllPapers().then(setPapers, () => setPapers([]));
  }, []);
  useEffect(loadPapers, [loadPapers]);

  /**
   * Parse, then upload any pending figures and parse again. Figures need the
   * paper id for their storage prefix, and that only exists once the \examq
   * header has been read, so the first pass is what produces it.
   */
  const preview = useCallback(
    async (next: { qp: TexFile | null; qa: TexFile | null; figures: Record<string, File> }) => {
      if (!next.qp) return;
      setStatus("Parsing…");
      setError("");
      setSaved(null);

      try {
        let urls = figureUrls;
        let parsed = await parsePaper({ qpTex: next.qp.text, qaTex: next.qa?.text, images: urls });

        const pending = Object.keys(next.figures).filter((n) => !urls[n]);
        if (pending.length && parsed.paper) {
          setStatus(`Uploading ${pending.length} figure${pending.length === 1 ? "" : "s"}…`);
          urls = {
            ...urls,
            ...(await uploadFigures(parsed.paper.paperId, next.figures, pending, (done, total) =>
              setStatus(`Uploading figures… ${done}/${total}`),
            )),
          };
          setFigureUrls(urls);
          setStatus("Parsing…");
          parsed = await parsePaper({ qpTex: next.qp.text, qaTex: next.qa?.text, images: urls });
        }

        setResult(parsed);
        // Only guess the subject if nothing has been typed; never overwrite.
        setSubject((current) => current || SUBJECT_BY_CODE[parsed.paper?.subjectCode ?? ""] || "");
      } catch (err) {
        setResult(null);
        setError((err as Error).message);
      } finally {
        setStatus("");
      }
    },
    [figureUrls],
  );

  async function readTex(which: "qp" | "qa", files: FileList) {
    const file = files[0];
    if (!file) return;
    const value = { name: file.name, text: await file.text() };
    const next = which === "qp" ? { qp: value, qa } : { qp, qa: value };
    if (which === "qp") setQp(value);
    else setQa(value);
    void preview({ ...next, figures });
  }

  function addFigures(files: FileList) {
    const next = { ...figures };
    const urls = { ...figureUrls };
    for (const file of Array.from(files)) {
      next[file.name] = file;
      // Re-dropping a file must re-upload it, not keep the stale URL.
      delete urls[file.name];
    }
    setFigures(next);
    setFigureUrls(urls);
    void preview({ qp, qa, figures: next });
  }

  async function save() {
    if (!qp || !result) return;
    setStatus("Saving…");
    setError("");
    try {
      const committed = await parsePaper({
        qpTex: qp.text,
        qaTex: qa?.text,
        images: figureUrls,
        subject: subject.trim(),
        commit: true,
      });
      setResult(committed);
      setSaved({ count: committed.questionCount ?? committed.questions.length });
      invalidateReferenceData();
      loadPapers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus("");
    }
  }

  const figureNames = Object.keys(figures).sort();
  const totalMarks = result?.questions.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;

  return (
    <Shell>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold">Upload a paper from .tex</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Two files build one paper: a Questions file and an Answers file, matched by question
          number. Add any figures too. Nothing is saved until you confirm the preview.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Step
            number={1}
            title="Add the files"
            hint="Figures upload first so the parser can resolve \qfig{} to a real URL."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Dropzone
                  id="tex-q"
                  title="Drop the questions file"
                  hint="\examq · parts · \qfig"
                  accept=".tex,text/plain"
                  icon={<FileText className="size-5" />}
                  onFiles={(f) => void readTex("qp", f)}
                />
                {qp && <FilePill name={qp.name} />}
              </div>
              <div className="grid gap-2">
                <Dropzone
                  id="tex-a"
                  title="Drop the answers file"
                  hint="mstab · ansbox"
                  accept=".tex,text/plain"
                  icon={<CheckCircle2 className="size-5" />}
                  onFiles={(f) => void readTex("qa", f)}
                />
                {qa && <FilePill name={qa.name} />}
              </div>
            </div>

            <Dropzone
              id="figures"
              title="Drop figure images here"
              hint="matched to \qfig{} by filename"
              accept="image/*"
              multiple
              icon={<ImageIcon className="size-5" />}
              onFiles={addFigures}
            />
            {figureNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {figureNames.map((n) => (
                  <FilePill key={n} name={n} note={`${Math.round(figures[n].size / 1024)} KB`} />
                ))}
              </div>
            )}

            {status && <p className="text-sm text-muted-foreground">{status}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <p className="text-xs text-muted-foreground">
              New to the format? Start from{" "}
              <a href="/templates/question-paper.template.tex" download className="underline underline-offset-4">
                question-paper.template.tex
              </a>{" "}
              and{" "}
              <a href="/templates/answer-paper.template.tex" download className="underline underline-offset-4">
                answer-paper.template.tex
              </a>
              , and read{" "}
              <a href="/templates/README.md" className="underline underline-offset-4">
                the format spec
              </a>
              . The parser accepts that documented format, not arbitrary LaTeX.
            </p>
          </Step>

          <Step
            number={2}
            title="Confirm the paper"
            hint="Read from the \examq header, so it cannot be edited here. The subject is the one exception."
          >
            <PaperMeta paper={result?.paper ?? null} subject={subject} onSubject={setSubject} />
          </Step>

          {result && <WarningsList warnings={result.warnings} />}

          {result && (
            <Step number={3} title="Save to the bank">
              <p className="text-sm text-muted-foreground">
                {result.questions.length} questions &middot; {totalMarks} marks
                {qa ? "" : " · no answers file yet"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void save()} disabled={Boolean(status)}>
                  {status === "Saving…" ? "Saving…" : "Save to bank"}
                </Button>
                {saved && (
                  <p className="text-sm">
                    Saved {saved.count} questions.{" "}
                    <Link href="/browse" className="underline underline-offset-4">
                      Browse them
                    </Link>
                  </p>
                )}
              </div>
            </Step>
          )}
        </div>

        <div className="grid content-start gap-5">
          <Step title="Live preview">
            <PreviewPanel questions={result?.questions ?? []} />
          </Step>
          <Step
            title="Papers already in the bank"
            hint="Deleting a paper removes every question it contributed."
          >
            <ExistingPapers
              papers={papers}
              onDelete={async (key) => {
                await deletePaper(key);
                invalidateReferenceData();
                loadPapers();
              }}
            />
          </Step>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">{children}</main>;
}

function FilePill({ name, note }: { name: string; note?: string }) {
  return (
    <Badge variant="secondary" className="font-mono font-normal">
      {name}
      {note && <span className="ml-1 opacity-70">{note}</span>}
    </Badge>
  );
}
