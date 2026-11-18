-- Make a refused write LOOK refused.
--
-- RLS already stopped anonymous writes: the policies in 0007/0008 filter
-- every row out, so a DELETE touches nothing. But PostgREST reports that as
-- `204 No Content` — the same status a genuine delete returns — because
-- "zero rows matched" is a successful statement, not an error. Verified
-- against the live API: an anon DELETE on questions returned 204 while all
-- 177 rows stayed put.
--
-- Data safety was never the problem; legibility was. A client cannot tell
-- "denied" from "done", and neither can anyone reading a log. Removing the
-- table-level grant moves the refusal earlier — Postgres rejects the
-- statement before RLS is consulted, and PostgREST surfaces a real 401/403
-- with "permission denied for table".
--
-- Scope note: this covers `anon` (signed-out visitors — every student, as
-- the site has no student login). It deliberately does NOT touch
-- `authenticated`, because Supabase gives every signed-in user that same
-- role and admin-ness here is a ROW in admin_users, not a database role —
-- revoking from `authenticated` would lock admins out too. Signed-in
-- non-admins therefore still rely on RLS, which stops the write but reports
-- 204. Closing that last gap needs a trigger that raises, or a distinct
-- database role per audience; both are bigger changes than this one.
revoke insert, update, delete on public.papers      from anon;
revoke insert, update, delete on public.questions   from anon;
revoke insert, update, delete on public.paper_images from anon;
revoke insert, update, delete on public.modules     from anon;
revoke insert, update, delete on public.module_questions from anon;
revoke insert, update, delete on public.syllabuses  from anon;

-- SELECT is untouched on purpose: the whole bank is public to read, which
-- is what lets a student browse papers and worked solutions without an
-- account at all.
