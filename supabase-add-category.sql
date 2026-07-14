alter table public.cases
add column if not exists title text,
add column if not exists category text;

alter table public.cases
add column if not exists error_description text,
add column if not exists solution text,
add column if not exists resolution_steps text,
add column if not exists created_by_id uuid,
add column if not exists created_by_email text,
add column if not exists error_image_url text,
add column if not exists created_at timestamptz default now();

update public.cases
set solution = resolution_steps
where solution is null
  and resolution_steps is not null;

update public.cases
set resolution_steps = solution
where resolution_steps is null
  and solution is not null;

update public.cases
set resolution_steps = '-'
where resolution_steps is null;

update public.cases
set category = 'Lain-lain'
where category is null;

alter table public.cases
alter column category set default 'Lain-lain',
alter column category set not null;

alter table public.cases enable row level security;

drop policy if exists "cases_public_read" on public.cases;

create policy "cases_public_read"
on public.cases
for select
using (true);

drop policy if exists "cases_authenticated_insert" on public.cases;

create policy "cases_authenticated_insert"
on public.cases
for insert
to authenticated
with check (auth.uid() = created_by_id);

drop policy if exists "cases_owner_update" on public.cases;

create policy "cases_owner_update"
on public.cases
for update
to authenticated
using (auth.uid() = created_by_id)
with check (auth.uid() = created_by_id);

insert into storage.buckets (id, name, public)
values ('case-images', 'case-images', true)
on conflict (id) do update set public = true;

drop policy if exists "case_images_public_read" on storage.objects;

create policy "case_images_public_read"
on storage.objects
for select
using (bucket_id = 'case-images');

drop policy if exists "case_images_authenticated_upload" on storage.objects;

create policy "case_images_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'case-images');

notify pgrst, 'reload schema';
