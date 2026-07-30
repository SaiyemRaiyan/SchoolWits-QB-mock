# CLAUDE.md

Guidance for working in this repo. See `README.md` first for the product
description (pages, data model, `.tex` upload format).

## Structure

- `index.html`, `upload.html`, `modules.html` — the three frontend pages,
  each with matching logic in `js/` (`app.js`, `upload.js`, `modules.js`).
  Data now lives in Supabase Postgres, via `js/supabase/store.js` (a
  plain-JS `DB.*` adapter loaded by CDN `<script>` tag — no bundler). `js/
  store.js` (the old IndexedDB version) is **no longer loaded by any
  page** but is kept in the repo for reference; don't resurrect it without
  removing the Supabase wiring first. `upload.html` is fully admin-gated;
  `modules.html` gates only its Builder tab — the Storefront stays public.
- `js/latex.js` — the `.tex`-dialect parser (`TexParse`). Regex/string-based,
  not a real LaTeX engine; several fallback "dialect" heuristics exist for
  pasted real-world exam source that doesn't use this app's own tags. Known
  to be fragile — a rewrite is planned but has **not** happened yet; treat
  it as stable-but-imperfect and don't casually refactor it as a side
  effect of unrelated work. Untouched by the Supabase migration — question
  content is still saved as the same rendered HTML/base64-images this
  parser has always produced.
- `samples/` — `.tex` templates matching the parser's expected format.
- `backend/` — the Supabase (Postgres/Storage/Auth) schema, migrations, and
  a Node-only TypeScript mirror of the DB API for admin/ops scripts. See
  `backend/CLAUDE.md` for the schema, RLS model, why `js/supabase/store.js`
  exists as a separate copy instead of importing from here, and what's
  deliberately out of scope (pricing/purchases, image bucket wiring,
  parser changes). Read that file before touching anything under
  `backend/` or `js/supabase/`.
- `.mcp.json` — points Claude Code's Supabase MCP server at the live
  project backing `backend/`.

## Working conventions

- The `.tex` parser and the Supabase schema are being evolved
  independently and deliberately out of sync for now: the schema stores
  exactly what the parser produces today (rendered HTML blobs), not a
  "better" structured version — don't invent structured content fields
  without checking `backend/CLAUDE.md`'s rationale first.
- Comments in `backend/` explain *why*, not *what* — this project is being
  built collaboratively with someone still learning the stack, so lean
  toward slightly more explanatory comments there than usual, especially
  around anything that deviates from the obvious/naive approach.
