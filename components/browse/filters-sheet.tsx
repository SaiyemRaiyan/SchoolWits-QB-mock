"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** The same rail, as a drawer, for screens too narrow to show it beside the results. */
export function FiltersSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white xl:hidden">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-[19rem] overflow-y-auto border-white/10 bg-[var(--sw-ink)] p-0 [&_[data-slot=sheet-close]]:z-10 [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10 [&_[data-slot=sheet-close]]:hover:text-white"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Refine your search</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
