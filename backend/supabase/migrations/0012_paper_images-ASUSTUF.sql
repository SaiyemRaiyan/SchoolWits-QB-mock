-- Replace `question_images` with `paper_images`.
--
-- 0003 keyed figures to a question_id, which fitted the old flow where the
-- browser parsed first and baked base64 images into the saved HTML.
--
-- The new flow inverts that order, because the parser needs the URLs as
-- INPUT:
--
--   1. admin drops the .tex files and the figure files together
--   2. every figure is uploaded to the bucket -> public URL
--   3. { filename: url } is passed into the parser as its ImageMap
--   4. the parser resolves \qfig{fig1.png} to that URL and writes it into
--      the figure block's `src`
--
-- At step 2 no question exists yet, and figures are referenced by bare
-- filename inside a paper ("5054_21_M_J_25_fig1.png"), not by question. So
-- the natural key is (paper_id, filename), and a figure shared by two
-- questions is stored once rather than duplicated per question.
--
-- The rendered `src` still lives in questions.content — this table is the
-- inventory of what was uploaded, which is what makes it possible to delete
-- the bucket objects when a paper is deleted. Postgres cascade does NOT
-- remove storage objects; something has to know the paths.

drop table if exists public.question_images;

create table public.paper_images (
  id            bigint generated always as identity primary key,
  paper_id      bigint not null references public.papers(id) on delete cascade,

  -- Exactly as written in the .tex, e.g. "5054_21_M_J_25_fig1.png". This is
  -- the key the parser matches \qfig against, so it must round-trip
  -- unchanged.
  filename      text   not null,

  -- Object key inside the question-images bucket: {paper_key}/{filename}.
  storage_path  text   not null unique,

  -- Cached public URL. Derivable from storage_path, but stored so readers
  -- never have to know the project URL or bucket naming to render.
  public_url    text   not null,

  byte_size     integer not null default 0,
  content_type  text    not null default '',
  created_at    timestamptz not null default now(),

  -- One row per figure per paper; re-uploading a figure updates in place.
  constraint paper_images_paper_filename_key unique (paper_id, filename)
);

create index paper_images_paper_id_idx on public.paper_images (paper_id);

alter table public.paper_images enable row level security;

-- Same model as every other table (0007): world-readable, admin-writable.
create policy paper_images_select_public on public.paper_images
  for select using (true);
create policy paper_images_insert_admin on public.paper_images
  for insert with check (public.is_admin());
create policy paper_images_update_admin on public.paper_images
  for update using (public.is_admin()) with check (public.is_admin());
create policy paper_images_delete_admin on public.paper_images
  for delete using (public.is_admin());

comment on table public.paper_images is
  'Figures uploaded to the question-images bucket, keyed by (paper_id, filename) because the parser resolves \qfig by bare filename and images are uploaded before questions exist. Deleting a paper cascades here but does NOT delete the storage objects — use storage_path to clean those up.';
comment on column public.paper_images.filename is
  'Bare filename as referenced by \qfig in the .tex. Must round-trip unchanged or figures will not resolve.';
