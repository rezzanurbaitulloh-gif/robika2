-- Phase 3: quest defs (server-authoritative rewards) + completion ledger + turn-in RPC

create table if not exists public.quest_defs (
  id text primary key,
  title text not null,
  xp_reward bigint not null default 0 check (xp_reward >= 0),
  credits_reward bigint not null default 0 check (credits_reward >= 0)
);

create table if not exists public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null references public.quest_defs(id),
  completed_at timestamptz not null default now(),
  unique (user_id, quest_id)
);
create index if not exists quest_completions_user_idx on public.quest_completions (user_id, completed_at desc);

insert into public.quest_defs (id, title, xp_reward, credits_reward) values
  ('q_boot_01_darkened_bridge', 'Jembatan yang Gelap', 60, 25)
on conflict (id) do nothing;

create or replace function public.complete_quest(p_quest_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_q public.quest_defs%rowtype;
  v_grant jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_q from public.quest_defs where id = p_quest_id;
  if not found then raise exception 'quest tidak dikenal'; end if;

  if exists (select 1 from public.quest_completions where user_id = v_uid and quest_id = p_quest_id) then
    return jsonb_build_object('status', 'already_completed');
  end if;

  insert into public.quest_completions (user_id, quest_id) values (v_uid, p_quest_id);

  select public.grant_rewards(
    v_q.xp_reward, v_q.credits_reward,
    'quest_reward', 'quest', null,
    'quest:' || p_quest_id
  ) into v_grant;

  return jsonb_build_object('status', 'completed', 'quest', v_q.title, 'rewards', v_grant);
end $$;

alter table public.quest_defs enable row level security;
alter table public.quest_completions enable row level security;

create policy "quest defs readable" on public.quest_defs for select using (true);
create policy "own completions read" on public.quest_completions for select using ((select auth.uid()) = user_id);
