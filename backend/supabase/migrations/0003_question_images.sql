-- Question images: today, images uploaded via upload.html are embedded
-- directly as base64 `data:` URLs inside q_html/exemplar_html (see
-- js/latex.js resolveImageSrc) — there is no separate image record at all.
-- This table + the `question-images` storage bucket (0005) replace that:
-- the new upload flow uploads each file to the bucket FIRST, then feeds the
-- resulting public URL into the same `images: {filename: url}` map the
-- parser already accepts, so js/latex.js needs zero code changes (it
-- already passes through https:// URLs unchanged in resolveImageSrc).
create table public.question_images (
  id            bigint generated always as identity primary key,
  question_id   bigint not null references public.questions(id) on delete cascade,
  storage_path  text not null,          -- object key within the bucket, e.g. "3/17/fig1.png" (paper_id/question_id/filename)
  filename      text not null,          -- original filename, as referenced by \image{filename}{caption} in the .tex source
  caption       text not null default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),

  constraint question_images_storage_path_key unique (storage_path)
);

create index question_images_question_id_idx on public.question_images (question_id);

comment on table public.question_images is
  'Metadata for images uploaded to the question-images storage bucket. Deleting a question cascades here, but does NOT delete the underlying storage object — that must be done explicitly in application code (storage.remove()), since Postgres foreign keys have no reach into Storage.';
