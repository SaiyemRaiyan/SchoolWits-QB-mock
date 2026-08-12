# Deleted functions — archived source

These three Edge Functions were deployed around 2026-07-29 and **deleted on
2026-08-12**. They were never in this repo; the only copy of their source
was the deployment itself, so it is preserved here rather than lost.

Do not redeploy them. They are kept for reference and for the record of what
was live.

## Why they were deleted

**They were exploitable by anyone.** Each one:

1. built its client with `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS entirely
2. performed **no admin check** of any kind
3. relied solely on `verify_jwt: true`

Point 3 is the flaw. `verify_jwt` only proves the caller presented *a valid
JWT* — and the **anon key is a valid JWT**. It is served publicly in
`js/supabase/config.js` on every page load. So any visitor who read the page
source could call these endpoints and act with service-role privileges:

| Function | Exposure |
|---|---|
| `delete-paper` | delete any paper, cascading to its questions and images |
| `save-paper` | write arbitrary rows into `papers` and `questions` |
| `update-question` | overwrite any question's fields |

This was confirmed by reading the source, not by firing the exploit.

**They were also already dead and broken:**

- nothing called them — the only caller was `js/upload.js`, deleted when the
  browser parser was removed
- they wrote columns that no longer exist (`uid`, `paper_key`, `subject`,
  `q_html`, `mark_scheme` on `questions`); some died in migration `0002`,
  the rest in `0011`

## What replaces them

`../parse-paper/` does what `save-paper` did, correctly:

- writes through the **caller's** client, so RLS authorises every statement
- calls `is_admin()` itself rather than trusting `verify_jwt`
- never has the service-role key in scope at all

`delete-paper` and `update-question` have no replacement yet. When they are
needed, build them the same way — **caller's client, explicit `is_admin()`,
no service-role key**. A function holding the service-role key has to
re-implement every authorisation rule RLS already enforces, and these three
are what that looks like when it is forgotten.

## Follow-up worth doing

The service-role key was reachable through these endpoints for roughly two
weeks. Rotating it in the Supabase dashboard closes that off.
