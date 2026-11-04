"use client";

import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRenderedMath } from "@/hooks/use-rendered-math";
import { uploadQuestionFigure, type Leaf } from "@/lib/supabase";

// Short fields get an input; prose gets a textarea.
const SHORT_KINDS = new Set(["code", "caption", "heading"]);
// A code ("B1") or a caption never holds math, so a preview there is noise.
const PREVIEW_KINDS = new Set(["text", "markscheme", "guidance", "solution", "option"]);

type LeafFieldProps = {
  leaf: Leaf;
  value: string;
  questionId: number;
  onChange: (value: string) => void;
};

export function LeafField({ leaf, value, questionId, onChange }: LeafFieldProps) {
  const label = leaf.label.split(" · ").slice(1).join(" · ") || leaf.label;
  const changed = value !== leaf.value;
  const id = `leaf-${leaf.path.join("-")}`;

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {changed && <Badge variant="secondary">changed</Badge>}
      </div>

      {leaf.kind === "image" ? (
        <ImageField id={id} value={value} questionId={questionId} onChange={onChange} />
      ) : SHORT_KINDS.has(leaf.kind) ? (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Textarea
          id={id}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs break-all"
        />
      )}

      {PREVIEW_KINDS.has(leaf.kind) && <MathPreview value={value} />}
    </div>
  );
}

function ImageField({
  id,
  value,
  questionId,
  onChange,
}: {
  id: string;
  value: string;
  questionId: number;
  onChange: (value: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="grid gap-1.5">
      <div className="flex min-w-0 gap-2">
        <Input
          id={id}
          type="url"
          value={value}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
        />
        <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}>
          {busy ? "Uploading…" : "Choose image"}
        </Button>
        <Button variant="ghost" onClick={() => onChange("")}>
          Clear
        </Button>
      </div>
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          if (!chosen) return;
          setBusy(true);
          setError("");
          try {
            onChange(await uploadQuestionFigure(questionId, chosen));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** The stored string is HTML-with-math, exactly what the page renders
    elsewhere, so it goes in as-is and KaTeX runs over it. */
function MathPreview({ value }: { value: string }) {
  const ref = useRenderedMath([value]);
  if (!/\$|\\\(|\\\[/.test(value)) return null;

  return (
    <div
      ref={ref}
      className="overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 text-sm"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
