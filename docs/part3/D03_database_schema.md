# D03 — ROBika Database ERD / Schema Proposal

> Supabase PostgreSQL. Conventions (§60): `uuid` primary keys (`gen_random_uuid()`), `created_at`/`updated_at timestamptz default now()`, foreign keys with explicit ON DELETE, indexes on every FK and hot query path, **RLS enabled on every table**, all mutations that touch value/progress validated server-side (RPC/Edge), client uses anon key only.
> Content tables are read-mostly; gameplay state tables are per-player.

---

## 1. Domain Map (PRD §60)

```
IDENTITY ─┬─ profiles · character_state · saves
MASTERY  ── mastery
CODELAB  ── projects · project_files · project_versions
ECONOMY  ── wallets · wallet_transactions · shop_items · purchases · topup_products
            payment_orders · payment_events
GACHA    ── gacha_banners · gacha_rates · gacha_pulls · gacha_pity · gacha_rewards
LIVE     ── daily_missions · events · event_progress · seasons · season_progress
            inbox_messages · notifications
AI       ── ai_sessions · ai_usage
CERTS    ── certificates
RPG      ── player_xp · levels(config) · inventory_items · vault_items · loadouts
            achievements · achievement_progress
SYNC     ── sync_log (audit of applied outbox batches)
```

---

## 2. Identity & Progression

```sql
-- extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text,
  avatar_url text,
  onboarded_at timestamptz,           -- null until account+character setup done (§68)
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table character_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  level int not null default 1,
  xp bigint not null default 0,        -- authoritative; client XP is display-only
  attributes jsonb not null default '{}',   -- {power, focus, speed, ...} versioned keys
  appearance jsonb not null default '{}',   -- chosen base look from character setup
  updated_at timestamptz not null default now()
);

create table saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slot smallint not null default 1,
  world_id text not null,
  scene text not null,
  position jsonb not null,
  state jsonb not null,               -- opaque engine snapshot (quest flags, flags, timers)
  revision bigint not null default 1, -- lamport counter for conflict-aware sync (D19)
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);
create index on saves (user_id, updated_at desc);

create table levels (                 -- config table: XP curve
  level int primary key,
  xp_required bigint not null,
  rewards jsonb not null default '[]'
);
```

## 3. MASTERY

```sql
create table mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  skill text not null,                -- e.g. 'js.variables', 'py.loops'
  score numeric not null default 0 check (score between 0 and 100),
  evidence jsonb not null default '[]',     -- lesson/challenge ids contributing
  updated_at timestamptz not null default now(),
  unique (user_id, skill)
);
create index on mastery (user_id, skill);
```

## 4. CODELAB

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  runtime text not null default 'javascript',   -- adapter id (D07/D10)
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on projects (user_id, updated_at desc);

create table project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table project_versions (       -- run/save history (CodeLab "project history")
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text,
  snapshot jsonb not null,            -- full file map at save point
  created_at timestamptz not null default now()
);
create index on project_versions (project_id, created_at desc);
```

## 5. ECONOMY

```sql
create table wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  credits bigint not null default 0 check (credits >= 0),
  gems bigint not null default 0 check (gems >= 0),
  version bigint not null default 0,  -- optimistic concurrency for grants
  updated_at timestamptz not null default now()
);

create table wallet_transactions (    -- append-only LEDGER — never UPDATE
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  currency text not null check (currency in ('credits','gems')),
  amount bigint not null,             -- positive credit / negative debit
  balance_after bigint not null,
  reason text not null,               -- quest_reward|purchase|gacha|topup|refund|conversion...
  ref_type text, ref_id uuid,         -- polymorphic link (purchase, pull, quest)
  idempotency_key text unique,        -- REQUIRED for payment/gacha grants
  created_at timestamptz not null default now()
);
create index on wallet_transactions (user_id, created_at desc);

create table topup_products (
  id text primary key,                -- e.g. 'gems_100'
  gems int not null,
  price_idr int not null,
  active boolean not null default true,
  sort int not null default 0
);

create table shop_items (
  id text primary key,
  kind text not null check (kind in ('skin','equipment','item','bundle','credits_pack')),
  payload jsonb not null,             -- item/skin reference + display data
  price_currency text not null check (price_currency in ('credits','gems')),
  price_amount bigint not null,
  stock_limit int,                    -- null = unlimited
  active boolean not null default true,
  sort int not null default 0
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  shop_item_id text references shop_items(id),
  currency text not null,
  price_paid bigint not null,
  status text not null default 'pending'
    check (status in ('pending','paid','delivered','failed','refunded')),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table payment_orders (         -- Midtrans lifecycle (server-written only)
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id text not null unique,      -- our order id sent to Midtrans
  gross_amount_idr int not null,
  snap_token text,
  status text not null default 'created'
    check (status in ('created','pending','settlement','deny','cancel','expire','failure','refund')),
  midtrans_transaction_id text,
  raw_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on payment_orders (user_id, created_at desc);

create table payment_events (         -- every webhook/notification row → idempotency source
  id uuid primary key default gen_random_uuid(),
  order_id text not null references payment_orders(order_id),
  event_type text not null,
  signature_valid boolean not null,
  payload jsonb not null,
  processed_at timestamptz,           -- set once; guard = unique(event signature digest)
  event_digest text unique,           -- sha256(payload canonical) → exactly-once processing
  received_at timestamptz not null default now()
);
```

## 6. GACHA

```sql
create table gacha_banners (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cost_currency text not null default 'gems',
  cost_amount bigint not null,
  pity_rules jsonb not null,          -- {soft_at, hard_at, reset_on}
  duplicate_policy jsonb not null,    -- conversion table per rarity
  active boolean not null default true
);

create table gacha_rates (            -- displayed odds = this table (never hidden §2648)
  banner_id text not null references gacha_banners(id) on delete cascade,
  rarity text not null check (rarity in ('common','rare','epic','legendary')),
  reward_ref text not null,           -- skin/equipment/item id
  weight numeric not null,
  featured boolean not null default false,
  unique (banner_id, reward_ref)
);

create table gacha_pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  banner_id text not null references gacha_banners(id),
  rarity text not null,
  reward_ref text not null,
  was_duplicate boolean not null default false,
  converted_to jsonb,                 -- e.g. {"gems": 40}
  pity_snapshot jsonb not null,       -- counters before/after for transparency
  rng_seed bigint not null,           -- server RNG audit trail
  created_at timestamptz not null default now()
);
create index on gacha_pulls (user_id, created_at desc);

create table gacha_pity (
  user_id uuid not null references profiles(id) on delete cascade,
  banner_id text not null references gacha_banners(id),
  pulls_since_epic int not null default 0,
  pulls_since_legendary int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, banner_id)
);
```

## 7. LIVE CONTENT

```sql
create table daily_missions (
  id text primary key,
  title text not null,
  goal jsonb not null,                -- {type:'defeat_enemies', target:10}
  rewards jsonb not null,
  active_days text not null default '*'   -- cron-ish selector
);
create table missions_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  mission_date date not null,
  mission_id text not null references daily_missions(id),
  progress int not null default 0,
  claimed boolean not null default false,
  primary key (user_id, mission_date, mission_id)
);

create table seasons (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  pass_tiers jsonb not null default '[]'    -- future-ready (P9)
);
create table season_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  season_id text not null references seasons(id),
  points int not null default 0,
  claimed_tiers jsonb not null default '[]',
  primary key (user_id, season_id)
);

create table events (
  id text primary key,
  name text not null,
  kind text not null,                 -- 'xp_boost'|'world_modifier'|'banner'
  config jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true
);
create table event_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  event_id text not null references events(id),
  progress jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table inbox_messages (         -- reward/system inbox (§66, D18)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('reward','system','payment_receipt','gacha_result')),
  title text not null,
  body text,
  attachment jsonb,                   -- claimable grant spec; claimed via RPC only
  claimed_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on inbox_messages (user_id, created_at desc);

create table notifications (          -- transient contextual toasts log
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,                 -- 'quest.completed', 'level_up', ...
  payload jsonb not null default '{}',
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, seen, created_at desc);
```

## 8. AI

```sql
create table ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  agent text not null check (agent in ('tutor','debugger','mentor','bot1','quest_ai','coach')),
  context jsonb not null default '{}',  -- lesson/challenge refs (ids only, no secrets)
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table ai_usage (               -- metering/quota (D11); server-written
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references ai_sessions(id),
  provider text not null,             -- gemini|hc|mistral|omniroute|router9
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index on ai_usage (user_id, created_at desc);
```

## 9. RPG Ownership

```sql
create table vault_items (             -- PERMANENT owned collection (D12)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_kind text not null check (item_kind in ('skin','equipment','companion','module')),
  item_ref text not null,             -- content id
  acquired_via text not null,         -- quest|shop|gacha|achievement|event
  first_acquired_at timestamptz not null default now(),
  unique (user_id, item_kind, item_ref)     -- ownership is deduplicated by definition
);

create table inventory_items (        -- OPERATIONAL storage (consumables/stackables)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_ref text not null,
  quantity int not null default 1 check (quantity > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, item_ref)
);

create table loadout (                -- equipped state (one active loadout MVP; slots extensible)
  user_id uuid primary key references profiles(id) on delete cascade,
  skin_ref text,
  equipment jsonb not null default '{}',   -- {weapon: ref, armor: ref, ...} slot→ref
  companion_ref text,
  effects jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table loadout add constraint loadout_skin_fk
  foreign key (user_id, skin_ref) references vault_items (user_id, item_ref) deferrable;
-- NOTE: enforce "must own before equip" inside RPC grant/equip functions (composite FK above
-- matches only when a matching vault row exists).

create table achievements (
  id text primary key,
  title text not null,
  goal jsonb not null,
  reward jsonb not null
);
create table achievement_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id),
  progress int not null default 0,
  unlocked_at timestamptz,
  primary key (user_id, achievement_id)
);
```

## 10. CERTIFICATES

```sql
create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  issued_at timestamptz not null default now(),
  serial text not null unique,        -- verifiable public id
  metadata jsonb not null default '{}',
  unique (user_id, course_slug)
);
```

## 11. SYNC AUDIT

```sql
create table sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_id text not null,
  batch jsonb not null,               -- applied ops summary
  conflicts jsonb not null default '[]',
  applied_at timestamptz not null default now()
);
create index on sync_log (user_id, applied_at desc);
```

---

## 12. RLS Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles, character_state, saves | own rows | own rows (service bypass) | own rows (revision-checked) | deny |
| wallets | own | deny | deny (RPC only) | deny |
| wallet_transactions | own | deny (ledger written via function) | deny | deny |
| payment_orders / payment_events | own (masked) | deny | deny (webhook service role) | deny |
| gacha_pulls / gacha_pity | own | deny (pull RPC) | deny (pull RPC) | deny |
| vault/inventory/loadout | own | via grant RPC | via equip/use RPC | deny |
| projects/files/versions | own CRUD within owner scope | ✓ | ✓ | ✓ |
| mastery, missions_progress, season/event_progress, achievement_progress | own | via progress RPC | via progress RPC | deny |
| inbox_messages, notifications | own | service | mark read/claim RPC | deny |
| ai_sessions/ai_usage | own reads | via proxy route | close session | deny |
| certificates | own + public verify(serial) | issue RPC | deny | deny |

Global rules: content/config tables (`shop_items`, `gacha_*`, `seasons`, `events`, `daily_missions`, `levels`, `achievements`) readable by `anon`/`authenticated`; writable by service role only. Every policy uses `(select auth.uid())`.

## 13. Server-Authoritative Functions (Edge/RPC)

- `grant_rewards(user, xp?, credits?, items?)` — single entry for quest/combat rewards; updates character_state, wallet, vault/inventory atomically.
- `gacha_pull(user, banner_id)` — validates funds, locks pity row, resolves RNG, writes pull+pity+grants in one transaction.
- `finalize_payment(order_id)` — called only from webhook after signature verify + `payment_events.event_digest` uniqueness; grants Gems once; writes ledger.
- `apply_sync_batch(user, device_id, ops[])` — D19 conflict resolution; bumps `saves.revision`.
- `equip_item(user, kind, ref)` — verifies vault ownership then writes loadout.
- `issue_certificate(user, course)` — mastery threshold gate.

## 14. Indexing Summary

FKs indexed everywhere; hot paths: `wallet_transactions(user_id, created_at desc)`, `gacha_pulls(user_id, created_at desc)`, `inbox_messages(user_id, created_at desc)`, `projects(user_id, updated_at desc)`, `project_versions(project_id, created_at desc)`, `saves(user_id, updated_at desc)`. Ledger and payment tables are append-only → cheap vacuum, easy audit.

## 15. Migration Order (Phase 0 baseline)

`0001_profiles_character_saves_levels` → `0002_economy_core` → `0003_rpg_ownership` → `0004_gacha` → `0005_live_content` → `0006_codelab` → `0007_ai_cert_sync`. Seed only dev fixtures. Payment/gacha features ship behind flags even after schema exists (vertical-slice rule §69).
