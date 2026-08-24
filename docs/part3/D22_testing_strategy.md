# D22 — ROBika Testing Strategy

> §76 matrix: automated (unit/integration/API/database/auth/coding-runner/payment/wallet-ledger/gacha/sync) + gameplay + responsive (desktop/laptop/mobile-landscape) + modes (online/offline/reconnect/sync). DoD (§77) gates every phase.

---

## 1. Test Pyramid

```
        E2E Playwright (few, critical journeys)
      Integration API/DB/RPC (supabase local stack)
   Gameplay headless Phaser specs (mechanics truth)
 Unit — pure logic: economy math, pity, sync resolver, stats
```

Tooling: **Vitest** (unit+integration), **Playwright** (E2E incl. offline context emulation), **headless Phaser harness** (jsdom canvas stub / custom fixed-step runner) for gameplay specs, **Supabase CLI local DB** for migration+RPC tests with seed fixtures.

## 2. Suites by Domain

| Suite | Location | Covers | Key assertions |
|---|---|---|---|
| unit/economy | tests/unit | wallet_apply, conversions, shop pricing | non-negative, balance_after chain, idempotent replay |
| unit/gacha | tests/unit | pity ramps, hard cap, duplicate mapping | distribution tolerance vs declared odds (simulated N) |
| unit/sync | tests/unit | lamport merge, per-entity policies, batch chunking | no data loss; deterministic outcomes |
| integration/db | tests/integration | migrations up/down, RLS cross-user denials, RPC contracts | foreign access rejected; grants atomic |
| integration/auth | D04 checklist | onboarding guards, session refresh | redirect matrix exact |
| coding-runner security | D07 suite | network/timeout/memory/output/import violations | all fail-closed; worker recycled |
| server re-run parity | golden challenge set | client effects == server effects list | identical EffectIntent arrays |
| payment pipeline | FakePaymentService + webhook sim | signature verify, digest dedupe, exactly-once gems | replays no-op; divergence holds |
| gameplay core | movement/collision/dialogue/quest/combat/rewards/inventory/vault/equip/save-load | mechanics behave per docs | fixed-seed determinism |
| bridge verbs | D07/D08 | each verb world delta observable | collision mask flips etc. |
| e2e vertical slice | §70 21 steps | full fresh-player loop | passes unattended |

## 3. Responsive & Device Matrix

Playwright projects: `desktop-1920`, `laptop-1366`, `mobile-landscape-844x390` (+portrait shows rotate prompt). Checks: canvas letterbox fit, HUD reflow, touch controls visible, no horizontal scroll.

## 4. Mode Matrix (§76)

Scenarios scripted with route interception: `online` baseline · `offline-from-start` (cached boot path works) · `mid-session-drop` (queue grows, UI badges) · `reconnect-sync` (outbox drains, conflicts resolved per policy, single grants).

## 5. CI Gates (GitHub Actions)

1. lint + typecheck (strict TS)
2. unit + integration against supabase local
3. build (Next.js) + bundle secret scan (service keys must not appear)
4. gameplay + sandbox security suites
5. E2E slice on PRs touching game/economy paths (full matrix nightly)
6. content lint: schema validation of `content/**` + manifest/file existence + odds-display match

All green = phase report may claim "tested" (PRD after-each-phase contract).

## 6. Fixtures & Determinism

Seeded RNG everywhere in tests; clock injection util; snapshot store for content registries; fake timers for cooldown/pity logic.

## 7. Quality Bar per Phase Gate

New feature merges require: its suite green, slice still green, no new console errors in E2E run, coverage ratchet ≥ current (floor 80% lib/, 70% overall aspirational).
