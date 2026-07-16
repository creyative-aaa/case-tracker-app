alter table public.cases enable row level security;

drop policy if exists "cases_owner_delete" on public.cases;

create policy "cases_owner_delete"
on public.cases
for delete
to authenticated
using (auth.uid() = created_by_id);

drop policy if exists "case_images_authenticated_upload" on storage.objects;

create policy "case_images_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'case-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "case_images_owner_delete" on storage.objects;

create policy "case_images_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'case-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
