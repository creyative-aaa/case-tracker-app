alter table public.cases
add column if not exists module_name text,
add column if not exists menu_name text;

notify pgrst, 'reload schema';
