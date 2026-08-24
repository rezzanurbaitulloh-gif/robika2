-- ROBika Phase 0 baseline: identity, saves, levels, economy core, authority RPCs.
-- Conventions per docs/part3/D03_database_schema.md

create extension if not exists "pgcrypto";

-- ============ IDENTITY ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (char_length(username) between 3 and 24),
  display_name text,
  avatar_url text,
  onboarded_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  level int not null default 1,
  xp bigint not null default 0,
  attributes jsonb not null default '{"v":1,"base":{"power":5,"focus":5,"speed":5,"max_hp":50}}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null default 1,
  world_id text not null,
  scene text not null,
  position jsonb not null,
  state jsonb not null,
  revision bigint not null default 1,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);
create index if not exists saves_user_updated_idx on public.saves (user_id, updated_at desc);

create table if not exists public.levels (
  level int primary key,
  xp_required bigint not null,
  rewards jsonb not null default '[]'::jsonb
);
insert into public.levels (level, xp_required) values
  (1, 0), (2, 100), (3, 250), (4, 500), (5, 900)
on conflict (level) do nothing;

-- ============ ECONOMY CORE ============
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  credits bigint not null default 0 check (credits >= 0),
  gems bigint not null default 0 check (gems >= 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null check (currency in ('credits','gems')),
  amount bigint not null,
  balance_after bigint not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists wtx_user_created_idx on public.wallet_transactions (user_id, created_at desc);

-- ============ TRIGGERS ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  insert into public.character_state (user_id) values (new.id)
  on conflict (user_id) do nothing;
  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ AUTHORITY RPCs ============
create or replace function public.complete_onboarding(p_username text, p_appearance jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.profiles
     set username = lower(p_username),
         display_name = p_username,
         onboarded_at = now(),
         updated_at = now()
   where id = v_uid;
  if not found then raise exception 'profile missing'; end if;
  update public.character_state set appearance = p_appearance where user_id = v_uid;
end $$;

create or replace function public.grant_rewards(
  p_xp bigint default 0,
  p_credits bigint default 0,
  p_reason text default 'quest_reward',
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_idem text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_wallet record;
  v_level int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_wallet from public.wallets where user_id = v_uid for update;

  if p_credits <> 0 then
    update public.wallets
       set credits = credits + p_credits,
           version = version + 1,
           updated_at = now()
     where user_id = v_uid
     returning credits into v_wallet.credits;
    insert into public.wallet_transactions
      (user_id, currency, amount, balance_after, reason, ref_type, ref_id, idempotency_key)
    values
      (v_uid, 'credits', p_credits, v_wallet.credits, p_reason, p_ref_type, p_ref_id, p_idem)
    on conflict (idempotency_key) do nothing;
  end if;

  if p_xp > 0 then
    update public.character_state
       set xp = xp + p_xp,
           level = coalesce((
             select max(level) from public.levels l
              where l.xp_required <= (character_state.xp + p_xp)
           ), 1),
           updated_at = now()
     where user_id = v_uid
     returning level into v_level;
  else
    select level into v_level from public.character_state where user_id = v_uid;
  end if;

  return jsonb_build_object('credits', v_wallet.credits, 'xp_granted', p_xp, 'level', v_level);
end $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.character_state enable row level security;
alter table public.saves enable row level security;
alter table public.levels enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

create policy "own profile read" on public.profiles for select using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update using ((select auth.uid()) = id);

create policy "own character read" on public.character_state for select using ((select auth.uid()) = user_id);
create policy "own character update" on public.character_state for update using ((select auth.uid()) = user_id);

create policy "own saves all" on public.saves for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "levels readable" on public.levels for select using (true);

create policy "own wallet read" on public.wallets for select using ((select auth.uid()) = user_id);

create policy "own ledger read" on public.wallet_transactions for select using ((select auth.uid()) = user_id);
