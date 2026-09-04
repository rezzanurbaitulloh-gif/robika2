-- Phase 9 — Gacha/Event: capsule with server RNG + pity + duplicate conversion

create table if not exists public.gacha_banners (
  id text primary key,
  title text not null,
  cost_credits bigint not null default 50 check (cost_credits > 0),
  pity_threshold int not null default 10 check (pity_threshold > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.gacha_items (
  id uuid primary key default gen_random_uuid(),
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  item_key text not null,
  category text not null,
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary')),
  weight int not null check (weight > 0),
  unique (banner_id, item_key)
);

create table if not exists public.gacha_pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  banner_id text not null references public.gacha_banners(id),
  item_key text not null,
  rarity text not null,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists gacha_pulls_user_idx on public.gacha_pulls (user_id, created_at desc);

create table if not exists public.gacha_pity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  pity_count int not null default 0,
  primary key (user_id, banner_id)
);

insert into public.gacha_banners (id, title, cost_credits, pity_threshold) values
  ('capsule_aetheria', 'Capsule Aetheria', 50, 10)
on conflict (id) do nothing;

-- seed pool: common skins/effects, rarer weapons
insert into public.gacha_items (banner_id, item_key, category, rarity, weight) values
  ('capsule_aetheria', 'skin_aurum', 'skin', 'rare', 20),
  ('capsule_aetheria', 'skin_cyber_coder', 'skin', 'epic', 9),
  ('capsule_aetheria', 'weapon_debug_blade', 'weapon', 'epic', 9),
  ('capsule_aetheria', 'effect_spark', 'effect', 'common', 70),
  ('capsule_aetheria', 'companion_bot_mini', 'companion', 'rare', 15),
  ('capsule_aetheria', 'skin_logic_runner', 'skin', 'legendary', 1)
on conflict (banner_id, item_key) do nothing;

create or replace function public.gacha_pull(p_banner_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_banner public.gacha_banners%rowtype;
  v_wallet public.wallets%rowtype;
  v_pity int := 0;
  v_pick record;
  v_is_dup boolean := false;
  v_total int;
  v_roll int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_banner from public.gacha_banners where id = p_banner_id;
  if not found then raise exception 'banner tidak ditemukan'; end if;

  select * into v_wallet from public.wallets where user_id = v_uid for update;
  if v_wallet.credits < v_banner.cost_credits then
    return jsonb_build_object('status', 'insufficient', 'credits', v_wallet.credits);
  end if;

  select coalesce(pity_count, 0) into v_pity from public.gacha_pity where user_id = v_uid and banner_id = p_banner_id;

  -- deduct
  update public.wallets set credits = credits - v_banner.cost_credits where user_id = v_uid;
  insert into public.wallet_transactions (user_id, currency, amount, balance_after, reason, idempotency_key)
  values (v_uid, 'credits', -v_banner.cost_credits, v_wallet.credits - v_banner.cost_credits, 'gacha_pull', 'gacha:' || p_banner_id || ':' || extract(epoch from clock_timestamp())::text);

  -- pick item: pity forces rare+ if threshold
  if v_pity + 1 >= v_banner.pity_threshold then
    select * into v_pick from public.gacha_items
    where banner_id = p_banner_id and rarity in ('rare','epic','legendary')
    order by random() limit 1;
    v_pity := 0;
  else
    select sum(weight) into v_total from public.gacha_items where banner_id = p_banner_id;
    v_roll := floor(random() * v_total)::int + 1;
    select * into v_pick from (
      select *, sum(weight) over (order by weight desc, item_key) as cum from public.gacha_items where banner_id = p_banner_id
    ) x where v_roll <= cum order by cum limit 1;
    -- pity increment only if not rare+
    if v_pick.rarity in ('rare','epic','legendary') then v_pity := 0; else v_pity := v_pity + 1; end if;
  end if;

  -- duplicate check -> conversion 10 credits
  if exists (select 1 from public.vault_items where user_id = v_uid and item_key = v_pick.item_key) then
    v_is_dup := true;
    update public.wallets set credits = credits + 10 where user_id = v_uid;
    insert into public.wallet_transactions (user_id, currency, amount, balance_after, reason, idempotency_key)
    values (v_uid, 'credits', 10, (select credits from public.wallets where user_id = v_uid), 'gacha_duplicate', 'dup:' || v_pick.item_key || ':' || extract(epoch from clock_timestamp())::text);
  else
    insert into public.vault_items (user_id, item_key, category, rarity) values (v_uid, v_pick.item_key, v_pick.category, v_pick.rarity)
    on conflict (user_id, item_key) do nothing;
  end if;

  insert into public.gacha_pity (user_id, banner_id, pity_count) values (v_uid, p_banner_id, v_pity)
  on conflict (user_id, banner_id) do update set pity_count = excluded.pity_count;
  insert into public.gacha_pulls (user_id, banner_id, item_key, rarity, is_duplicate) values (v_uid, p_banner_id, v_pick.item_key, v_pick.rarity, v_is_dup);
  perform public.insert_analytics_event('gacha_pull', jsonb_build_object('banner', p_banner_id, 'item', v_pick.item_key, 'duplicate', v_is_dup));

  return jsonb_build_object('status', 'ok', 'item_key', v_pick.item_key, 'category', v_pick.category, 'rarity', v_pick.rarity, 'duplicate', v_is_dup, 'pity', v_pity);
end $$;

alter table public.gacha_banners enable row level security;
alter table public.gacha_items enable row level security;
alter table public.gacha_pulls enable row level security;
alter table public.gacha_pity enable row level security;
create policy "banners readable" on public.gacha_banners for select using (true);
create policy "gacha items readable" on public.gacha_items for select using (true);
create policy "own pulls" on public.gacha_pulls for select using ((select auth.uid()) = user_id);
create policy "own pity" on public.gacha_pity for select using ((select auth.uid()) = user_id);

-- Event minimal: Double XP Weekend flag (client checks is_active via date)
create table if not exists public.events (
  id text primary key,
  title text not null,
  description text not null default '',
  xp_multiplier numeric not null default 1.0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '30 days')
);
insert into public.events (id, title, description, xp_multiplier, starts_at, ends_at) values
  ('double_xp_weekend', 'Double XP Weekend', 'Dapatkan 2x XP dari quest & combat!', 2.0, now(), now() + interval '7 days')
on conflict (id) do nothing;
alter table public.events enable row level security;
create policy "events readable" on public.events for select using (true);
