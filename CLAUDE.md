# CLAUDE.md

Guidance for working in this repo. See `README.md` first for the product
description (pages, data model, `.tex` upload format).

## Structure

- `index.html`, `upload.html`, `modules.html` — the three frontend pages,
  each with matching logic in `js/` (`app.js`, `modules.js`). Data lives in
  Supabase Postgres, via `js/supabase/store.js` (a plain-JS `DB.*` adapter
  loaded by CDN `<script>` tag — no bundler). `upload.html` is fully
  admin-gated; `modules.html` gates only its Builder tab — the Storefront
  stays public.
- `js/render/` — turns a question's stored `content` JSON into HTML. Plain
  JS classes, one per concern, loaded as `<script>` tags. The pages call
  `SWRender.QuestionRenderer`'s three methods (`toQuestionHtml`,
  `toMarkSchemeRows`, `toExemplarHtml`) and nothing else.
- **The `.tex` parser is no longer in the browser.** `js/latex.js` has been
  deleted, along with `js/compose.js`, `js/store.js` and `js/seed-data.js`.
  Parsing happens in `backend/src/latex/` and runs in Node (the `npm run
  import` CLI) and Deno (the `parse-paper` Edge Function). `js/upload.js`
  was rewritten against that function: it uploads figures, POSTs the
  `.tex`, and renders the reply — it never parses anything itself.
- `templates/` — the canonical `.tex` templates every paper is written
  against, plus a spec of the format and an audit of where the real papers
  deviate from it. Read this before touching the parser.
- `samples/` — older `.tex` templates from the previous parser's dialect.
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

- **Parser and renderer are one pipeline cut in half, not two copies.**
  `backend/src/latex/` knows LaTeX and emits only inline formatting tags;
  `js/render/` knows CSS classes and emits only structure. Neither does the
  other's job, and they share no code — they meet at the JSON contract in
  `backend/src/latex/types.ts`. If you find yourself parsing LaTeX in
  `js/render/` or hardcoding a CSS class in `backend/src/latex/`, that is
  the mistake.
- `backend/src/latex/` must stay **dependency-free with no `node:`
  imports**, so the same files can run inside a Deno Edge Function. Node
  built-ins belong in `backend/scripts/` and the integration tests only.
- Comments in `backend/` explain *why*, not *what* — this project is being
  built collaboratively with someone still learning the stack, so lean
  toward slightly more explanatory comments there than usual, especially
  around anything that deviates from the obvious/naive approach.
