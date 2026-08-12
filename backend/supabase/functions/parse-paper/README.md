# parse-paper

The ingest endpoint behind `upload.html`. Parses a `.tex` question/answer
pair and, on confirm, writes the paper and its questions.

## Why the parser is vendored

`vendor/latex.js` is a **generated** bundle of `backend/src/latex/`. Do not
edit it — edit the source and run `npm run build:function`.

It exists because Deno resolves import specifiers literally, and the
TypeScript sources use `.js` specifiers (required by `module: NodeNext`)
that only point at real files after a compile step. Bundling also means a
deploy cannot silently omit one module.

`src/latex/` is dependency-free and free of `node:` imports specifically so
this works. If you add a Node built-in to it, this function stops building —
put such code in `backend/scripts/` instead.

## Deploying

```sh
cd backend
npm run deploy:function
```

That rebuilds `vendor/latex.js` from source and deploys. It needs the
Supabase CLI, authenticated once:

```sh
npm i -g supabase          # or: brew install supabase/tap/supabase
supabase login             # or export SUPABASE_ACCESS_TOKEN=...
```

Rebuild-then-deploy is one script on purpose: deploying a stale bundle
after changing the parser is the obvious mistake, and this makes it
impossible.

## Protocol

Both phases are POSTs to the same endpoint, with the caller's JWT in
`Authorization`.

```jsonc
// preview — parses and returns, writes nothing
{ "qpTex": "...", "qaTex": "...", "images": { "fig1.png": "https://..." } }

// commit — parses AGAIN, then writes
{ "qpTex": "...", "qaTex": "...", "images": {...}, "subject": "Physics", "commit": true }
```

Response is the `ParsedPaper` shape from `src/latex/types.ts`, plus
`committed`, and on commit `paperId` and `questionCount`.

Commit re-parses rather than trusting JSON from the client. The parser is
deterministic, so the result is identical — but it means the database can
only ever contain something the parser actually produced.

## Auth

`verify_jwt` is on, so Supabase rejects an invalid token before the function
runs. That only proves the caller is *signed in*, so the function also calls
`is_admin()` itself and returns 403 otherwise.

Writes go through the **caller's** client, not the service role. RLS is what
authorises them, so a bug here cannot write anything the caller could not
already write. The service-role key is never present in this function.

## Images

Figures do **not** pass through this function. The browser uploads them to
the `question-images` bucket and sends `{ filename: publicUrl }`, which is an
*input* to the parse — `\qfig{fig1.png}` resolves to the real URL during
parsing rather than being patched afterwards. It also keeps request bodies
around 45KB instead of megabytes.

`paper_images` rows are recovered from those URLs, so the storage path does
not have to be sent separately.

## Limits

Free-tier Edge Functions allow 2s CPU per request. The largest sample paper
(Physics 5054/11, 40 questions, 43KB of LaTeX) parses in **9.6ms** — roughly
200x headroom. Invocations are 2 per upload against a 500,000/month quota.
