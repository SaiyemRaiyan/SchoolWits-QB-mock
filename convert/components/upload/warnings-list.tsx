import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ParseWarning } from "@/lib/supabase";

/** Warnings are shown, never suppressed: a marks mismatch is far cheaper to
    fix before saving than after. */
export function WarningsList({ warnings }: { warnings: ParseWarning[] }) {
  if (!warnings.length) return null;

  return (
    <Card className="gap-0 border-primary/40 py-0">
      <CardContent className="grid gap-2 p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <AlertTriangle className="size-4 text-primary" />
          {warnings.length} thing{warnings.length === 1 ? "" : "s"} to check
        </h2>
        <ul className="grid gap-1.5 text-sm">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {w.code}
              </code>
              <span className="text-muted-foreground">{w.message}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
