-- Admin allow-list, used to gate writes in RLS policies (0007/0008).
--
-- Chosen over Supabase custom JWT claims: this only ever needs to cover a
-- handful of trusted accounts (the site owner + maybe one or two others),
-- and a plain table needs no Auth Hook / edge function to mint a claim at
-- login — an admin is just a row, added by hand
-- (`insert into admin_users values ('<uuid>')`) via the SQL editor or the
-- service-role key, and takes effect immediately without the user needing
-- to log out/in to pick up a new claim.
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admin_users is
  'Allow-list of Supabase Auth user ids permitted to write papers/questions/modules/images. Checked via is_admin() in RLS policies. Managed by hand via the service role — there is no public API to add/remove admins (see 0007).';

-- security definer + a fixed search_path: this function is called from
-- inside RLS policies on public.papers/questions/etc, which run as the
-- querying user. Without security definer, a normal (non-admin) user
-- couldn't even read admin_users to check their own status if admin_users
-- had a restrictive select policy — security definer lets the function
-- itself do the lookup with elevated rights, sidestepping that problem
-- entirely, which is why admin_users can stay locked down (0007) without
-- breaking this check for everyone else.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;
