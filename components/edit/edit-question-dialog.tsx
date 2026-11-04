"use client";

import { useEffect, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getQuestionLeaves,
  resetQuestionOverride,
  saveQuestionEdits,
  type EditResponse,
  type Leaf,
  type Question,
  type QuestionContent,
} from "@/lib/supabase";

import { LeafField } from "./leaf-field";
import { VideoSection } from "./video-section";

export type EditQuestionDialogProps = {
  question: Question | null;
  /** Set to edit one module's own copy instead of the question in the bank. */
  moduleId?: number | null;
  onClose: () => void;
  onSaved?: (content: QuestionContent, info: { edited: boolean }) => void;
  onVideoSaved?: (question: Question) => void;
};

export function EditQuestionDialog(props: EditQuestionDialogProps) {
  // Keyed on the question so each open starts from a clean load rather than
  // carrying the previous question's draft.
  return (
    <Dialog open={Boolean(props.question)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        {props.question && <EditForm key={props.question.pk} {...props} question={props.question} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  question,
  moduleId = null,
  onClose,
  onSaved,
  onVideoSaved,
}: EditQuestionDialogProps & { question: Question }) {
  const [loaded, setLoaded] = useState<EditResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let alive = true;
    getQuestionLeaves(question.pk, moduleId).then(
      (res) => alive && apply(res),
      (err) => alive && setError((err as Error).message),
    );
    return () => {
      alive = false;
    };
  }, [question.pk, moduleId]);

  function apply(res: EditResponse) {
    setLoaded(res);
    setDraft(Object.fromEntries(res.leaves.map((l) => [key(l), l.value])));
  }

  const leaves = loaded?.leaves ?? [];
  const edits = leaves
    .filter((l) => draft[key(l)] !== undefined && draft[key(l)] !== l.value)
    .map((l) => ({ path: l.path, value: draft[key(l)] }));

  async function save() {
    setBusy(true);
    setStatus("Saving…");
    setError("");
    try {
      const res = await saveQuestionEdits(question.pk, edits, moduleId);
      apply(res);
      setStatus(`Saved ${res.applied} change${res.applied === 1 ? "" : "s"}.`);
      // Re-render from what the database holds, not from what was typed.
      if (res.content) onSaved?.(res.content, { edited: res.edited === true });
    } catch (err) {
      setStatus("");
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setStatus("Resetting…");
    setError("");
    try {
      const res = await resetQuestionOverride(moduleId!, question.pk);
      apply(res);
      setStatus("Reset to the original.");
      if (res.content) onSaved?.(res.content, { edited: false });
    } catch (err) {
      setStatus("");
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  }

  return (
    <>
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>Edit question {question.id}</DialogTitle>
        <DialogDescription>
          {loaded
            ? `${loaded.ref ?? `#${question.pk}`} · ${leaves.length} editable field${leaves.length === 1 ? "" : "s"}`
            : "Loading the editable fields…"}
          {loaded?.edited && " · edited for this module"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-6 overflow-x-hidden overflow-y-auto px-6 py-5">
        {moduleId != null && (
          <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Editing this module&rsquo;s own copy.</strong> The
            question in the bank, and every other module using it, stays as the paper has it.
            Change a value and the mark scheme and worked solution will need changing too, since
            nothing can recompute them.
          </p>
        )}

        {leaves.length === 0 && loaded && (
          <p className="text-sm text-muted-foreground">This question has no editable text fields.</p>
        )}

        {groupLeaves(leaves).map((group) => (
          <section key={group.name} className="grid min-w-0 gap-4 rounded-lg border p-4">
            <h3 className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
              {group.name}
            </h3>
            {group.items.map((leaf) => (
              <LeafField
                key={key(leaf)}
                leaf={leaf}
                value={draft[key(leaf)] ?? leaf.value}
                questionId={question.pk}
                onChange={(value) => setDraft((d) => ({ ...d, [key(leaf)]: value }))}
              />
            ))}
          </section>
        ))}

        {loaded && (
          <VideoSection
            question={question}
            moduleId={moduleId}
            onSaved={(updated) => onVideoSaved?.(updated)}
          />
        )}
      </div>

      <DialogFooter className="items-center gap-3 border-t px-6 py-4 sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          {edits.length > 0 && (
            <Badge variant="secondary">
              {edits.length} field{edits.length === 1 ? "" : "s"} changed
            </Badge>
          )}
          {status && <span className="text-muted-foreground">{status}</span>}
          {error && <span className="text-destructive">{error}</span>}
        </div>

        <div className="flex gap-2">
          {moduleId != null && loaded?.edited && (
            <Button variant="outline" disabled={busy} onClick={() => setConfirmReset(true)}>
              Reset to original
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button disabled={busy || edits.length === 0} onClick={() => void save()}>
            Save changes
          </Button>
        </div>
      </DialogFooter>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this module&rsquo;s edited copy?</AlertDialogTitle>
            <AlertDialogDescription>
              It goes back to the paper&rsquo;s version. Other modules using this question are
              unaffected either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void reset()}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** The path identifies a field; the label only groups it on screen. */
function key(leaf: Leaf) {
  return leaf.path.join("\u0000");
}

function groupLeaves(leaves: Leaf[]) {
  const groups: { name: string; items: Leaf[] }[] = [];
  leaves.forEach((leaf) => {
    const name = leaf.label.split(" · ")[0];
    const existing = groups.find((g) => g.name === name);
    if (existing) existing.items.push(leaf);
    else groups.push({ name, items: [leaf] });
  });
  return groups;
}
