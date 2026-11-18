import { SearchX } from "lucide-react";

/** Used both as a prompt ("choose a subject") and as a no-results message. */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="sw-sheet-in flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-16 text-center shadow-[var(--sw-shadow-3)] ring-1 ring-white/10">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--sw-ink)] text-[var(--sw-brass-light)] shadow-[0_6px_0_rgba(0,0,0,0.25),0_14px_24px_-10px_rgba(0,0,0,0.5)]">
        <SearchX className="size-6" />
      </span>
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <div className="max-w-md text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
