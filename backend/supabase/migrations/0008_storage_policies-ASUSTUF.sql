-- Storage RLS for the question-images bucket: public read, admin-only
-- write. storage.objects is shared across every bucket in the project, so
-- (unlike 0007) each policy explicitly filters on bucket_id — a blanket
-- `for all` here would risk accidentally covering objects in some other,
-- future bucket that shouldn't be governed by the same rule.
create policy question_images_bucket_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'question-images');

create policy question_images_bucket_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());

create policy question_images_bucket_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'question-images' and public.is_admin())
  with check (bucket_id = 'question-images' and public.is_admin());

create policy question_images_bucket_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images' and public.is_admin());
