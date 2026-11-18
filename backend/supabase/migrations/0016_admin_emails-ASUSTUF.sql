-- Tie admin status to an EMAIL, not a Supabase user id.
--
-- 0006 keyed admin_users on auth.users(id). That is stable only while the
-- auth method is stable: signing in with Google can mint a NEW user row
-- (identity auto-linking depends on project settings and on the email being
-- verified on both sides), and a uuid-keyed allow-list silently loses admin
-- the moment that happens. Email survives the switch, which is the property
-- we actually want.
--
-- admin_users stays exactly as it is and is_admin() is untouched, so every
-- RLS policy written in 0007/0008 keeps working. This migration only adds a
-- second, more durable source of truth that POPULATES admin_users.
create table if not exists public.admin_emails (
  -- Stored lowercase; the trigger lowercases what it compares. Email
  -- casing is not meaningful for identity here and Google may return a
  -- different case than the user typed at signup.
  email       text primary key,
  note        text not null default '',
  created_at  timestamptz not null default now(),

  constraint admin_emails_lowercase check (email = lower(email)),
  constraint admin_emails_shape check (email like '%_@_%._%')
);

comment on table public.admin_emails is
  'Emails that should hold admin. A trigger on auth.users grants admin_users membership to any user whose VERIFIED email appears here, so admin survives an auth-provider change (email/password -> Google). Managed by hand via the service role; no public API writes it.';

insert into public.admin_emails (email, note)
values ('kmosabbir@gmail.com', 'Site owner')
on conflict (email) do nothing;

-- Locked down exactly like admin_users (0007): RLS on, no policies at all,
-- so PostgREST denies every operation for anon and authenticated alike.
-- Only the service role (which bypasses RLS) can change the roster.
alter table public.admin_emails enable row level security;

-- ---------------------------------------------------------------- trigger
-- IMPORTANT: this runs inside the signup/sign-in transaction. 0010 exists
-- because an earlier trigger on auth.users raised, and the result was
-- "Database error saving new user" on EVERY signup until it was dropped.
-- So the whole body is wrapped: failing to grant admin must never be able
-- to stop someone authenticating. A missed grant is recoverable by hand; a
-- login outage is not.
create or replace function public.sync_admin_from_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    -- Verified only. An unverified address proves nothing about who owns
    -- it, and granting admin on one would let anyone claim the account by
    -- signing up with the owner's address.
    if new.email is not null
       and new.email_confirmed_at is not null
       and exists (select 1 from public.admin_emails ae where ae.email = lower(new.email))
    then
      insert into public.admin_users (user_id)
      values (new.id)
      on conflict (user_id) do nothing;
    end if;
  exception when others then
    raise warning 'sync_admin_from_email: could not grant admin to % (%): %',
      new.id, new.email, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_admin_sync on auth.users;
create trigger on_auth_user_admin_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_admin_from_email();

-- Backfill: existing verified users whose email is on the list.
insert into public.admin_users (user_id)
select u.id
from auth.users u
join public.admin_emails ae on ae.email = lower(u.email)
where u.email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Note on REVOKE: removing a row from admin_emails does NOT revoke an
-- existing admin_users row. Revocation is deliberately manual
-- (`delete from admin_users where user_id = ...`) so that losing a row here
-- can never silently lock the owner out of their own project.
