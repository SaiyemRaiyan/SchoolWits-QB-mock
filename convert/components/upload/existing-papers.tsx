"use client";

import { useState } from "react";

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
import type { Paper } from "@/lib/supabase";

type ExistingPapersProps = { papers: Paper[]; onDelete: (paperKey: string) => Promise<void> };

export function ExistingPapers({ papers, onDelete }: ExistingPapersProps) {
  const [pending, setPending] = useState<Paper | null>(null);

  if (!papers.length) {
    return <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>;
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {papers.map((p) => (
          <li key={p.paperKey} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.subject}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setPending(p)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pending?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every question from this paper goes too, and disappears from search and from any
              module that used it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pending) await onDelete(pending.paperKey);
                setPending(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
