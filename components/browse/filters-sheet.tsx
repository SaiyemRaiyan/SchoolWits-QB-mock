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
          <Button variant="outline" size="sm" className="lg:hidden">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
        }
      />
      <SheetContent side="left" className="w-[19rem] overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Refine your search</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
