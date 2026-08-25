-- Phase-compliance patch: analytics (S64), server-authoritative combat/challenge (S62/D07/D06),
-- inbox/notifications (S66/D18), quest objective requirements.

-- ============ ANALYTICS (S64) ============
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_user_event_idx on public.analytics_events (user_id, event, created_at desc);

create or replace function public.insert_analytics_event(p_event text, p_payload jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.analytics_events (user_id, event, payload)
  values (auth.uid(), p_event, p_payload);
$$;

-- ============ WORLD EVENTS (server-side truth for objectives) ============
create table if not exists public.world_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  count int not null default 0,
  first_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, code)
);

create or replace function public.record_world_event(p_code text, p_count int default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.world_events (user_id, code, count) values (auth.uid(), p_code, greatest(1, p_count))
  on conflict (user_id, code) do update
    set count = public.world_events.count + greatest(1, p_count), updated_at = now();
end $$;

-- ============ ENEMY DEFS (server-owned rewards; client never sends values) ============
create table if not exists public.enemy_defs (
  id text primary key,
  name text not null,
  xp_reward bigint not null default 0 check (xp_reward >= 0),
  credits_reward bigint not null default 0 check (credits_reward >= 0)
);
insert into public.enemy_defs (id, name, xp_reward, credits_reward) values
  ('enemy_glitch_scout', 'Glitch Scout', 15, 5),
  ('enemy_glitch_warden', 'Glitch Warden', 60, 30)
on conflict (id) do nothing;

create or replace function public.record_enemy_kill(p_enemy_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_e public.enemy_defs%rowtype; v_grant jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_e from public.enemy_defs where id = p_enemy_id;
  if not found then raise exception 'musuh tidak dikenal'; end if;
  perform public.record_world_event('kill:' || p_enemy_id);
  select public.grant_rewards(v_e.xp_reward, v_e.credits_reward, 'enemy_defeated', 'enemy', null,
    'kill:' || p_enemy_id || ':' || extract(epoch from clock_timestamp())::bigint)
  into v_grant;
  return v_grant;
end $$;

-- ============ CHALLENGE DEFS + SERVER-SIDE RUN VALIDATION (D07) ============
create table if not exists public.challenge_defs (
  id text primary key,
  function_name text not null,
  tests jsonb not null default '[]'::jsonb,
  requires_events jsonb not null default '[]'::jsonb,
  success_event text
);
insert into public.challenge_defs (id, function_name, tests, requires_events, success_event) values
  ('ch_gate_power', 'nyalakanGerbang',
   '[{"name":"gerbang menerima tepat 3 denyut","expectPulses":3},
     {"name":"semua denyut menuju gerbang_bridge","expectTarget":"gate_bridge"}]'::jsonb,
   '[]'::jsonb,
   'gate_bridge_opened')
on conflict (id) do update set tests = excluded.tests, success_event = excluded.success_event;

create or replace function public.validate_challenge_run(p_challenge_id text, p_effects jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_c public.challenge_defs%rowtype; v_test jsonb; v_pulses int; v_ok boolean := true; v_failed text := null;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_c from public.challenge_defs where id = p_challenge_id;
  if not found then raise exception 'challenge tidak dikenal'; end if;

  for v_test in select * from jsonb_array_elements(v_c.tests) loop
    if v_test ? 'expectPulses' then
      select count(*) into v_pulses from jsonb_array_elements(p_effects) e
        where e->>'verb' = 'pulse';
      if v_pulses <> (v_test->>'expectPulses')::int then
        v_ok := false; v_failed := v_test->>'name';
      end if;
    end if;
    if v_test ? 'expectTarget' then
      if exists (
        select 1 from jsonb_array_elements(p_effects) e
        where e->>'verb' = 'pulse' and (e->'args'->>0) <> (v_test->>'expectTarget')
      ) then
        v_ok := false; v_failed := v_test->>'name';
      end if;
    end if;
  end loop;

  if v_ok and v_c.success_event is not null then
    perform public.record_world_event(v_c.success_event);
  end if;
  return jsonb_build_object('valid', v_ok, 'failedTest', v_failed);
end $$;

-- ============ QUEST v2: server-validated objectives (D06) ============
alter table public.quest_defs add column if not exists requires_events jsonb not null default '[]'::jsonb;
update public.quest_defs
  set requires_events = '["gate_bridge_opened"]'::jsonb
  where id = 'q_boot_01_darkened_bridge';

create or replace function public.complete_quest(p_quest_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_q public.quest_defs%rowtype;
  v_req jsonb; v_grant jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_q from public.quest_defs where id = p_quest_id;
  if not found then raise exception 'quest tidak dikenal'; end if;

  if exists (select 1 from public.quest_completions where user_id = v_uid and quest_id = p_quest_id) then
    return jsonb_build_object('status', 'already_completed');
  end if;

  -- server-validated objectives: setiap event yang disyaratkan harus tercatat
  for v_req in select * from jsonb_array_elements(v_q.requires_events) loop
    if not exists (
      select 1 from public.world_events
      where user_id = v_uid and code = v_req#>>'{}'
    ) then
      return jsonb_build_object('status', 'objectives_incomplete', 'missing', v_req#>>'{}');
    end if;
  end loop;

  insert into public.quest_completions (user_id, quest_id) values (v_uid, p_quest_id);

  select public.grant_rewards(v_q.xp_reward, v_q.credits_reward, 'quest_reward', 'quest', null,
    'quest:' || p_quest_id) into v_grant;

  insert into public.inbox_messages (user_id, kind, title, body, attachment)
  values (v_uid, 'reward', 'Quest selesai: ' || v_q.title,
          'Hadiah: +' || (v_q.xp_reward)::text || ' XP, +' || (v_q.credits_reward)::text || ' Credits',
          jsonb_build_object('xp', v_q.xp_reward, 'credits', v_q.credits_reward));

  perform public.insert_analytics_event('quest_completed', jsonb_build_object('quest', p_quest_id));
  return jsonb_build_object('status', 'completed', 'quest', v_q.title, 'rewards', v_grant);
end $$;

-- ============ INBOX + NOTIFICATIONS (S66/D18) ============
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('reward','system','payment_receipt','gacha_result')),
  title text not null,
  body text,
  attachment jsonb,
  claimed_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inbox_user_idx on public.inbox_messages (user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  payload jsonb not null default '{}'::jsonb,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications (user_id, seen, created_at desc);

create policy "own inbox" on public.inbox_messages for select using ((select auth.uid()) = user_id);
create policy "own inbox update" on public.inbox_messages for update using ((select auth.uid()) = user_id);
create policy "own notifications" on public.notifications for select using ((select auth.uid()) = user_id);
create policy "own notifications update" on public.notifications for update using ((select auth.uid()) = user_id);

-- ============ RLS untuk tabel baru ============
alter table public.analytics_events enable row level security;
alter table public.world_events enable row level security;
alter table public.enemy_defs enable row level security;
alter table public.challenge_defs enable row level security;
create policy "analytics insert own" on public.analytics_events for insert with check ((select auth.uid()) = user_id or (select auth.uid()) is null);
create policy "world events own read" on public.world_events for select using ((select auth.uid()) = user_id);
create policy "enemy defs readable" on public.enemy_defs for select using (true);
create policy "challenge defs readable" on public.challenge_defs for select using (true);
