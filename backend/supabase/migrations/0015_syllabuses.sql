-- The subject/code catalogue that drives the Browse page's navigation.
--
-- Why a table and not a constant in JS: new syllabuses must be addable
-- without a code change or a redeploy. Adding Cambridge IGCSE Physics is an
-- INSERT here, and the Browse page picks it up on next load.
--
-- Keyed on `code`, NOT on subject name. The syllabus code is the only
-- stable identifier: it is what \examq carries ("4037/11/M/J/25"), it is
-- what papers.subject_code stores, and it is what the exam board publishes.
-- The subject NAME is derived from a folder name at import time
-- (subjectFromFolder in scripts/import-paper.ts), so it drifts — "Add
-- Maths" vs "Additional Mathematics" — and must never be a join key.
create table public.syllabuses (
  code          text primary key,
  -- Display name, from the board's own syllabus title.
  title         text not null,
  -- 'O Level' | 'IGCSE'. This is the Browse page's FIRST level.
  --
  -- Note the qualification names: both are Cambridge. "Cambridge O Level"
  -- and "Cambridge IGCSE" are two qualifications from one board, so the
  -- top-level split is by qualification, not by board. A "Cambridge vs
  -- IGCSE" split would be a category error.
  qualification text not null,
  board         text not null default 'Cambridge',
  -- Controls list order within a qualification; ties fall back to title.
  sort_order    integer not null default 0,

  constraint syllabuses_code_shape check (code ~ '^[0-9]{4}$')
);

create index syllabuses_qualification_idx on public.syllabuses (qualification, sort_order);

comment on table public.syllabuses is
  'Subject/code catalogue driving Browse navigation. Add a subject with an INSERT, not a code change. Joined to papers on papers.subject_code = syllabuses.code.';

-- Cambridge O Level — every code currently present in the question bank,
-- read from the \examq headers of the real papers.
insert into public.syllabuses (code, title, qualification, sort_order) values
  ('4024', 'Mathematics D',            'O Level', 10),
  ('4037', 'Additional Mathematics',   'O Level', 20),
  ('5054', 'Physics',                  'O Level', 30),
  ('5070', 'Chemistry',                'O Level', 40),
  ('5090', 'Biology',                  'O Level', 50)
on conflict (code) do nothing;

-- Cambridge IGCSE — seeded so the second branch is real rather than a
-- placeholder. No papers carry these codes yet; the Browse page shows a
-- subject only when it has papers, so these stay hidden until one is
-- imported.
insert into public.syllabuses (code, title, qualification, sort_order) values
  ('0580', 'Mathematics',              'IGCSE', 10),
  ('0606', 'Additional Mathematics',   'IGCSE', 20),
  ('0625', 'Physics',                  'IGCSE', 30),
  ('0620', 'Chemistry',                'IGCSE', 40),
  ('0610', 'Biology',                  'IGCSE', 50)
on conflict (code) do nothing;

-- Public read (the nav is public), admin write — same shape as every other
-- table in 0007.
alter table public.syllabuses enable row level security;

create policy syllabuses_public_read on public.syllabuses
  for select to anon, authenticated using (true);

create policy syllabuses_admin_write on public.syllabuses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
