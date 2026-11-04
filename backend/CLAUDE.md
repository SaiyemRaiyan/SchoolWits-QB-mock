# backend/ — Supabase data layer

This folder is the Supabase (Postgres + Storage + Auth) backend for School
Wits QB. It's a standalone npm + TypeScript project, separate from the Next
app at the repo root.

**The app does NOT import anything from this folder**, with one deliberate
exception noted below. `backend/src/db.ts` is the Node-oriented copy of the
`DB.*` API, for admin/ops scripts (seeding `admin_users`, bulk imports) run
from a terminal. The app has its own data layer in `lib/supabase/`, split by
domain. **Keep the two in sync by hand** when the schema changes — there is
no shared code path, which is the accepted tradeoff for keeping the app's
bundle free of Node-oriented code.

That sync burden is small: `lib/supabase/` is **read-only for question
content**. Questions are written by `scripts/import-paper.ts` and by the
`parse-paper` / `update-question` Edge Functions, never by a plain table
write from the browser. What the app still writes directly is videos and
modules, which are user actions rather than ingest.

The exception: `tests/render/renderer.test.ts` imports `lib/render/` from
the app, because the parser here and the renderer there are two halves of
one pipeline and only a joint test catches a change on one side breaking the
other. `lib/render/` has no imports of its own, which is what keeps that
cheap.

## The parser rewrite happened

The old `.tex → HTML` parser (`js/latex.js`) was regex-based, fragile, and
ran in the browser. It is **gone**, replaced by `src/latex/` — a real
structured parser that emits JSON, not HTML blobs.

That changed which direction everything flows:

```
.tex  --[ src/latex, Node/Deno only ]-->  JSON
JSON  --[ scripts/import-paper.ts    ]-->  Postgres (questions.content)
JSON  --[ lib/render/, browser only  ]-->  HTML on the page
```

**The parser never runs in a browser and the renderer never runs in Node.**
That is what keeps them from being two copies of the same thing: `src/latex`
knows LaTeX and emits only inline formatting tags; `lib/render` knows CSS
classes and emits only structure. They meet at the JSON contract in
`src/latex/types.ts`, mirrored for the renderer in `lib/render/types.ts`,
and nowhere else.

`src/latex/` has **zero dependencies and zero `node:` imports**, which is
deliberate — it is what lets the same files run unmodified inside a Supabase
Edge Function (Deno), which is how the browser upload path reaches them.
Only `scripts/` and `tests/integration/` touch `node:fs`; keep it that way.

Images work the way the old notes anticipated, just keyed differently:
figures upload to the `question-images` bucket **first**, and the resulting
`{ filename: url }` map is an _input_ to the parse. The parser resolves
`\qfig{fig1.png}` against it and writes the real URL into the figure block,
so nothing rewrites image paths afterwards and no base64 is ever stored.
Because that happens before any question row exists, the tracking table is
`paper_images`, keyed by `(paper_id, filename)` — see `0012`.

## Schema overview

| Table                          | Purpose                                        | Notable choices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `papers`                       | one row per subject/paper/variant/session/year | `paper_key` is a Postgres **generated column** (the natural key, equivalent to the old IndexedDB `paperKey`); `label` stays app-computed (see `paperLabel()` in `src/db.ts`) since its format has a conditional that's easier to keep in one place                                                                                                                                                                                                                                                            |
| `questions`                    | one row per question, FK to `papers`           | `content jsonb` holds the whole parsed question (stem, parts tree, options, mark scheme, worked solution). One column, not four, for the same reason `mark_scheme` was jsonb before: nothing queries the pieces independently. `topics text[]` (GIN) replaced the single `topic` string — `\examq` genuinely carries a list. `kind` and `marks` are columns because they're filtered/sorted on. See `0011`.                                                                                                   |
| `paper_images`                 | figure metadata                                | keyed `(paper_id, filename)`, because figures upload _before_ the questions exist and `\qfig` refers to them by bare filename. `storage_path` is `{paper_key}/{filename}` with unsafe characters stripped — `paper_key` is pipe-delimited and Storage rejects `\|`. See `0012`.                                                                                                                                                                                                                               |
| `modules` / `module_questions` | topic packs                                    | `module_questions` replaces the old `questionUids` string array with a real join table; `sort_order` preserves pick order. `content_override jsonb` (0018) is that module's **own edited copy** of the question — null means render the original. It is why `saveModule` is upsert-then-prune rather than delete-then-insert: the old wholesale replace would have wiped every edit on each save. Written only by the `update-question` Edge Function, and deliberately **not** cleared by a paper re-import. |
| `admin_users` / `is_admin()`   | write gating                                   | a plain allow-list table, not custom JWT claims — simplest thing that works for a handful of trusted admin accounts; see `0006_admin_users.sql`                                                                                                                                                                                                                                                                                                                                                               |

Full DDL with per-decision comments lives in `supabase/migrations/*.sql` —
read those before changing the schema, they explain _why_, not just _what_.

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
                             types.ts is the JSON contract lib/render/ reads.
    types/database.ts    -- generated; run `npm run gen:types` after any schema change
    client.ts             -- createSupabaseClient() (anon) / createServiceRoleClient() (admin scripts only)
    db.ts                  -- SchoolWitsDB class — the DB.* API surface, typed (Node-only, see above)
  scripts/
    import-paper.ts       -- npm run import: figures -> bucket, parse, write rows
    parse-paper.ts        -- npm run parse: report + JSON, writes nothing
  tests/                  -- vitest; latex/ unit specs, render/ drives lib/render/,
                             integration/ parses the six real papers in place
  .env.example

../lib/supabase/           -- the app's data layer, NOT inside backend/:
  client.ts                -- the one supabase-js client
  mappers.ts               -- snake_case rows -> camelCase records
  papers/questions/modules/facets/syllabuses/auth/edit/parse-paper.ts
  index.ts                 -- the single import point: "@/lib/supabase"

../config/supabase.ts      -- the URL + publishable key (safe to ship; RLS is
                              the real boundary), committed so a deploy needs
                              no environment variables

../lib/render/             -- questions.content (JSON) -> HTML, browser only:
  types.ts                   the parser contract this half reads
  escape/blocks/parts/options/mark-scheme/solution.ts
  index.ts                   the facade the components call
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

Or from the browser, which is what non-technical admins use: `/upload`
signs in, uploads the figures to the bucket, POSTs the `.tex` to
`parse-paper`, renders the returned JSON with `lib/render/`, and only writes
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
