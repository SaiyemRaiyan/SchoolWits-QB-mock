-- Follow-up fixes from `get_advisors` right after 0007/0008 were applied:
--
-- 1. Each table had a `..._select_public` policy AND a `..._write_admin
--    for all` policy — since `for all` includes SELECT, every read was
--    evaluating two permissive policies instead of one. Splitting the admin
--    policy into insert/update/delete removes the overlap.
-- 2. `auth.uid()` in a policy body gets re-evaluated per row; wrapping it as
--    `(select auth.uid())` lets Postgres evaluate it once per query instead
--    (the standard Supabase RLS perf pattern).
-- 3. `is_admin()` was executable by the `anon` role via RPC for no reason —
--    nothing anonymous needs to call it directly (policies that use it run
--    server-side during the query, not via a client RPC call). Restricting
--    EXECUTE to `authenticated` closes that unnecessary surface.

-- ---- papers ----
drop policy papers_write_admin on public.papers;
create policy papers_insert_admin on public.papers for insert to authenticated with check (public.is_admin());
create policy papers_update_admin on public.papers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy papers_delete_admin on public.papers for delete to authenticated using (public.is_admin());

-- ---- questions ----
drop policy questions_write_admin on public.questions;
create policy questions_insert_admin on public.questions for insert to authenticated with check (public.is_admin());
create policy questions_update_admin on public.questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy questions_delete_admin on public.questions for delete to authenticated using (public.is_admin());

-- ---- question_images ----
drop policy question_images_write_admin on public.question_images;
create policy question_images_insert_admin on public.question_images for insert to authenticated with check (public.is_admin());
create policy question_images_update_admin on public.question_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy question_images_delete_admin on public.question_images for delete to authenticated using (public.is_admin());

-- ---- modules ----
drop policy modules_write_admin on public.modules;
create policy modules_insert_admin on public.modules for insert to authenticated with check (public.is_admin());
create policy modules_update_admin on public.modules for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy modules_delete_admin on public.modules for delete to authenticated using (public.is_admin());

-- ---- module_questions ----
drop policy module_questions_write_admin on public.module_questions;
create policy module_questions_insert_admin on public.module_questions for insert to authenticated with check (public.is_admin());
create policy module_questions_update_admin on public.module_questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy module_questions_delete_admin on public.module_questions for delete to authenticated using (public.is_admin());

-- ---- admin_users: re-create with (select auth.uid()) ----
drop policy admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- ---- storage.objects: re-create admin policies with (select ...) form ----
-- (is_admin() itself already reads auth.uid() once internally via a stable
-- function, but the bucket_id + is_admin() conjunction in each USING/WITH
-- CHECK clause is left as-is — bucket_id is a plain column compare, not a
-- per-row auth.*() call, so there's nothing further to hoist there.)

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
