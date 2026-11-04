"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ModuleDraft = {
  title: string;
  description: string;
  premium: boolean;
  price: number;
};

type ModuleFormProps = {
  draft: ModuleDraft;
  onChange: (patch: Partial<ModuleDraft>) => void;
  /** Every topic across the picked questions; clicking one excludes it. */
  topics: string[];
  excluded: Set<string>;
  onToggleTopic: (topic: string) => void;
  onSave: () => void;
  saving: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
};

const ACCESS = { free: "Free", premium: "Premium (paid)" };

export function ModuleForm({
  draft,
  onChange,
  topics,
  excluded,
  onToggleTopic,
  onSave,
  saving,
  status,
}: ModuleFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="mod-title">Module title</Label>
        <Input
          id="mod-title"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Forces & Motion: Full Topic Pack"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Topics covered</Label>
        <p className="text-xs text-muted-foreground">
          Filled in from what you picked. Click one to leave it off the pack.
        </p>
        {topics.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {topics.map((topic) => (
              <Button
                key={topic}
                type="button"
                size="sm"
                variant={excluded.has(topic) ? "outline" : "default"}
                onClick={() => onToggleTopic(topic)}
                className="h-7 rounded-full text-xs font-normal"
              >
                {topic}
              </Button>
            ))}
          </div>
        ) : (
          <p className="pt-1 text-xs text-muted-foreground">
            Select some questions and their topics land here.
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="mod-desc">Description</Label>
        <Textarea
          id="mod-desc"
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's in this pack, and who it's for."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="mod-access">Access</Label>
          <Select
            items={ACCESS}
            value={draft.premium ? "premium" : "free"}
            onValueChange={(v) => onChange({ premium: v === "premium", price: v === "free" ? 0 : draft.price })}
          >
            <SelectTrigger id="mod-access" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium (paid)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-price">Price (&#2547;)</Label>
          <Input
            id="mod-price"
            type="number"
            min={0}
            step={1}
            disabled={!draft.premium}
            value={draft.price}
            onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save module"}
      </Button>

      {status && (
        <p
          className={
            status.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
