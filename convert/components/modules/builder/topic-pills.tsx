"use client";

import { Button } from "@/components/ui/button";

type TopicPillsProps = {
  /** Topic to question count, across the chosen subject. */
  counts: Map<string, number>;
  total: number;
  active: Set<string>;
  onToggle: (topic: string) => void;
  onClear: () => void;
};

/** Multi-select: a question matching ANY active topic is shown. */
export function TopicPills({ counts, total, active, onToggle, onClear }: TopicPillsProps) {
  const topics = Array.from(counts.keys()).sort();
  if (!topics.length) {
    return <p className="text-sm text-muted-foreground">No topics tagged in this subject yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Pill active={active.size === 0} count={total} onClick={onClear}>
        All topics
      </Pill>
      {topics.map((topic) => (
        <Pill
          key={topic}
          active={active.has(topic)}
          count={counts.get(topic) ?? 0}
          onClick={() => onToggle(topic)}
        >
          {topic}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className="h-7 rounded-full text-xs font-normal"
    >
      {children}
      <span className="ml-1 font-mono tabular-nums opacity-70">{count}</span>
    </Button>
  );
}
