"use client";

import { useId, useRef } from "react";

import { cn } from "@/lib/utils";

export type Tone = "q" | "ms" | "sol" | "video";

export type Mode = {
  value: string;
  label: string;
  tone: Tone;
  icon?: React.ReactNode;
};

/** Each document type owns a colour, defined once in app/globals.css. */
export const TONE_VAR: Record<Tone, string> = {
  q: "var(--sw-q)",
  ms: "var(--sw-ms)",
  sol: "var(--sw-sol)",
  video: "var(--sw-marker)",
};

/** The same hues as gradients, for the sliding marker and header bands. */
export const TONE_GRAD: Record<Tone, string> = {
  q: "var(--sw-grad-q)",
  ms: "var(--sw-grad-ms)",
  sol: "var(--sw-grad-sol)",
  video: "var(--sw-grad-seal)",
};

export const TONE_TINT: Record<Tone, string> = {
  q: "var(--sw-q-tint)",
  ms: "var(--sw-ms-tint)",
  sol: "var(--sw-sol-tint)",
  video: "#FBEBE8",
};

type ModeTabsProps = {
  modes: Mode[];
  value: string;
  onChange: (value: string) => void;
  /** Ties each tab to the panel it controls. */
  panelId: string;
  label: string;
  className?: string;
};

/**
 * The segmented control that switches between a question and its answers.
 *
 * Built by hand rather than from the shadcn Tabs: those give every tab the
 * same active colour, and here each document type has its own. The sliding
 * marker is a single element moved with a transform, so it animates without
 * measuring anything. Arrow keys, Home and End move between tabs.
 */
export function ModeTabs({ modes, value, onChange, panelId, label, className }: ModeTabsProps) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = Math.max(
    0,
    modes.findIndex((m) => m.value === value),
  );
  const tone = modes[active]?.tone ?? "q";

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = modes.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(modes[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "relative grid w-full auto-cols-fr grid-flow-col rounded-xl bg-muted p-1 sm:w-fit",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-lg shadow-md transition-[transform,background-color] duration-300 ease-[var(--sw-ease)]"
        style={{
          width: `calc((100% - 0.5rem) / ${modes.length})`,
          transform: `translateX(${active * 100}%)`,
          backgroundImage: TONE_GRAD[tone],
        }}
      />
      {modes.map((mode, i) => {
        const selected = i === active;
        return (
          <button
            key={mode.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${base}-${mode.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(mode.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 sm:px-3.5 sm:text-sm",
              selected ? "text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="hidden sm:inline-flex">{mode.icon}</span>
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel a ModeTabs controls. Keyed on the value so each switch replays
    the entrance, which is what makes the change of document legible. */
export function ModePanel({
  id,
  mode,
  children,
  className,
}: {
  id: string;
  mode: Mode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      key={mode.value}
      id={id}
      role="tabpanel"
      tabIndex={0}
      aria-label={mode.label}
      className={cn("sw-rise relative overflow-hidden rounded-2xl outline-none", className)}
    >
      {children}
    </div>
  );
}
