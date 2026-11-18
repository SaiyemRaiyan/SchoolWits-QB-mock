-- Constrain the question-images bucket.
--
-- 0005 created it public with no limits, which was fine while nothing wrote
-- to it. Now that upload.html will push files there directly from the
-- browser, the bucket needs to refuse anything that is not a figure —
-- otherwise an admin session is also an arbitrary file host, and a stray
-- 200MB drop would eat the free tier's 1GB storage in one go.
--
-- Enforced by Storage itself, so it applies to every client (browser, CLI,
-- Edge Function) without any of them having to check.
--
-- 5 MB is generous for exam figures: the largest in the sample papers is
-- ~170KB, so this is ~30x headroom while still bounding the damage.
update storage.buckets
set
  file_size_limit = 5242880,  -- 5 MiB
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
where id = 'question-images';
