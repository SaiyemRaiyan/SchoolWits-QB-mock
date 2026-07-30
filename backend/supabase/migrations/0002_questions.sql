-- Questions: one row per question, FK to its paper.
--
-- The old IndexedDB record denormalized subject/topic/paper/variant/session/
-- year straight onto every question, because IndexedDB has no joins. That
-- reason doesn't apply to Postgres, so those columns are dropped here in
-- favor of `paper_id` + a join to `papers`. `topic` is the one exception —
-- it's kept, because it's genuinely a question-level attribute (each
-- question in a paper can cover a different topic), not a paper-level one.
--
-- q_html / exemplar_html / mark_scheme are stored exactly as the existing
-- .tex parser (js/latex.js) already produces them today: q_html is fully
-- rendered HTML with images baked in (base64 today, bucket URLs after the
-- upload-flow change — see question_images below) and raw math delimiters
-- left inside for client-side KaTeX. This pass deliberately does NOT change
-- that shape — see backend/CLAUDE.md for why.
create table public.questions (
  id               bigint generated always as identity primary key,
  paper_id         bigint not null references public.papers(id) on delete cascade,
  question_number  integer not null,          -- was `id` in the old IndexedDB record; renamed to avoid clashing with this table's own PK
  topic            text not null default '',
  marks            text not null default '',  -- kept text: source data is sometimes numeric, sometimes a label like "5"
  ref              text not null default '',  -- e.g. "5054/21/M/J/25 -- Q1"
  q_text           text not null default '',  -- plain-text copy for search/preview, truncated to 4000 chars by the parser
  q_html           text not null default '',
  mark_scheme      jsonb not null default '[]'::jsonb,  -- [{part, answer(html), marks}, ...] in original row order
  exemplar_html    text not null default '',
  video_id         text not null default '',  -- bare 11-char YouTube id; '' = no video attached
  created_at       timestamptz not null default now(),

  constraint questions_paper_question_number_key unique (paper_id, question_number),
  constraint questions_question_number_positive check (question_number > 0),
  constraint questions_video_id_shape check (video_id = '' or video_id ~ '^[A-Za-z0-9_-]{11}$')
);

create index questions_paper_id_idx on public.questions (paper_id);
create index questions_topic_idx    on public.questions (topic);

-- Replaces DB.search()'s in-memory linear scan over topic/ref/qText/
-- stripped(qHTML)/stripped(exemplarHTML) with a real Postgres full-text
-- index. Weighted so topic/ref matches rank above body-text matches.
-- The HTML tag stripping here is a rough regexp (good enough for search
-- relevance) — not a security boundary, q_html itself is never rendered
-- from this column.
alter table public.questions add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(topic, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(ref, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(q_text, '')), 'C') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(exemplar_html, ''), '<[^>]*>', ' ', 'g')), 'D')
  ) stored;

create index questions_search_vector_idx on public.questions using gin (search_vector);

comment on table public.questions is
  'One row per question. mark_scheme is kept as jsonb (not a child table) because nothing in the app queries mark-scheme rows independently today — see backend/CLAUDE.md.';
