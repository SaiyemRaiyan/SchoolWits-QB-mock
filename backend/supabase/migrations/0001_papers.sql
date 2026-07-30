-- Papers: one row per subject/paper/variant/session/year exam paper.
-- Mirrors the IndexedDB `papers` store (js/store.js upsertPaper/paperKeyOf).
--
-- Unlike the old IndexedDB version, the primary key is a plain bigint `id`,
-- not the natural key itself — paper_key is kept as a separate unique
-- column instead. That way FKs from `questions` etc. reference a small,
-- immutable integer instead of a wide text key, and paper_key stays free
-- to be recomputed if the slugging rules ever change.
create table public.papers (
  id             bigint generated always as identity primary key,
  subject        text not null,
  subject_code   text not null default '',
  paper          text not null,       -- e.g. "2" — kept as text, it's a label not a number
  variant        text not null,       -- e.g. "1"
  session        text not null,       -- e.g. "M/J"
  year           text not null,       -- kept as text to match the source data ("2025"), not parsed to int

  -- Natural key equivalent to the old IndexedDB paperKey, e.g.
  -- "physics|2|1|m-j|2025". Generated in Postgres (not app code) so it's
  -- always in sync with the row it describes and can carry a unique
  -- constraint for free.
  paper_key      text not null generated always as (
                   lower(regexp_replace(trim(subject), '[^a-zA-Z0-9]+', '-', 'g'))
                   || '|' || paper || '|' || variant || '|'
                   || lower(regexp_replace(trim(session), '[^a-zA-Z0-9]+', '-', 'g'))
                   || '|' || year
                 ) stored,

  -- Human label e.g. "5054/21/M/J/25". Left as a plain app-supplied column
  -- rather than another generated column: its format has a conditional on
  -- subject_code being present that's simpler to keep in one place
  -- (backend/src/db.ts, ported from js/store.js's paperLabel()) than to
  -- duplicate as a second SQL expression.
  label          text not null,

  created_at     timestamptz not null default now(),

  constraint papers_paper_key_key unique (paper_key),
  constraint papers_paper_not_blank check (paper <> ''),
  constraint papers_variant_not_blank check (variant <> ''),
  constraint papers_year_not_blank check (year <> '')
);

comment on table public.papers is
  'One row per subject/paper/variant/session/year exam paper. paper_key is the natural key equivalent to the old IndexedDB paperKey.';
