# D13 — ROBika Skin / Equipment / Attribute Architecture

> Defines how visuals and stats compose: **attributes** are the numeric model, **equipment** modifies them, **skins** change appearance only. Server computes authoritative derived stats; client renders.

---

## 1. Attribute Model

```jsonc
// character_state.attributes (versioned keys — additive evolution safe)
{
  "v": 1,
  "base": { "power": 5, "focus": 5, "speed": 5, "max_hp": 50 },
  // derived = base + level growth + equipment mods + temporary effects
}
```

- Level-up grants per-class growth table from `levels` config + content profile.
- Derived-stat function is pure & shared (`lib/economy/stats.ts`) with identical server/client copies tested for parity.

## 2. Equipment Modifiers

- Each `eq_*` item declares `"mods": {attr: flat}` (+ optional `"mods_pct"` later).
- Composition order: `derived[attr] = round((base + Σflat) * Π(1+pct))`.
- Set bonuses reserved as future content field (`"set_id"`) — schema-ready, not MVP.

## 3. Skins

- Purely cosmetic: no attribute influence ever (protects economy fairness / anti-pay-to-win stance).
- Sprite pipeline: PixelLab character states per skin (`sprite_set` folder with directional sheets); player entity swaps texture registry key on equip event.
- Preview system: vault popup renders idle animation loop of owned/unowned (unowned = silhouette + lock).

## 4. Visual Composition Layers (player render)

```
body(base appearance) → skin overlay(sprite_set) → weapon layer → armor layer → companion slot → effect auras(loadout.effects)
```
Layer z-order constants in `game/entities/Player`; each layer keyed by ref so missing assets degrade gracefully (skip layer + telemetry warn) instead of breaking the sprite.

## 5. Temporary Effects

`loadout.effects` holds active modifiers with expiry (consumable boosts, event buffs):
```jsonc
{ "ref":"boost_xp_10", "attr":"xp_gain", "pct":0.10, "expires_at":"2026-08-31T00:00:00Z", "source":"event_summer" }
```
Applied by same composition function; combat reads final snapshot at action time.

## 6. Combat Integration

- Damage formula consumes `power` + weapon class multiplier; hit chance uses `focus`; move speed caps from `speed`.
- Enemy scaling tables reference expected derived ranges per dungeon tier (balance doc lives with content).
- All damage resolution happens engine-side locally but rewards/XP only via server validation (server re-checks plausibility bounds — e.g., impossible one-shot of boss flags review).

## 7. Testing (feeds D22)

Unit: composition math incl. pct rounding; parity test client fn vs server fn.
Gameplay: equipping stat item changes measured DPS/movement within tolerance; removing reverts.
Content lint: every equipment/skin ref resolvable to assets + desc keys.
E2E: equip better sword → dummy fight time drops (§70 step 16 tie-in).
