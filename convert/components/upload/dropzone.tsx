"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DropzoneProps = {
  id: string;
  title: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  icon: React.ReactNode;
  onFiles: (files: FileList) => void;
};

/** Click or drop. The dashed border is the only affordance it needs. */
export function Dropzone({ id, title, hint, accept, multiple, icon, onFiles }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        over ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="font-mono text-[11px] text-muted-foreground">{hint}</p>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}
