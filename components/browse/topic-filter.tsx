"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TopicFilterProps = {
  topics: string[];
  value: string;
  onChange: (topic: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

/** A searchable list, not a <select>: a subject can carry hundreds of topics. */
export function TopicFilter({ topics, value, onChange, loading, disabled }: TopicFilterProps) {
  const [open, setOpen] = useState(false);

  const pick = (topic: string) => {
    onChange(topic);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className="w-full justify-between bg-muted/60 font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {loading ? "Loading topics…" : value || "Any"}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[var(--anchor-width)] min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Search topics…" />
          <CommandList>
            <CommandEmpty>No matching topics.</CommandEmpty>
            <CommandItem value="Any topic" onSelect={() => pick("")}>
              <Check className={cn("size-3.5", value ? "opacity-0" : "opacity-100")} />
              Any topic
            </CommandItem>
            {topics.map((topic) => (
              <CommandItem key={topic} value={topic} onSelect={() => pick(topic)}>
                <Check className={cn("size-3.5", value === topic ? "opacity-100" : "opacity-0")} />
                {topic}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
