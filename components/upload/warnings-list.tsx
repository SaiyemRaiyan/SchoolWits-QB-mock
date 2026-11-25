import { AlertTriangle, ShieldAlert } from "lucide-react";

import type { ParseWarning } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/** Warnings are shown, never suppressed: a marks mismatch is far cheaper to
    fix before saving than after. A blocked file looks different from a file
    that merely wants checking, because the admin's next move is different. */
export function WarningsList({ warnings, blocked }: { warnings: ParseWarning[]; blocked?: boolean }) {
  if (!warnings.length) return null;
  const Icon = blocked ? ShieldAlert : AlertTriangle;

  return (
    <section
      role={blocked ? "alert" : "status"}
      className={cn(
        "sw-sheet-in grid gap-3 rounded-2xl border-l-[6px] p-5 text-foreground shadow-[0_24px_50px_-26px_rgba(0,0,0,0.7)] ring-1",
        blocked
          ? "border-[var(--sw-marker)] bg-[#FBEBE8] ring-[var(--sw-marker)]/20"
          : "border-[var(--sw-brass)] bg-[var(--sw-sol-tint)] ring-[var(--sw-brass)]/20",
      )}
    >
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
        <Icon className={cn("size-5", blocked ? "text-[var(--sw-marker)]" : "text-[var(--sw-brass-dark)]")} />
        {blocked
          ? "This file cannot be saved"
          : `${warnings.length} thing${warnings.length === 1 ? "" : "s"} to check`}
      </h2>
      <ul className="grid max-h-64 gap-2 overflow-y-auto pr-1 text-sm">
        {warnings.map((w, i) => (
          <li key={i} className="flex gap-2.5">
            <code className="h-fit shrink-0 rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] shadow-[var(--sw-shadow-1)]">
              {w.code}
            </code>
            <span className="text-foreground/80">{w.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
