/** The nav as data, so a new page is one entry rather than an edit in every file. */
export const NAV_ITEMS = [
  { href: "/", label: "Home", adminOnly: false },
  { href: "/browse", label: "Browse", adminOnly: false },
  { href: "/modules", label: "Modules", adminOnly: false },
  { href: "/upload", label: "Upload", adminOnly: true },
] as const;

/** Routes whose header carries a search box. Elsewhere it would do nothing. */
export const SEARCH_ROUTES = ["/browse"];

export const SITE = {
  name: "School Wits",
  tagline: "Question Bank",
  logo: "/img/logo.jpg",
} as const;
