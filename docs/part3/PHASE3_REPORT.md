# Phase 3 Report — Quest

> Per PRD contract: implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

**Content:**
- `content/quests/q_boot_01_darkened_bridge.json` — first real quest: talk_to Mira → coding challenge (gate) → return/turn_in. Rewards 60 XP + 25 Credits.
- Mira dialogue extended with `turn_in` (3-line celebration) and `after_done` trees.

**Engine:**
- `game/quests/QuestEngine.ts` — state machine (`not_started → active → ready_turn_in → completed`) derived from save flags (`met_mira`, `gate_opened`, quest flag); quest-aware dialogue tree selection; RPC turn-in with graceful error toast.
- HubScene integration: Mira's `resolveLines`/`onDialogueEnd` now route through QuestEngine; flags mutate in place so engine stays in sync after save-load.

**Server authority (D03/D06):**
- `supabase/migrations/0002_quests.sql`: `quest_defs` (server-owned reward values), `quest_completions` (unique per user+quest → double turn-in impossible), `complete_quest(p_quest_id)` RPC — validates quest, checks completion, grants via `grant_rewards` with idempotency key `quest:<id>`. RLS: defs readable, completions owner-only.

**UI:**
- `QuestTracker` — objective checklist HUD with strikethrough on completion + "Kembali ke Mira" pulse when ready.
- `WalletChip` — Credits ◈ + Level/XP chip, refreshes on `wallet:refresh` event after rewards.

## Files changed
`1fb7755` — content/{quests,dialogue}/**, game/quests/**, game/scenes/HubScene.ts, game/data/ContentRegistry.ts, components/game-ui/{QuestTracker,GameCanvas}.tsx, supabase/migrations/0002_quests.sql. Plus title screen (`a49999d`).

## Database changes
0002 applied (after access-token renewal): 2 tables, 1 RPC, 2 policies (10 total). Dev account unaffected.

## Tests added
None automated yet (Playwright suite still pending — tracked for Phase 13 gate).

## Test results
- Lint clean · TS clean · build ✓ · deployed (READY 21s).
- DB verify: quest_defs seeded (60/25), RPC present, policies active.
- Manual loop: accept → objectives tick → gate opens → turn-in → toast rewards → wallet chip updates → reload persists completion.

## Known limitations
1. Objective progress validated client-side; server re-validation of objectives (vs. trusting completion claims) lands with anti-cheat hardening (Phase 13) — current protection: idempotent grants + server-owned reward values.
2. Single quest; quest board/list UI comes with more content.
3. No quest marker (!/?) over NPC heads yet — visual polish backlog.

## Next phase
**Phase 4 — Combat**: enemy entities (3 glitch scouts + mini-boss per §69), attack/damage system using attribute+equipment model (D13), hit feedback, enemy.defeated events feeding future quest objectives; PixelLab sprites for enemies.
