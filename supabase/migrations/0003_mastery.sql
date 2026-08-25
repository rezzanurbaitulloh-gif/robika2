-- Phase 5: mastery tracking + lesson rewards idempotency

create table if not exists public.mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  score numeric not null default 0 check (score >= 0 and score <= 100),
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, skill)
);
create index if not exists mastery_user_idx on public.mastery (user_id, skill);

create or replace function public.record_mastery(p_skill text, p_delta numeric, p_evidence text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.mastery (user_id, skill, score, evidence)
  values (v_uid, p_skill, least(100, greatest(0, p_delta)),
          case when p_evidence is null then '[]'::jsonb else jsonb_build_array(p_evidence) end)
  on conflict (user_id, skill) do update
    set score = least(100, greatest(0, public.mastery.score + excluded.score)),
        evidence = public.mastery.evidence || excluded.evidence,
        updated_at = now()
  returning score into v_new;
  return v_new;
end $$;

alter table public.mastery enable row level security;
create policy "own mastery read" on public.mastery for select using ((select auth.uid()) = user_id);
