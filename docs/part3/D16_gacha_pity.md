# D16 — ROBika Gacha / Pity Architecture

> Capsule machine (§35) with **server-controlled RNG**, **visible odds before purchase**, **confirmation gate on premium spend**, **pity system**, and **duplicate conversion**. Transparency is a product rule — probabilities are never hidden.

---

## 1. Content Model (`content/gacha/*.json` + tables D03 GACHA)

```jsonc
{
  "banner_id": "b_founders_circuit",
  "name_key": "gacha.founders.name",
  "window": { "starts_at": "...", "ends_at": "..." },
  "cost": { "currency": "gems", "amount": 100 },
  "odds": {                       // rendered verbatim in UI info panel
    "common": 0.60, "rare": 0.30, "epic": 0.085, "legendary": 0.015
  },
  "pity": {
    "epic_soft": { "at_pulls": 10, "ramp": [0.085,0.17,0.34,0.68] },
    "legendary_hard": { "at_pulls": 50 },
    "reset_on": ["epic_or_higher", "legendary"]
  },
  "duplicates": {                 // conversion table per rarity
    "common": {"credits": 40}, "rare": {"credits": 120},
    "epic": {"gems": 40},     "legendary": {"gems": 150}
  },
  "featured_pool": ["skin_rust_scout"],
  "min_bridge_version": null
}
```

## 2. Server Pull Pipeline (`gacha_pull` RPC)

```
1 validate: banner active+window, funds sufficient
2 lock pity row (SELECT ... FOR UPDATE)
3 resolve rarity:
    base weight from odds → apply soft-pity ramp if pulls_since_epic ≥ threshold
    hard guarantee legendary at cap
4 pick reward_ref within rarity pool (uniform; featured weighting optional field)
5 duplicate check vs vault_items:
    owned ⇒ was_duplicate=true, apply conversion instead of grant
6 atomic write: gacha_pulls row (rng_seed, pity_snapshot)
                + pity counters update + wallet debit
                + vault grant OR conversion credit
7 return result bundle → client plays reveal animation
```

- RNG: crypto-stable server PRNG seeded per pull; seed stored for auditability.
- Single transaction ⇒ no state where user paid without result or vice versa.
- Multi-pull (x10) = loop inside one transaction, one ledger entry per pull.

## 3. UX Contract

- Pre-pull screen shows odds table (exact numbers), pity progress bar ("Legendáris dalam ≤ N tarikan"), duplicate-conversion rates, and cost.
- Confirm modal required for every premium spend (product rule).
- Reveal sequence: capsule shake → burst by rarity tier color → item card; duplicates show "+40 Gems" conversion card.
- History tab lists past pulls w/ timestamps from `gacha_pulls`.

## 4. Fairness & Compliance

- Odds in content == odds displayed (lint test compares banner JSON to a rendered snapshot).
- Pity snapshots stored per pull so support can verify claims.
- No purchase-path manipulation client-side: client only ever sends `pull(banner_id, count)`; everything else server-side.
- Rate limit pulls per user/minute to prevent UI spam loops.

## 5. Offline

Gacha requires online (premium spend). Offline state hides banners behind "Requires connection" chip rather than dead buttons.

## 6. Testing (feeds D22)

Statistical suite: N=10k simulated pulls per banner — distribution within tolerance of declared odds; hard pity fires exactly at cap.
Unit: duplicate conversion mapping; soft ramp math; insufficient funds rejection.
Integration: transaction rollback when grant fails mid-loop; idempotent retry safe.
E2E: pull once with seeded wallet → reveal → history updated → pity bar advanced.
