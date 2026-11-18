-- A second way to attach a video: any https:// URL.
--
-- `video_id` (0002) holds a bare 11-character YouTube id, and its check
-- constraint deliberately rejects anything else — that shape is exactly
-- what the embed URL is built from, so every reader can concatenate it
-- without parsing. Relaxing that constraint to also accept URLs would have
-- pushed the "is this an id or a link?" question into every consumer
-- (js/app.js, the storefront, backend/src/db.ts), and a column whose
-- meaning depends on sniffing its own contents is how the four
-- incompatible option encodings in templates/README.md happened.
--
-- So: a second column with its own narrow meaning. `video_id` stays
-- YouTube-only, `video_url` is a self-contained https link to a file — a
-- Supabase Storage public URL, or anything else already hosted. Readers
-- branch on which one is non-empty rather than on the contents of one.
--
-- Precedence when both are set is video_url, because it is the more
-- specific choice: an admin who pastes a file link after a YouTube id
-- meant to replace it. Nothing enforces one-or-the-other at the database
-- level; the editor clears the other field when one is set.
--
-- No storage bucket is created here. `question-images` is image-only and
-- capped at 5 MiB by 0013, so it cannot hold video, and uploading video
-- was explicitly out of scope — this column takes a link to a file that is
-- already hosted somewhere.
alter table public.questions
  add column video_url text not null default '';

-- Same reasoning as questions_video_id_shape: refuse anything that is not
-- a usable https link at the boundary, so no consumer has to defend
-- against a javascript: or data: URL reaching an href or a <video src>.
-- http:// is excluded too — the site is https, and a mixed-content video
-- silently fails to load in every current browser.
alter table public.questions
  add constraint questions_video_url_shape
  check (video_url = '' or video_url ~ '^https://');

comment on column public.questions.video_url is
  'Direct https:// link to a video file (Supabase Storage public URL or any other host). '''' = none. Distinct from video_id, which is a bare 11-char YouTube id; when both are set video_url wins. Written from the question editor, never by the importer — the .tex format has no video field.';
