# D14 — ROBika Economy / Wallet Architecture

> Two currencies: **Credits** (earned in-game) and **Gems** (premium, purchased via Midtrans or earned rarely). Server-authoritative balances with append-only ledger (D03 ECONOMY). No pay-to-win: Gems never buy direct combat power.

---

## 1. Currency Rules

| Currency | Sources | Sinks | Client trust |
|---|---|---|---|
| Credits | quests, enemy drops (validated), missions, achievements, duplicate conversions | shop items, some gacha banners, consumables | display-only |
| Gems | top-up purchases (payment verified), select event/achievement rewards, pity-adjacent bonuses | premium skins/companions, banner pulls, convenience (inventory slots later) | display-only |

Wallet row (`wallets`) holds both + `version` for optimistic locking; every mutation goes through `wallet_apply(user, entries[], idempotency_key)` transaction which:
1. locks wallet row,
2. applies deltas with non-negative constraint,
3. appends `wallet_transactions` rows incl. `balance_after`,
4. bumps version,
5. returns new balances.

## 2. Ledger Discipline (§61/§62)

- Append-only: no UPDATE/DELETE grants even to service role outside migration windows.
- Every entry carries `reason` + polymorphic ref (`purchase`, `pull`, `quest`, `mission`).
- Idempotency keys mandatory for payment/gacha paths; unique index rejects replays.
- Reconciliation job (Phase 13): sum(transactions) == wallets.balance per user; drift alerts.

## 3. Shop

- `shop_items` content-driven (kind, price currency, stock limits, sort).
- Purchase flow (non-payment items): RPC validates funds → debits → grants → purchase row `delivered` → inbox receipt. Atomic; failure rolls back all.
- Payment-backed purchases route through D15 order pipeline instead of direct debit.
- Shop UI: world-styled vendor stall in hub + `/shop` page; prices shown pre-confirm; history tab reads purchases + ledger filtered.

## 4. Top-Ups

- `topup_products` config (gems packs, IDR pricing).
- UI → `/api/payments/create-order` → Midtrans Snap popup → webhook finalizes (D15).
- Pending orders visible in purchase history with status chips.

## 5. Earning Balance Targets (initial tuning)

- First quest ≈ 60 XP + 25 credits (D06 example) — enough for first consumable within ~30 min.
- Daily missions cap ~150 credits/day baseline; events multiply.
- Gem faucets (non-payment): achievement milestones, season points — small but present so F2P path exists.

## 6. Offline Posture

- Balances cached read-only offline; spending disabled with clear state ("Reconnect to spend").
- Earned rewards offline queue as pending intents; applied on sync via server validation (anti-farm guard: server re-checks quest/enemy context plausibility).

## 7. Testing (feeds D22)

Unit: wallet_apply math incl. concurrent version conflicts.
Integration: double-spend attempts rejected; idempotent replay returns same result no-op.
Ledger suite: every grant path writes balanced rows; reconciliation passes on seeded dataset.
E2E: buy consumable with credits → balance updates everywhere (HUD/shop/history).
