"use client";

import { ImagePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FigureContainer } from "@/lib/supabase";

type AddFigureProps = {
  containers: FigureContainer[];
  busy: boolean;
  onAdd: (container: (string | number)[]) => void;
};

/** Adds a figure where the .tex never had one. The places come from the
    server, so this cannot point at somewhere a figure may not go. */
export function AddFigure({ containers, busy, onAdd }: AddFigureProps) {
  const [where, setWhere] = useState<string | null>(null);
  if (!containers.length) return null;

  const items = Object.fromEntries(containers.map((c) => [c.path.join(" "), c.label]));
  const chosen = containers.find((c) => c.path.join(" ") === where) ?? containers[0];

  return (
    <section className="grid gap-3 rounded-lg border border-dashed p-4">
      <div>
        <h3 className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Add a figure
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates an empty figure you can then upload an image into. Use this when the paper has
          no <code>\qfig</code> for the diagram you want to show.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select items={items} value={chosen.path.join(" ")} onValueChange={(v) => setWhere(String(v))}>
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Where?" />
          </SelectTrigger>
          <SelectContent>
            {containers.map((c) => (
              <SelectItem key={c.path.join(" ")} value={c.path.join(" ")}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={busy} onClick={() => onAdd(chosen.path)}>
          <ImagePlus className="size-3.5" />
          Add figure
        </Button>
      </div>
    </section>
  );
}
