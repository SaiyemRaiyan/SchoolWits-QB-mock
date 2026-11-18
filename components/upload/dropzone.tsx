"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Each kind of file has its own colour, so four near-identical boxes stay
    distinguishable at a glance and the filled ones read as done. */
export type DropTone = "q" | "ms" | "pdf" | "fig";

const TONES: Record<DropTone, { ring: string; soft: string; solid: string }> = {
  q: { ring: "var(--sw-q)", soft: "var(--sw-q-tint)", solid: "var(--sw-q)" },
  ms: { ring: "var(--sw-ms)", soft: "var(--sw-ms-tint)", solid: "var(--sw-ms)" },
  pdf: { ring: "var(--sw-marker)", soft: "#FBEBE8", solid: "var(--sw-marker)" },
  fig: { ring: "var(--sw-brass)", soft: "var(--sw-sol-tint)", solid: "var(--sw-brass)" },
};

type DropzoneProps = {
  id: string;
  title: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  icon: React.ReactNode;
  tone?: DropTone;
  /** What is in the box now, if anything. Turns the zone into a done state. */
  filled?: string | null;
  disabled?: boolean;
  onFiles: (files: FileList) => void;
};

/** Click or drop. The border and tint are the only affordances it needs. */
export function Dropzone({
  id,
  title,
  hint,
  accept,
  multiple,
  icon,
  tone = "q",
  filled,
  disabled,
  onFiles,
}: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const t = TONES[tone];

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${title}. ${hint}`}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => !disabled && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(e.dataTransfer.files);
      }}
      style={{
        borderColor: over || filled ? t.ring : undefined,
        background: over || filled ? t.soft : undefined,
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 ease-[var(--sw-ease)]",
        "[transform-style:preserve-3d] hover:[transform:perspective(800px)_rotateX(5deg)_translateY(-4px)] hover:shadow-[var(--sw-shadow-3)]",
        over && "[transform:perspective(800px)_rotateX(8deg)_scale(1.03)] border-solid shadow-[var(--sw-shadow-3)]",
        filled && "border-solid",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span
        className="flex size-11 items-center justify-center rounded-xl text-white shadow-[var(--sw-shadow-1)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
        style={{ background: t.solid }}
      >
        {filled ? <Check className="sw-rise size-5" /> : icon}
      </span>
      <p className="text-sm font-semibold">{filled ? "Replace file" : title}</p>
      <p className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
        {filled || hint}
      </p>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          // Choosing the same file twice must still count as a change.
          e.target.value = "";
        }}
      />
    </div>
  );
}
