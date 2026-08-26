-- Phase 6: CodeLab (D10) — projects, files, versions (S60 CODELAB)

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  runtime text not null default 'javascript',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, updated_at desc);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);
create index if not exists project_files_proj_idx on public.project_files (project_id, path);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists project_versions_proj_idx on public.project_versions (project_id, created_at desc);

-- RPC: simpan file + snapshot versi dalam satu transaksi atomik
create or replace function public.save_project(
  p_project_id uuid,
  p_files jsonb,
  p_version_label text default null,
  p_make_version boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select user_id into v_owner from public.projects where id = p_project_id;
  if v_owner is null then raise exception 'proyek tidak ditemukan'; end if;
  if v_owner <> v_uid then raise exception 'bukan milikmu'; end if;

  delete from public.project_files where project_id = p_project_id;
  insert into public.project_files (project_id, path, content)
  select p_project_id, f->>'path', f->>'content'
  from jsonb_array_elements(p_files) f;

  update public.projects set updated_at = now() where id = p_project_id;

  if p_make_version then
    insert into public.project_versions (project_id, label, snapshot)
    values (p_project_id, p_version_label, p_files);
  end if;

  return jsonb_build_object('saved', true, 'files', jsonb_array_length(p_files));
end $$;

alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.project_versions enable row level security;
create policy "own projects all" on public.projects for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own files all" on public.project_files for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own versions all" on public.project_versions for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
