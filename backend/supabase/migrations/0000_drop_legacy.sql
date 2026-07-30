-- Drops an earlier, throwaway version of this schema that was experimented
-- with directly against the live project before this migration set existed
-- (paper_key-as-PK papers, denormalized questions, array-based modules,
-- a profiles/purchases system). None of it matches the schema agreed in
-- the plan (see backend/CLAUDE.md), so it's cleared before laying down the
-- real migrations. Safe to run once; a no-op on a fresh project.
drop table if exists public.purchases cascade;
drop table if exists public.modules cascade;
drop table if exists public.questions cascade;
drop table if exists public.papers cascade;
drop table if exists public.profiles cascade;
