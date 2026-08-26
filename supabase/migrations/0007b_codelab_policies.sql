-- Perbaikan: ownership project_files/project_versions via project induk
drop policy if exists "own files all" on public.project_files;
drop policy if exists "own versions all" on public.project_versions;

create policy "own files all" on public.project_files for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));

create policy "own versions all" on public.project_versions for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));
