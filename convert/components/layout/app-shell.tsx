"use client";

import { usePathname } from "next/navigation";
import { createContext, use, useMemo, useState } from "react";

import { SEARCH_ROUTES } from "@/config/site";

import { SiteHeader } from "./site-header";

type AppSearch = { value: string; setValue: (value: string) => void };

const AppSearchContext = createContext<AppSearch>({ value: "", setValue: () => {} });

/** Reads the header's search box. Empty on pages that do not show one. */
export function useAppSearch() {
  return use(AppSearchContext);
}

/**
 * The frame every signed-in page shares: one nav, one search box, one place to
 * change either. Pages render only their own content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const search = useMemo(() => ({ value, setValue }), [value]);
  const showSearch = SEARCH_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <AppSearchContext value={search}>
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        <SiteHeader search={showSearch ? search : undefined} />
        {children}
      </div>
    </AppSearchContext>
  );
}
