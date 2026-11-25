import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type StepProps = {
  number?: number;
  title: string;
  hint?: string;
  /** Done steps show a tick in place of their number. */
  done?: boolean;
  children: React.ReactNode;
};

/** One numbered stage of a workflow. The number becomes a tick when finished,
    which is what lets the page read as progress rather than a long form. */
export function Step({ number, title, hint, done, children }: StepProps) {
  return (
    <section className="sw-sheet-in grid gap-4 rounded-2xl bg-card p-5 text-foreground shadow-[0_30px_60px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
      <div className="flex items-start gap-3">
        {number && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white shadow-[var(--sw-shadow-1)] transition-colors duration-500",
              done ? "bg-[var(--sw-ms)]" : "bg-[var(--sw-ink)]",
            )}
          >
            {done ? <Check className="sw-rise size-4" /> : number}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-serif text-lg leading-8 font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
