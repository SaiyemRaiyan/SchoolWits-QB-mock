-- Per-module edited copies of a question.
--
-- A module is a bundle of questions pulled from real papers, and until now
-- it stored nothing but foreign keys — so every module rendered the same
-- `questions.content`, and editing a question changed it for every module
-- and for the public Browse page at once.
--
-- The need is the opposite: an admin takes a question into a module and
-- changes its values ("10x + 7 = 2" -> "2x + 7 = 67") so students practise
-- the same shape of problem with different numbers, without touching the
-- source paper or any other module.
--
-- One nullable column rather than a `module_question_content` table: such a
-- table would be keyed on exactly this PK, (module_id, question_id), so it
-- would duplicate the join for no gain. Copying the row into `questions`
-- instead was also rejected — it would break ref/paper_id provenance and
-- put module-only questions into Browse and the search index.
alter table public.module_questions
  add column content_override jsonb;

comment on column public.module_questions.content_override is
  'This module''s own edited copy of the question, same shape as questions.content (backend/src/latex/types.ts). NULL means the module renders the original, which is why no backfill was needed. Re-importing the source paper overwrites questions.content but deliberately does NOT clear this — once edited for a module, the copy is independent. Written only by the update-question Edge Function; saveModule upserts the join rows precisely so it never touches this column.';
