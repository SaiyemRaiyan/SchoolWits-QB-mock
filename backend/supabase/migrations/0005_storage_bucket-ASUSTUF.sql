-- Storage bucket for question figure images.
--
-- Public bucket: there's no premium-gating requirement yet (purchases are
-- explicitly out of scope for this pass — see backend/CLAUDE.md), so a
-- public bucket keeps this simple: plain public URLs, no signed-URL
-- issuing/refresh logic needed anywhere in the app. Revisit this if/when a
-- real pricing model arrives and premium question images need gating.
--
-- Path convention (enforced by application code, not the DB):
--   question-images/{paper_id}/{question_id}/{filename}
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;
