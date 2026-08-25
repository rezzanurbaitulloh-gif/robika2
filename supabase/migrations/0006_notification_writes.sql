-- D18: klien boleh menulis notifikasi miliknya (mirror toast)
create policy "insert own notifications" on public.notifications
  for insert with check ((select auth.uid()) = user_id);
