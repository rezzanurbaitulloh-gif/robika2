# Phase 1 Report — Playable Game Core

> Per PRD contract: implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

**Assets (PixelLab MCP, 9 generations used of trial 40):**
- Player "Robika Scout": v3 character, 8-dir rotations 48px + `walking-6-frames` template animation ×4 cardinal directions (composed into 288×48 spritesheets).
- NPC "Engineer Mira": standard 4-dir 68px.
- Tileset: Wang grass↔dirt 16-tile sheet → metadata-driven slice of 6 tiles (grass, path center, 4 edges) into a 192×32 atlas; path edges auto-selected by neighbor walkability in HubScene.
- Props: pine tree 64px, signpost 48px.
- All loads go through `public/assets/manifest.json` (data-driven, no hard-coded paths in scenes).

**Gameplay (deployed at https://robika2.vercel.app/game):**
- `HubScene`: ASCII-defined Boot Valley (30×20, `content/worlds/boot_valley.json`) → tile ground + static collision bodies + y-sorted tree depth.
- `Player`: WASD/arrows + touch D-pad, 4-dir walk animations with idle fallback, camera follow with smooth lerp + responsive zoom.
- `InteractionSystem`: nearest-in-radius prompt chip ([E] Bicara / Periksa), tap support.
- `DialogueRunner` + `DialogueBox`: typewriter overlay, advance on click/E/tap; Mira has first_meeting → repeat trees gated by `met_mira` flag.
- `SaveSystem`: debounced upsert to Supabase `saves` (slot 1, revision-safe), autoload on scene create, "Tersimpan ✓" HUD toast.
- Auth guard intact: `/game` → login when anonymous.

## Files changed
`ca718f6` — 25 files (+1 asset batch): `content/{worlds,dialogue}/**`, `game/{scenes,entities,systems,dialogue,data}/**`, `components/game-ui/**`, `lib/game/touchInput.ts`, `public/assets/**` (11 images + manifest).

## Database changes
None new — Phase 0 `saves` table/RPC baseline is now exercised end-to-end.

## Tests added
None automated yet (Playwright harness lands Phase 2+). Manual verification only.

## Test results
- Lint 0 errors · TypeScript clean · production build ✓ (8 routes).
- Live: all 7 manifest asset URLs 200; `/game` guard 307→login; production deploy ready in 32s.

## Known limitations
1. No automated gameplay/E2E tests yet (D22 suite starts Phase 2).
2. No audio yet (Phase 12 scope; D21 architecture ready).
3. Diagonal movement reuses cardinal animations; Mira is static (no walk anim needed yet).
4. Path autotiling covers edges only — no outer corners (visual roughness at bends).
5. Save conflicts: single-device assumption; multi-device merge arrives with sync (D19) later.

## Next phase
**Phase 2 — Coding**: Monaco Code Terminal overlay, JS sandbox worker (timeout/network/output caps), challenge runner with tests, game-code bridge verbs (`powerGate` etc.), first quest-scoped challenge wiring toward the §70 loop.
