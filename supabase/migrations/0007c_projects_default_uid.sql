-- user_id otomatis dari sesi
alter table public.projects alter column user_id set default auth.uid();
