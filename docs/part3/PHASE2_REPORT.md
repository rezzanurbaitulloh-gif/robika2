# Phase 2 Report — Coding (Terminal, Sandbox, Bridge)

> Per PRD contract: implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

**Coding engine (D07/D08):**
- `content/challenges/ch_gate_power.json` — first data-driven challenge: teach `for` loops; user's `nyalakanGerbang(bridge)` must send exactly 3 `bridge.pulse("gate_bridge")` calls. Progressive hint ladder (3 levels, no auto-solution).
- `lib/coding/sandboxSource.ts` — sandbox Web Worker built from source string: Proxy-based bridge recorder (any verb call → effect intent), capped console capture, strict mode, no DOM/network/imports.
- `lib/coding/ChallengeRunner.ts` — worker lifecycle (Blob URL, terminate on finish), wall-clock timeout kill with friendly loop message, declarative test validation against recorded effects (`expectPulses`, `expectTarget`).
- Bridge semantics per D08: record → validate → replay; success replays `world:effect` into the scene.

**World integration:**
- Boot Valley map gains `G` gate (solid, energy-beam sprite) + `K` terminal (interactable → opens Code Terminal).
- Gate opens cinematically: 3 alpha flashes (matching 3 pulses) → beam fades, collision disabled, toast "Gerbang jembatan MENYALA!", flag `gate_opened` persisted via SaveSystem — reload keeps it open.
- Input locks while terminal open; ESC/✕ closes; tap-to-advance unaffected.

**UI:**
- `CodeTerminal.tsx` overlay: Monaco editor (lazy CDN loader with plain-textarea fallback), RUN (sandbox), Reset, hint ladder, log console, pass/fail/timeout states (§67), draft autosave per challenge in localStorage.
- `Toast.tsx` for world-reaction announcements.

**Housekeeping:**
- Supabase fully reset per user request: old auth users wiped, public schema dropped & migration 0001 re-applied fresh; seeded dev account `dev@robika.game` / `RobikaDev2026!` (trigger auto-created profile + Lv1 character + 0/0 wallet).
- Legacy v1 prototype sprites (bot-1, gate, tiles) archived into `public/assets/legacy_v1/` (not in active manifest — D20 visual-language rule).
- Project moved to permanent path `/home/reja/ROBika/robika2` (was /tmp); old attempt's `public/assets/pixel` left untouched at `/home/reja/ROBika/public`.
- Vercel: production now served from project `robika2` (framework=nextjs fixed, 20 env vars attached); git-connected auto-deploy verified working.

## Files changed
`2910e45` — content/challenges/**, lib/coding/**, game/scenes/HubScene.ts, game/systems/InteractionSystem.ts, game/data/ContentRegistry.ts, components/game-ui/{CodeTerminal,Toast}.tsx, content/worlds/boot_valley.json, public/assets/{props,legacy_v1}/**, manifest.json.

## Database changes
Full reset + re-apply of 0001 (no schema change vs Phase 0). Dev user seeded.

## Tests added
None automated yet — sandbox security suite + server re-run parity land next phase (D22 §2).

## Test results
- Lint 0/0 · TypeScript clean · build ✓.
- Live: terminal/gate sprites 200; `/game` guard intact; deploy ready 35s.
- Manual: challenge solvable with 3-pulse loop; wrong counts fail with test name; infinite loop hits 5s timeout gracefully.

## Known limitations
1. Monaco loads from CDN (offline fallback = textarea) — self-host loader in Phase 11 offline work.
2. Sandbox tests run client-side only; server-side re-run parity (anti-cheat for quest grading) arrives with quest RPCs (Phase 3).
3. Gate visual is single state (closed sprite + fade) — dedicated open-state sprite later.
4. Only 1 challenge wired; challenge browser/CodeLab integration comes in Phase 5/6.

## Next phase
**Phase 3 — Quest**: QuestEngine + objectives (talk/interact/coding/defeat placeholders), quest tracker HUD, turn-in via `grant_rewards` RPC, first real quest "The Darkened Bridge" chaining Mira → terminal → gate → reward.
