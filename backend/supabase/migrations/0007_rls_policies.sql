-- Enable RLS on every app table: public (anon + authenticated) can read
-- everything, only allow-listed admins (public.is_admin(), see 0006) can
-- write. `for all` covers insert/update/delete in one policy per table
-- since the admin rule is identical for all three — kept short and single
-- purpose rather than four near-duplicate policies per table.
alter table public.papers            enable row level security;
alter table public.questions         enable row level security;
alter table public.question_images   enable row level security;
alter table public.modules           enable row level security;
alter table public.module_questions  enable row level security;
alter table public.admin_users       enable row level security;

-- ---- papers ----
create policy papers_select_public on public.papers
  for select to anon, authenticated using (true);
create policy papers_write_admin on public.papers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- questions ----
create policy questions_select_public on public.questions
  for select to anon, authenticated using (true);
create policy questions_write_admin on public.questions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- question_images ----
create policy question_images_select_public on public.question_images
  for select to anon, authenticated using (true);
create policy question_images_write_admin on public.question_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- modules ----
create policy modules_select_public on public.modules
  for select to anon, authenticated using (true);
create policy modules_write_admin on public.modules
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- module_questions ----
create policy module_questions_select_public on public.module_questions
  for select to anon, authenticated using (true);
create policy module_questions_write_admin on public.module_questions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- admin_users ----
-- Deliberately no insert/update/delete policy for ANY role, including
-- admins themselves: if an admin could add rows here through the public
-- API, one compromised admin account could grant itself/others unlimited
-- further access. The roster is only ever changed via the SQL editor or
-- service-role key, outside RLS entirely. Admins may only read their own
-- membership row (used by is_admin(), and useful for a frontend "am I an
-- admin" check without needing a service-role call).
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = auth.uid());
