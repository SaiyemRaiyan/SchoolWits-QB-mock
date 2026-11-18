-- 0000_drop_legacy.sql dropped the throwaway public.profiles table but
-- missed a trigger on auth.users that depended on it: on_auth_user_created
-- -> handle_new_user(), which did `insert into public.profiles (id,
-- display_name) values (...)` on every signup. Since profiles no longer
-- exists, that insert has been failing with "Database error saving new
-- user" for every signup since 0000 ran — this app's admin model
-- (admin_users, populated by hand) never needed a profiles-on-signup
-- trigger in the first place, so this removes it rather than recreating
-- profiles.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
