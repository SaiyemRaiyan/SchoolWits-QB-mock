-- The syllabus code becomes part of a paper's key.
--
-- paper_key was subject|paper|variant|session|year. Two syllabuses filed under
-- one subject name (Physics 5054 and 0625) therefore shared a key, and since
-- parse-paper upserts on it, saving one replaced the other.
--
-- paper_key is generated, so every existing row gets its new key here. Nothing
-- stores the old value: questions and figures refer to papers.id. The new key
-- only adds to the old one, so it cannot collide where the old one did not.
begin;

alter table public.papers drop column paper_key;

alter table public.papers
  add column paper_key text not null generated always as (
    lower(regexp_replace(trim(subject), '[^a-zA-Z0-9]+', '-', 'g'))
    || '|' || lower(regexp_replace(trim(subject_code), '[^a-zA-Z0-9]+', '-', 'g'))
    || '|' || paper || '|' || variant || '|'
    || lower(regexp_replace(trim(session), '[^a-zA-Z0-9]+', '-', 'g'))
    || '|' || year
  ) stored;

alter table public.papers
  add constraint papers_paper_key_key unique (paper_key);

comment on column public.papers.paper_key is
  'Natural key: subject|code|paper|variant|session|year. Generated; the upsert target of parse-paper.';

commit;

-- Make the API see the new column at once.
notify pgrst, 'reload schema';
