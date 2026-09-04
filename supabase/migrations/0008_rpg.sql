-- Phase 7 — RPG: Vault (koleksi permanen), Inventory (operasional), Loadout, Achievements

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  category text not null check (category in ('skin','weapon','gear','module','companion','effect','emote','badge')),
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','epic','legendary')),
  acquired_at timestamptz not null default now(),
  unique (user_id, item_key)
);
create index if not exists vault_user_idx on public.vault_items (user_id, category);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  quantity int not null default 1 check (quantity > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create table if not exists public.loadout (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  skin_key text,
  weapon_key text,
  gear_key text,
  module_key text,
  companion_key text,
  effect_key text,
  emote_key text,
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null default '',
  xp_reward bigint not null default 0,
  credits_reward bigint not null default 0,
  reward_skin text
);

create table if not exists public.achievement_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  completed_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

insert into public.achievements (id, title, description, xp_reward, credits_reward, reward_skin) values
  ('first_program', 'Program Pertama', 'Selesaikan pelajaran pertamamu', 15, 10, 'skin_cyber_coder'),
  ('loop_master', 'Loop Master', 'Kuasai loop (3 pelajaran Dasar Kode)', 40, 25, 'skin_logic_runner'),
  ('first_boss', 'Penakluk Warden', 'Kalahkan Glitch Warden', 50, 30, 'weapon_debug_blade'),
  ('world_explorer', 'Penjelajah Dunia', 'Masuki Reruntuhan Glitch', 20, 15, null)
on conflict (id) do nothing;

create or replace function public.grant_achievement(p_achievement_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_a public.achievements%rowtype; v_grant jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_a from public.achievements where id = p_achievement_id;
  if not found then raise exception 'achievement tidak dikenal'; end if;
  if exists (select 1 from public.achievement_completions where user_id = v_uid and achievement_id = p_achievement_id) then
    return jsonb_build_object('status', 'already');
  end if;
  insert into public.achievement_completions (user_id, achievement_id) values (v_uid, p_achievement_id);
  select public.grant_rewards(v_a.xp_reward, v_a.credits_reward, 'achievement', null, null, 'achv:' || p_achievement_id) into v_grant;
  if v_a.reward_skin is not null then
    insert into public.vault_items (user_id, item_key, category, rarity)
    values (v_uid, v_a.reward_skin,
      case when v_a.reward_skin like 'skin_%' then 'skin' when v_a.reward_skin like 'weapon_%' then 'weapon' else 'badge' end,
      'rare')
    on conflict (user_id, item_key) do nothing;
  end if;
  perform public.insert_analytics_event('achievement_unlocked', jsonb_build_object('achievement', p_achievement_id));
  insert into public.inbox_messages (user_id, kind, title, body)
  values (v_uid, 'reward', 'Achievement: ' || v_a.title, '+' || v_a.xp_reward || ' XP, +' || v_a.credits_reward || ' Credits');
  return jsonb_build_object('status', 'granted', 'rewards', v_grant, 'skin', v_a.reward_skin);
end $$;

create or replace function public.equip_loadout(
  p_skin text default null, p_weapon text default null, p_gear text default null,
  p_module text default null, p_companion text default null, p_effect text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- hanya boleh equip yang dimiliki
  if p_skin is not null and not exists (select 1 from public.vault_items where user_id = v_uid and item_key = p_skin and category = 'skin') then
    raise exception 'skin belum dimiliki';
  end if;
  if p_weapon is not null and not exists (select 1 from public.vault_items where user_id = v_uid and item_key = p_weapon and category = 'weapon') then
    raise exception 'weapon belum dimiliki';
  end if;
  insert into public.loadout (user_id, skin_key, weapon_key, gear_key, module_key, companion_key, effect_key)
  values (v_uid, p_skin, p_weapon, p_gear, p_module, p_companion, p_effect)
  on conflict (user_id) do update set
    skin_key = excluded.skin_key, weapon_key = excluded.weapon_key,
    gear_key = excluded.gear_key, module_key = excluded.module_key,
    companion_key = excluded.companion_key, effect_key = excluded.effect_key,
    updated_at = now();
end $$;

alter table public.vault_items enable row level security;
alter table public.inventory enable row level security;
alter table public.loadout enable row level security;
alter table public.achievements enable row level security;
alter table public.achievement_completions enable row level security;
create policy "own vault" on public.vault_items for select using ((select auth.uid()) = user_id);
create policy "own inventory" on public.inventory for select using ((select auth.uid()) = user_id);
create policy "own loadout" on public.loadout for select using ((select auth.uid()) = user_id);
create policy "all achievements read" on public.achievements for select using (true);
create policy "own completions" on public.achievement_completions for select using ((select auth.uid()) = user_id);
