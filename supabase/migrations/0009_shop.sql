-- Phase 8 — Economy: Shop + Wallet display + purchase ledger stub
-- Wallets already exist (migration 0001); add shop catalog + purchase history

create table if not exists public.shop_items (
  id text primary key,
  title text not null,
  description text not null default '',
  kind text not null check (kind in ('skin','weapon','gear','module','companion','effect','credits_pack','gems_pack')),
  price_credits bigint not null default 0 check (price_credits >= 0),
  price_gems bigint not null default 0 check (price_gems >= 0),
  reward_item_key text,
  reward_category text,
  rarity text not null default 'common',
  sort_order int not null default 0
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_item_id text not null references public.shop_items(id),
  price_credits bigint not null default 0,
  price_gems bigint not null default 0,
  status text not null default 'completed' check (status in ('completed','pending','failed')),
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (user_id, created_at desc);

insert into public.shop_items (id, title, description, kind, price_credits, reward_item_key, reward_category, rarity, sort_order) values
  ('credits_100', 'Koin 100', 'Paket Credits untuk belanja kosmetik', 'credits_pack', 0, null, null, 'common', 10),
  ('skin_aurum', 'Skin Aurum', 'Skin emas mengkilap — koleksi Vault', 'skin', 150, 'skin_aurum', 'skin', 'rare', 20),
  ('weapon_debug_blade', 'Debugger Blade', 'Pisau debug +ATK', 'weapon', 200, 'weapon_debug_blade', 'weapon', 'epic', 30),
  ('effect_spark', 'Trail Spark', 'Efek jejak api', 'effect', 80, 'effect_spark', 'effect', 'uncommon', 40)
on conflict (id) do nothing;

-- Purchase via credits: ledger + vault + history atomically
create or replace function public.purchase_with_credits(p_shop_item_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_wallet public.wallets%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_item from public.shop_items where id = p_shop_item_id;
  if not found then raise exception 'item tidak ditemukan'; end if;
  if v_item.price_credits = 0 then raise exception 'item ini bukan paket credits'; end if;

  select * into v_wallet from public.wallets where user_id = v_uid for update;
  if v_wallet.credits < v_item.price_credits then
    return jsonb_build_object('status', 'insufficient', 'credits', v_wallet.credits);
  end if;

  update public.wallets set credits = credits - v_item.price_credits, updated_at = now() where user_id = v_uid;
  insert into public.purchases (user_id, shop_item_id, price_credits, status) values (v_uid, p_shop_item_id, v_item.price_credits, 'completed');

  if v_item.reward_item_key is not null then
    insert into public.vault_items (user_id, item_key, category, rarity)
    values (v_uid, v_item.reward_item_key, v_item.reward_category, v_item.rarity)
    on conflict (user_id, item_key) do nothing;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, balance_after, reason, idempotency_key)
  values (v_uid, 'credits', -v_item.price_credits, v_wallet.credits - v_item.price_credits, 'shop_purchase', 'shop:' || p_shop_item_id || ':' || extract(epoch from clock_timestamp())::text);

  perform public.insert_analytics_event('shop_purchase', jsonb_build_object('item', p_shop_item_id));
  return jsonb_build_object('status', 'completed');
end $$;

-- Shop items readable, purchases own
alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;
create policy "shop readable" on public.shop_items for select using (true);
create policy "own purchases" on public.purchases for select using ((select auth.uid()) = user_id);
