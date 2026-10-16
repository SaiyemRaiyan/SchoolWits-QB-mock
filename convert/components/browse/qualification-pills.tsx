"use client";

import { Button } from "@/components/ui/button";
import type { QualificationGroup } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type QualificationPillsProps = {
  groups: QualificationGroup[];
  value: string;
  onChange: (qualification: string) => void;
};

/** Step one of the search: the qualification, with its paper count. */
export function QualificationPills({ groups, value, onChange }: QualificationPillsProps) {
  if (!groups.length) {
    return <p className="text-xs text-muted-foreground">Could not load qualifications.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => {
        const active = group.qualification === value;
        return (
          <Button
            key={group.qualification}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(group.qualification)}
            className={cn(
              "h-7 rounded-full font-mono text-[11px]",
              active && "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
            )}
          >
            {group.board} {group.qualification}
            <span className="ml-1 tabular-nums opacity-60">{group.paperCount}</span>
          </Button>
        );
      })}
    </div>
  );
}
