# backend/ — Supabase data layer

This folder is the Supabase (Postgres + Storage + Auth) backend for School
Wits QB, replacing the browser-only IndexedDB store described in the root
`README.md`. It's a standalone npm + TypeScript project.

**The frontend pages do NOT import anything from this folder.** They're
plain `<script>`-tag HTML with no build step (a deliberate constraint —
see `CLAUDE.md` at the repo root), so `backend/src/db.ts` — which needs a
bundler to run in a browser — couldn't be shared with them directly.
Instead, `js/supabase/store.js` is a **separate, plain-JS mirror** of the
same `DB.*` API, loaded via CDN `<script>` tags, that `index.html`/
`upload.html`/`modules.html` actually use. `backend/src/db.ts` remains the
Node-oriented version for admin/ops scripts (seeding `admin_users`, bulk
imports) run from a terminal, not a browser. **Keep both in sync by hand**
when the schema changes — there's no shared code path between them, that's
the accepted tradeoff for not introducing a bundler.

That sync burden is now much smaller than it was: `store.js` is **read-only
for question content**. Questions are written by `scripts/import-paper.ts`
(and later the Edge Function), never by the browser, so there is no
`addQuestions` in `store.js` to keep aligned. What the browser still writes
is videos and modules, which are user actions rather than ingest.

## The parser rewrite happened

The old `.tex → HTML` parser (`js/latex.js`) was regex-based, fragile, and
ran in the browser. It is **gone**, replaced by `src/latex/` — a real
structured parser that emits JSON, not HTML blobs.

That changed which direction everything flows:

```
.tex  --[ src/latex, Node/Deno only ]-->  JSON
JSON  --[ scripts/import-paper.ts    ]-->  Postgres (questions.content)
JSON  --[ js/render/, browser only   ]-->  HTML on the page
```

**The parser never runs in a browser and the renderer never runs in Node.**
That is what keeps them from being two copies of the same thing: `src/latex`
knows LaTeX and emits only inline formatting tags; `js/render` knows CSS
classes and emits only structure. They meet at the JSON contract in
`src/latex/types.ts` and nowhere else.

`src/latex/` has **zero dependencies and zero `node:` imports**, which is
deliberate — it is what lets the same files run unmodified inside a Supabase
Edge Function (Deno) once the browser upload path is rebuilt against it.
Only `scripts/` and `tests/integration/` touch `node:fs`; keep it that way.

Images work the way the old notes anticipated, just keyed differently:
figures upload to the `question-images` bucket **first**, and the resulting
`{ filename: url }` map is an *input* to the parse. The parser resolves
`\qfig{fig1.png}` against it and writes the real URL into the figure block,
so nothing rewrites image paths afterwards and no base64 is ever stored.
Because that happens before any question row exists, the tracking table is
`paper_images`, keyed by `(paper_id, filename)` — see `0012`.

## Schema overview

| Table | Purpose | Notable choices |
|---|---|---|
| `papers` | one row per subject/paper/variant/session/year | `paper_key` is a Postgres **generated column** (the natural key, equivalent to the old IndexedDB `paperKey`); `label` stays app-computed (see `paperLabel()` in `src/db.ts`) since its format has a conditional that's easier to keep in one place |
| `questions` | one row per question, FK to `papers` | `content jsonb` holds the whole parsed question (stem, parts tree, options, mark scheme, worked solution). One column, not four, for the same reason `mark_scheme` was jsonb before: nothing queries the pieces independently. `topics text[]` (GIN) replaced the single `topic` string — `\examq` genuinely carries a list. `kind` and `marks` are columns because they're filtered/sorted on. See `0011`. |
| `paper_images` | figure metadata | keyed `(paper_id, filename)`, because figures upload *before* the questions exist and `\qfig` refers to them by bare filename. `storage_path` is `{paper_key}/{filename}` with unsafe characters stripped — `paper_key` is pipe-delimited and Storage rejects `\|`. See `0012`. |
| `modules` / `module_questions` | topic packs | `module_questions` replaces the old `questionUids` string array with a real join table; `sort_order` preserves pick order |
| `admin_users` / `is_admin()` | write gating | a plain allow-list table, not custom JWT claims — simplest thing that works for a handful of trusted admin accounts; see `0006_admin_users.sql` |

Full DDL with per-decision comments lives in `supabase/migrations/*.sql` —
read those before changing the schema, they explain *why*, not just *what*.

## Auth & RLS model

- **Public (anon key, no login)**: read-only, everywhere. There's no
  premium-gating implemented yet — see "Explicitly out of scope" below.
- **Admin (a row in `admin_users`)**: full read/write on every app table,
  via the `public.is_admin()` helper checked in each RLS policy.
- Nobody, including admins, can write to `admin_users` through the public
  API — the roster is managed by hand via the Supabase SQL editor or the
  service-role key, specifically to prevent one compromised admin account
  from granting itself/others further access.
- Storage bucket `question-images` is **public** (public read, admin-only
  write) — simplest option since there's no premium content to gate yet.

Two low-severity advisor warnings were accepted rather than fixed:
`is_admin()` is callable (harmlessly — it just returns `false`) by
unauthenticated callers, and the public bucket allows listing its file
list. Neither exposes anything sensitive given everything in this bucket
is a public question figure.

## Explicitly out of scope for this pass

- **Purchases / pricing.** There's no real pricing model yet, so no
  `purchases` table, no student accounts, no payment integration. Checkout
  stays exactly what it is today: a `sw_purchase_<id>` flag in
  `localStorage`, unrelated to this backend. `isPurchased`/`markPurchased`
  from `js/store.js` are **not** ported into `src/db.ts` — see the comment
  at the bottom of that file.
- **Quick Add.** `js/compose.js` let an admin paste one question's LaTeX
  at a time. It was deleted with the browser parser and not rebuilt: the
  new parser has no single-question entry point, and all six sample papers
  use the two-file flow. Adding it back means adding that entry point to
  `src/latex/`, not just a form.

## Project layout

```
backend/
  supabase/migrations/   -- SQL, one file per concern, applied in numeric order
  src/
    latex/                -- the .tex -> JSON parser. NO dependencies, NO node:
                             imports, so it also runs in a Deno Edge Function.
                             types.ts is the JSON contract js/render/ reads.
    types/database.ts    -- generated; run `npm run gen:types` after any schema change
    client.ts             -- createSupabaseClient() (anon) / createServiceRoleClient() (admin scripts only)
    db.ts                  -- SchoolWitsDB class — the DB.* API surface, typed (Node-only, see above)
  scripts/
    import-paper.ts       -- npm run import: figures -> bucket, parse, write rows
    parse-paper.ts        -- npm run parse: report + JSON, writes nothing
    preview.ts            -- npm run preview: self-contained HTML of a parsed paper
  tests/                  -- vitest; latex/ unit specs, render/ drives js/render/,
                             integration/ parses the six real papers in place
  .env.example

js/supabase/               -- the browser's actual DB layer, NOT inside backend/:
  config.js                -- window.SUPABASE_URL / SUPABASE_ANON_KEY (safe to ship; RLS is the real boundary)
  store.js                 -- plain-JS DB.* adapter, loaded by index.html/upload.html/modules.html
  admin-gate.js            -- shared login-gate widget for upload.html (whole page) and
                               modules.html (Builder tab only — Storefront stays public)

js/render/                 -- questions.content (JSON) -> HTML, browser only:
  escape.js                  shared escaping
  block-renderer.js          text / figure / table blocks
  part-renderer.js           the parts+subparts tree
  options-renderer.js        MCQ options (records which of the four .tex
                               encodings the source used)
  mark-scheme-renderer.js    rows -> the shape app.js/modules.js draw
  solution-renderer.js       worked-solution segments -> exemplar markup
  question-renderer.js       the facade the pages actually call
```

## Ingest

Today, from a terminal:

```
npm run import -- "Physics MJ25 21"      # one paper
npm run import -- --all                  # every paper
npm run import -- "physics 21" --dry-run # parse + report, write nothing
```

Order is not arbitrary — figures upload first because their URLs are an
input to the parse:

```
figures -> question-images bucket -> { filename: url }
                                        |
                        .tex + that map -> src/latex -> JSON
                                                         |
                                          papers + questions + paper_images
```

Needs `SUPABASE_SERVICE_ROLE_KEY` (it bypasses RLS, which is why this is
terminal-only and the key must never reach a browser).

Or from the browser, which is what non-technical admins use: `upload.html`
signs in, uploads the figures to the bucket, POSTs the `.tex` to
`parse-paper`, renders the returned JSON with `js/render/`, and only writes
when the admin confirms. See `supabase/functions/parse-paper/README.md`.

Both paths run the same parser. The browser one never parses anything
itself — that is the whole reason the Edge Function exists.

Headroom: the largest paper parses in **9.6ms** against a 2s per-request
CPU limit, and an upload costs 2-3 invocations against 500,000/month.

## Working on this

```
cd backend
npm install
cp .env.example .env   # fill in SUPABASE_ANON_KEY (and SERVICE_ROLE for admin scripts)
npm run typecheck
npm run gen:types       # after applying a new migration
```

To add an admin (there's no public sign-up flow for this — deliberately):
create the user via Supabase Auth (dashboard or `auth.users`), then insert
their `id` into `admin_users` using the service-role key or the SQL editor.
