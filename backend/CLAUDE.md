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

## Why this exists / what changed and what didn't

The app's `.tex → HTML` parser (`js/latex.js`) is regex-based, not a real
LaTeX engine, and is known to be fragile — see the git history / prior
conversation for detail. It is **deliberately untouched** in this pass. The
schema here stores exactly what that parser already produces (`qHTML`,
`exemplarHTML`, `markScheme` as an array) rather than inventing a more
"structured" representation, so this migration doesn't block or complicate
a future parser rewrite — that rewrite can add columns later without
needing to undo anything here.

The one real structural change from the old IndexedDB shape: **images**.
Today `\image{file}{caption}` gets resolved to a base64 `data:` URL baked
directly into the saved HTML (see `js/latex.js`'s `resolveImageSrc`). That
doesn't belong in a shared Postgres row, so images now live in a public
Storage bucket (`question-images`) with a `question_images` table tracking
them. The upload flow this implies (not yet built): upload each image file
to the bucket *first*, then pass the resulting public URLs into the
`images: {filename: url}` map `TexParse.parse()` already accepts —
`resolveImageSrc` already passes `https://` URLs through unchanged, so
`js/latex.js` needs zero code changes to consume bucket URLs instead of
base64.

## Schema overview

| Table | Purpose | Notable choices |
|---|---|---|
| `papers` | one row per subject/paper/variant/session/year | `paper_key` is a Postgres **generated column** (the natural key, equivalent to the old IndexedDB `paperKey`); `label` stays app-computed (see `paperLabel()` in `src/db.ts`) since its format has a conditional that's easier to keep in one place |
| `questions` | one row per question, FK to `papers` | denormalized subject/paper/variant/session/year columns from the old IndexedDB record are **dropped** — that existed only because IndexedDB has no joins; `topic` is kept since it's genuinely question-level. `mark_scheme` stays `jsonb` (not a child table) — nothing in the app queries mark-scheme rows independently today. A generated `search_vector` + GIN index replaces the old in-memory linear text search. |
| `question_images` | figure metadata | `storage_path` is the bucket object key, `{paper_id}/{question_id}/{filename}` |
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
- **Rewriting `js/latex.js`.** Explicitly deferred; see above.
- **Image bucket wiring.** The frontend is now wired to Postgres (see
  above), but `qHTML`/`exemplarHTML` still carry base64 `data:` images
  inline, exactly as before — the `question_images` table + bucket exist
  but nothing writes to them yet. A later pass would extract these out.

## Project layout

```
backend/
  supabase/migrations/   -- SQL, one file per concern, applied in numeric order
  src/
    types/database.ts    -- generated; run `npm run gen:types` after any schema change
    client.ts             -- createSupabaseClient() (anon) / createServiceRoleClient() (admin scripts only)
    db.ts                  -- SchoolWitsDB class — the DB.* API surface, typed (Node-only, see above)
  .env.example

js/supabase/               -- the browser's actual DB layer, NOT inside backend/:
  config.js                -- window.SUPABASE_URL / SUPABASE_ANON_KEY (safe to ship; RLS is the real boundary)
  store.js                 -- plain-JS DB.* adapter, loaded by index.html/upload.html/modules.html
  admin-gate.js            -- shared login-gate widget for upload.html (whole page) and
                               modules.html (Builder tab only — Storefront stays public)
```

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
