"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { paperLabel, type Question } from "@/lib/supabase";

type QuestionPickerProps = {
  questions: Question[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

/** One row per paper, each with its own dropdown. A strip of pills ran to
    forty entries on an MCQ paper and had to scroll sideways. */
export function QuestionPicker({ questions, activeIndex, onSelect }: QuestionPickerProps) {
  if (!questions.length) return null;

  const groups = groupByPaper(questions);
  const activeUid = questions[activeIndex]?.uid;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid gap-0 p-0">
        {groups.map((group, i) => {
          const items = Object.fromEntries(
            group.items.map(({ question: q }) => [q.uid, `Q${q.id} · ${q.marks ?? "·"} marks`]),
          );
          const selected = group.items.find(({ question }) => question.uid === activeUid);

          return (
            <div key={group.paperKey}>
              {i > 0 && <Separator />}
              <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length} question{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Select
                  items={items}
                  value={selected?.question.uid ?? null}
                  onValueChange={(uid) => {
                    const hit = group.items.find(({ question }) => question.uid === uid);
                    if (hit) onSelect(hit.index);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-60">
                    <SelectValue placeholder="Jump to a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.items.map(({ question: q }) => (
                      <SelectItem key={q.uid} value={q.uid}>
                        Q{q.id} &middot; {q.marks ?? "·"} marks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function groupByPaper(questions: Question[]) {
  const groups: {
    paperKey: string;
    label: string;
    items: { question: Question; index: number }[];
  }[] = [];

  questions.forEach((question, index) => {
    const last = groups.at(-1);
    if (last?.paperKey === question.paperKey) last.items.push({ question, index });
    else
      groups.push({
        paperKey: question.paperKey,
        label: paperLabel(question),
        items: [{ question, index }],
      });
  });
  return groups;
}
