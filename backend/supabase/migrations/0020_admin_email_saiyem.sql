-- Add a second admin.
--
-- The roster lives in `admin_emails` (0016), not `admin_users`: email
-- survives an auth-provider change, a user id does not. The trigger on
-- auth.users grants `admin_users` membership on insert/update of the email
-- columns, so a user who signs up AFTER this runs is granted automatically.
--
-- A user who already exists is not: the trigger does not fire retroactively.
-- Hence the backfill below, which is the same statement 0016 ended with.
-- Both halves are idempotent, so this is safe to re-run.
insert into public.admin_emails (email, note)
values ('saiyemraiyan448@gmail.com', 'Second admin')
on conflict (email) do nothing;

insert into public.admin_users (user_id)
select u.id
from auth.users u
join public.admin_emails ae on ae.email = lower(u.email)
where u.email_confirmed_at is not null
on conflict (user_id) do nothing;
