# Phase 0 Report — Foundation

> Per PRD contract (AFTER EACH PHASE): implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

1. **Repository**: cloned `rezzanurbaitulloh-gif/robika2.git` (greenfield), scaffolded Next.js 16 App Router + TypeScript strict + Tailwind per D02; branch `phase-0-foundation` merged to `main`.
2. **Dependencies** (D24 §2): supabase-js/ssr, phaser@3.90 (PRD stack — v4 rejected due to ESM/default-export drift), monaco-editor, zustand, zod, nanoid; dev: vitest/playwright/prettier/server-only.
3. **Env handling**: `.env.example` names-only; zod-parsed accessors (`lib/config/env.ts`); feature flags (`lib/config/flags.ts`) with PAYMENTS/GACHA off.
4. **Auth shell (D04)**: login / register / setup pages; `proxy.ts` session-refresh + route guards incl. onboarding gate on `/game`; `complete_onboarding` RPC.
5. **Database baseline (D03)**: profiles, character_state, saves(+revision), levels(XP curve seed), wallets, wallet_transactions(append-only ledger); handle_new_user trigger auto-creates profile+character+wallet; grant_rewards RPC (idempotent via idempotency_key); RLS everywhere.
6. **Game shell (D05 stub)**: `/game` mounts Phaser 3 BootScene through lazy-loaded GameCanvas + typed EventBus ("Phase 0 online" title card proves engine bundling + React bridge).
7. **CI**: GitHub Actions — typecheck → lint → secret-scan → build.
8. **Deployment**: Vercel project `robika` linked (pre-existing env vars verified for Production/Preview), production deployed and aliased.

## Files changed
31 files in commit `3a4785e` (+9302) — see repo. Key paths: `app/**`, `components/game-ui/GameCanvas.tsx`, `game/{EventBus.ts,scenes/BootScene.ts}`, `lib/{config,supabase}/**`, `proxy.ts`, `supabase/migrations/0001_foundation.sql`, `.github/workflows/ci.yml`, `docs/part3/D01–D24`.

## Database changes
Applied migration 0001 to project `iqkhdxxbbjhgbxjviruu`. Pre-existing stale schema from an earlier experiment (16 tables using `profile_id` naming) was dropped (`drop table … cascade`, public schema only) per greenfield mandate before re-applying. Auth config: `mailer_autoconfirm=true` for dev-loop signup→setup→game without email round-trip.

## Tests added / results
- Local build gate: `tsc --noEmit`, ESLint (0 errors/0 warnings), production build ✓ (8 routes).
- Secret scan pattern included in CI (service keys never in tracked code).
- Live smoke tests on production:
  - `/` 200 · `/account/login` 200 · `/account/register` 200
  - `/game` unauthenticated → 307 → `/account/login?next=%2Fgame` ✓ guard works
- Playwright suites are configured but full auth E2E runs land with Phase 1 (no headless browser wired in CI yet).

## Known limitations
1. ⚠️ `MIDTRANS_IS_PRODUCTION=true` contradicts its "sandbox" comment in the source env file — payments stay flag-disabled until user resolves this (D15).
2. Email confirmation disabled (dev convenience) — must re-enable before any public launch.
3. Stale auth.users rows (3 old test accounts) remain in Supabase; harmless, no profile rows.
4. Phaser pinned to 3.x deliberately; v4 changed export surface (documented in D01/D22 follow-ups).
5. CI has no Playwright browser install yet; gameplay suites arrive Phase 1+.

## Next phase
**Phase 1 — Playable game core**: Boot Valley hub map (Tiled), player entity + movement/camera/collision, first NPC + dialogue runner, interaction system, save/load loop; first PixelLab style anchors (art bible approval gate) per D05/D20.
