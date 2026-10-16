"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Module } from "@/lib/supabase";

type BuiltModulesListProps = {
  modules: Module[];
  editingId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function BuiltModulesList({ modules, editingId, onEdit, onDelete }: BuiltModulesListProps) {
  if (!modules.length) {
    return <p className="text-sm text-muted-foreground">No modules yet. Build your first above.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {modules.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              {m.title}
              {m.id === editingId && <Badge variant="secondary">Editing</Badge>}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {m.subject ? `${m.subject} · ` : ""}
              {m.topicLabel} &middot; {m.questionUids.length} question
              {m.questionUids.length === 1 ? "" : "s"} &middot;{" "}
              {m.premium ? `${m.currency}${m.price}` : "Free"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(m.id)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(m.id)}>
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
