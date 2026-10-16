"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { paperLabel, type Question } from "@/lib/supabase";

type QuestionPickListProps = {
  questions: Question[];
  selected: Set<string>;
  /** uids whose copy in THIS module has been edited. */
  overridden: Set<string>;
  onToggle: (uid: string) => void;
  onView: (question: Question) => void;
  onEdit: (question: Question) => void;
};

/** Tick questions into the pack. Selection survives every filter change,
    which is the whole point: one pack, questions no single filter shows. */
export function QuestionPickList({
  questions,
  selected,
  overridden,
  onToggle,
  onView,
  onEdit,
}: QuestionPickListProps) {
  if (!questions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions match. Widen the topic or paper filter.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[28rem] rounded-lg border">
      <ul className="divide-y">
        {questions.map((q) => (
          <li key={q.uid} className="flex items-start gap-3 p-3 hover:bg-muted/50">
            <Checkbox
              id={`pick-${q.uid}`}
              checked={selected.has(q.uid)}
              onCheckedChange={() => onToggle(q.uid)}
              className="mt-0.5"
            />
            <label htmlFor={`pick-${q.uid}`} className="min-w-0 flex-1 cursor-pointer">
              <span className="block text-sm font-medium">
                Q{q.id} &middot; {q.topic || "Untagged"}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                {paperLabel(q)}
                {q.ref ? ` · ${q.ref}` : ""}
              </span>
            </label>
            {overridden.has(q.uid) && (
              <Badge variant="secondary" className="shrink-0">
                edited
              </Badge>
            )}
            <Badge variant="outline" className="shrink-0 font-mono">
              {q.marks ?? "?"}
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={() => onView(q)}>
              View
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Edit this module's own copy; the paper in the bank is left alone"
              onClick={() => onEdit(q)}
            >
              Edit
            </Button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
