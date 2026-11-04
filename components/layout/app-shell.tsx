"use client";

import { usePathname } from "next/navigation";

import { SEARCH_ROUTES } from "@/config/site";
import { useUrlState } from "@/hooks/use-url-state";

import { SiteHeader } from "./site-header";

/** The search box writes ?q=, which is also where Browse reads it from. */
export function useAppSearch() {
  const [params, setParams] = useUrlState();
  return {
    value: params.get("q") ?? "",
    setValue: (value: string) => setParams({ q: value }),
  };
}

/**
 * The frame every signed-in page shares: one nav, one search box, one place
 * to change either. Pages render only their own content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const search = useAppSearch();
  const showSearch = SEARCH_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <SiteHeader search={showSearch ? search : undefined} />
      {children}
    </div>
  );
}
