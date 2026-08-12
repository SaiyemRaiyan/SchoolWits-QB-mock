-- Restructure `questions` around the parser's structured JSON.
--
-- 0002_questions.sql deliberately stored exactly what the OLD regex parser
-- (js/latex.js) produced: q_html / exemplar_html as rendered HTML blobs and
-- mark_scheme as a flat array. backend/CLAUDE.md explains why that was the
-- right call then — it kept the Supabase migration from blocking a future
-- parser rewrite.
--
-- That rewrite has now happened (backend/src/latex/), and it emits a real
-- structure: a parts tree with generated refs ("1(c)(ii)") that the mark
-- scheme keys onto. This migration moves the schema to that shape.
--
-- Safe to be destructive: every table was empty when this ran, and the old
-- browser parser is being deleted in the same pass, so nothing will ever
-- write the old columns again.

-- ------------------------------------------------- drop the old search_vector
-- This comes FIRST: search_vector is a generated column over topic / ref /
-- q_text / exemplar_html, so Postgres refuses to drop any of those while it
-- exists. It is rebuilt at the bottom of this file over the new columns.
drop index if exists questions_search_vector_idx;
alter table public.questions drop column if exists search_vector;

-- ---------------------------------------------------------------- topics
-- `topic` was a single string. Questions genuinely carry several — \examq's
-- third argument is a \textperiodcentered-joined list ("Motion or Kinematics
-- · Forces or Dynamics") — and the app filters by topic, so an array with a
-- GIN index beats a delimited string we would otherwise have to LIKE over.
alter table public.questions
  drop column if exists topic,
  add column topics text[] not null default '{}';

create index questions_topics_idx on public.questions using gin (topics);

-- ------------------------------------------------------------------ kind
-- 'structured' vs 'mcq'. Derivable from content (an MCQ has options and no
-- parts) but kept as a column because it is a filter, and filtering inside
-- jsonb would mean no usable index.
alter table public.questions
  add column kind text not null default 'structured'
    check (kind in ('structured', 'mcq'));

-- ----------------------------------------------------------------- marks
-- Was text because the old parser sometimes produced labels rather than
-- numbers. The new parser always yields an integer (\examq's fourth
-- argument), so the column can carry the real type and be summed/sorted.
alter table public.questions
  alter column marks drop default,
  alter column marks type integer using nullif(regexp_replace(marks, '\D', '', 'g'), '')::integer,
  alter column marks set default 0,
  alter column marks set not null;

-- --------------------------------------------------------------- content
-- The whole parsed Question object: stem blocks, the parts/subparts tree,
-- options, and the answer (mark scheme + worked solution).
--
-- ONE jsonb column rather than separate stem/parts/options/answer columns,
-- for the same reason 0002 kept mark_scheme as jsonb: nothing queries into
-- those pieces independently, and one column means the schema does not
-- churn every time the parsed shape gains a field. js/render/ reads it
-- whole and turns it into HTML.
alter table public.questions
  add column content jsonb not null default '{}'::jsonb;

-- Old blob columns. Nothing writes these any more.
alter table public.questions
  drop column if exists q_html,
  drop column if exists exemplar_html,
  drop column if exists mark_scheme;

-- ---------------------------------------------------------- search_vector
-- Rebuilt over the new columns (the old one was dropped at the top).
--
-- array_to_string() is STABLE, not IMMUTABLE (it is declared over anyarray,
-- whose output function is type-dependent), and a generated column requires
-- strict immutability — `topics::text` fails for the same reason. For a
-- text[] with a constant separator the result genuinely depends only on the
-- input, so a thin IMMUTABLE wrapper is both safe and the standard fix.
-- search_path is pinned empty: this function is baked into a generated
-- column, so a caller-controlled search_path would be a way to change what
-- gets indexed. It only uses built-ins from pg_catalog, which is always
-- resolvable regardless.
create or replace function public.sw_topics_text(topics text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select coalesce(array_to_string(topics, ' '), '') $$;

comment on function public.sw_topics_text(text[]) is
  'Immutable text[] -> text join, so topics can feed questions.search_vector. array_to_string is only STABLE because it is declared over anyarray; over text[] with a fixed separator it is deterministic.';

-- q_text is the flattened plain-text of the question, written by the
-- importer. Body text is no longer reachable from a column (it lives inside
-- content's block tree), so q_text is what makes questions findable.
alter table public.questions add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', public.sw_topics_text(topics)), 'A') ||
    setweight(to_tsvector('simple', coalesce(ref, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(q_text, '')), 'C')
  ) stored;

create index questions_search_vector_idx on public.questions using gin (search_vector);

comment on table public.questions is
  'One row per question. `content` holds the whole parsed question (stem, parts tree, options, mark scheme, worked solution) as produced by backend/src/latex and rendered by js/render — see backend/CLAUDE.md.';
comment on column public.questions.content is
  'Parsed Question object. Shape is defined by backend/src/latex/types.ts.';
comment on column public.questions.topics is
  'One or more topics from \examq argument 3. GIN-indexed for filtering.';
