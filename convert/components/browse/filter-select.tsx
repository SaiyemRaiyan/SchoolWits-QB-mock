"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Base UI has no empty-string item, so "no filter" needs a sentinel value. */
const ANY = "__any";

export type Option = { value: string; label: string };

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  anyLabel?: string;
  disabled?: boolean;
};

export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  anyLabel = "Any",
  disabled,
}: FilterSelectProps) {
  const items = { [ANY]: anyLabel, ...Object.fromEntries(options.map((o) => [o.value, o.label])) };

  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={id}
        className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase"
      >
        {label}
      </Label>
      <Select
        items={items}
        value={value || ANY}
        onValueChange={(next) => onChange(next === ANY ? "" : String(next))}
        disabled={disabled}
      >
        <SelectTrigger id={id} size="sm" className="w-full bg-muted/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
