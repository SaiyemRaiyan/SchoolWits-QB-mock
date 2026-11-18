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
    return <p className="text-xs text-white/60">Could not load qualifications.</p>;
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
            aria-pressed={active}
            className={cn(
              "h-8 rounded-full border-white/20 bg-transparent font-mono text-[11px] text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white",
              active &&
                "border-[var(--sw-brass)] bg-[var(--sw-brass)] text-white shadow-[0_6px_16px_-6px_rgba(196,146,42,0.8)] hover:bg-[var(--sw-brass)] hover:text-white",
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
