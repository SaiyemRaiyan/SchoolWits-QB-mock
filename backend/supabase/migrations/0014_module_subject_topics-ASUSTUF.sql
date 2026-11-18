-- Modules gain a subject and a real topic LIST.
--
-- 0004_modules.sql gave `modules` a single free-text `topic`, with the
-- comment "free text, or literal 'Mixed topics'". That was an honest mirror
-- of the app at the time, but it does not survive what the builder is
-- actually for: a module is assembled from questions picked across several
-- papers, and those questions carry several topics each
-- (`questions.topics text[]`, see 0011). Collapsing that to one string meant
-- the storefront card either lied ("Vectors" for a mixed pack) or said
-- nothing ("Mixed topics").
--
-- So `topic text` becomes `topics text[]`, matching the shape questions
-- already use. Same reasoning as 0011: an array with a GIN index beats a
-- delimited string we would have to LIKE over when "show me every module
-- covering Vectors" arrives.

-- ---------------------------------------------------------------- subject
-- A module is a study aid for ONE subject — mixing Physics and Add Maths
-- questions into one pack is a mistake, not a feature, so the builder scopes
-- picking to a subject and records which one here. Nullable-by-default ''
-- rather than NOT NULL with no default, to match how `topic` behaved and to
-- let the backfill below leave existing rows valid.
alter table public.modules
  add column if not exists subject text not null default '';

-- ----------------------------------------------------------------- topics
alter table public.modules
  add column if not exists topics text[] not null default '{}';

-- Backfill before dropping the old column, so nothing already saved is lost.
-- The old value was a single label; it becomes a one-element list. Blank and
-- the literal "Mixed topics" both mean "no real topic was chosen" and map to
-- an empty array rather than a list containing a placeholder.
update public.modules
set topics = case
      when coalesce(topic, '') = '' then '{}'::text[]
      when lower(topic) = 'mixed topics' then '{}'::text[]
      else array[topic]
    end
where topics = '{}'::text[];

-- Existing modules predate the subject column. Derive it from the questions
-- they already contain rather than leaving it blank: a module's subject is
-- the subject of its questions, and every question reaches `papers` through
-- module_questions. Only sets a value where the module is unambiguous (all
-- its questions share one subject), which is every real case.
update public.modules m
set subject = sub.subject
from (
  select mq.module_id, min(p.subject) as subject
  from public.module_questions mq
  join public.questions q on q.id = mq.question_id
  join public.papers p    on p.id = q.paper_id
  group by mq.module_id
  having count(distinct p.subject) = 1
) sub
where sub.module_id = m.id and m.subject = '';

alter table public.modules drop column if exists topic;

create index if not exists modules_topics_idx on public.modules using gin (topics);
create index if not exists modules_subject_idx on public.modules (subject);

comment on column public.modules.subject is
  'The one subject this module''s questions come from. The builder scopes picking to a subject; a pack spanning subjects is not a supported product.';
comment on column public.modules.topics is
  'Every topic the module covers, as a list — replaces the single `topic` string from 0004. Empty means the module is genuinely mixed / unlabelled; the UI renders that as "Mixed topics" rather than storing that placeholder.';
