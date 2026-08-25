# Phase 4 Report — Combat

> Per PRD contract: implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

**Assets (PixelLab, 3 generations):**
- Glitch Scout (4-dir, 68px) — corrupted robot gremlin, red eye
- Glitch Warden mini-boss (4-dir, 92px) — hulking construct, teal glitch cracks
- Slash attack VFX (48px, teal energy arc)

**Combat engine (D05 §3 / D13):**
- `content/enemies/enemies.json` — data-driven stats: hp/damage/speed/aggro/attack radius/cooldown/xp/credits/respawn.
- `game/entities/Enemy.ts` — state AI (idle-wander → chase → attack), per-enemy HP bars (hidden at full), hurt flash + directional knockback, death animation, timed respawn at home point, `enemy:defeated` event.
- `game/combat/CombatSystem.ts` — directional attack (SPACE / ⚔ button), slash VFX tween, reach check, damage formula `8 + power×0.8` (attribute model D13), attack cooldown 420ms.
- Player: HP 50 (max_hp attribute), 600ms i-frames, camera shake + red tint on hit, faint → full-heal respawn at safe point with toast.
- World: 3 Glitch Scouts + Glitch Warden patrol the glitch zone north of the bridge gate — combat now has a reason to cross the gate.
- Rewards server-authoritative: each kill calls `grant_rewards` RPC (reason `enemy_defeated`) → wallet ledger + XP; HUD wallet chip refreshes.

**Also fixed this phase:**
- Black-canvas root causes (scene never registered in game config; default phaser imports rejected by Turbopack) — verified end-to-end with headless Chromium screenshots.
- `?renderer=canvas` debug param + `window.__ROBIKA_GAME` debug hook.

## Files changed
`d357b32` — content/{enemies,worlds}/**, game/{entities/Enemy,combat/CombatSystem}**, game/scenes/HubScene.ts, game/entities/Player.ts, components/game-ui/Hud.tsx, game/data/ContentRegistry.ts, public/assets/** (3 sprites + manifest).

## Database changes
None — reuses `grant_rewards` RPC from Phase 0 baseline.

## Tests added
Headless combat verification script (login → teleport → attack chain → death → reward check); not yet promoted into CI suite.

## Test results
- Lint clean · build ✓ · deployed (READY 4m).
- Headless: kill chain 20hp → 8 → dead ✓; player took 10 dmg from AI ✓; wallet +15 XP/+5 Credits via server ledger ✓; quest tracker shows objectives ticking.
- Screenshot verified: warden/scouts visible, toast + wallet chip + HP bar live.

## Known limitations
1. Enemy walk/idle animations are single-frame (direction swap only) — animation batch queued later.
2. No enemy contact-damage separation from attack anim (damage on cooldown while in radius).
3. Kill rewards validated only by client event → server grants; objective-style anti-farm (rate limits, plausibility) lands in Phase 13 hardening.
4. Mini-boss has no special attack pattern yet (behaves as big scout).
5. Player death penalty is just respawn (no XP loss) — by design for MVP friendliness.

## Next phase
**Phase 5 — Academy**: course/chapter/lesson content model (D09), lesson player UI, exercises running in the sandbox, mastery tracking (MASTERY tables), Practice-in-Game link (lesson → quest challenge), first JS course "Dasar Kode" (variables → conditions → loops).
