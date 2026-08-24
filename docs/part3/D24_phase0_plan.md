# D24 — ROBika Phase 0 Implementation Plan

> Phase 0 = Foundation (PRD DEVELOPMENT ORDER): project · dependencies · architecture · env handling · Supabase · auth · database baseline · art bible · asset manifest · audio architecture.
> Exit gate: app boots on Vercel, login/register works against Supabase, migrations applied, no secrets in repo, vertical-slice groundwork ready for Phase 1. Payment/gacha stay feature-flagged OFF.

---

## 0. Preconditions

- Credentials: GitHub PAT (`ghp_…` for `rezzanurbaitulloh-gif/robika2.git`), Supabase access token (`sbp_…`, project ref `iqkhdxxbbjhgbxjviruu`), Vercel token (`vcp_…`, team z18, project `robika`).
- Local env truth: `/home/reja/ROBika/env` (never committed).
- Deliverables D01–D23 accepted as architecture baseline.

## 1. Repository & Scaffold

1. Clone `https://github.com/rezzanurbaitulloh-gif/robika2.git` → working copy; inspect existing contents first (per PRD rule: inspect repo + env references before assumptions). Preserve any existing history; create branch `phase-0-foundation`.
2. If empty/uninitialized: scaffold Next.js 14+ App Router TypeScript strict + Tailwind per D02 tree; else align existing structure to D02 and record deltas in phase report.
3. Add `.gitignore` (`.env*`, `/env`, node_modules, .next) and `.env.example` with NAMES ONLY from `/home/reja/ROBika/env`.
4. Tooling: ESLint + Prettier, Vitest, Playwright config shells, GitHub Actions CI per D22 §5 (lint→test→build→secret-scan).

## 2. Dependencies (initial, minimal)

`next react react-dom typescript tailwindcss postcss autoprefixer @supabase/supabase-js @supabase/ssr phaser monaco-editor zustand zod nanoid`
Dev: `vitest @playwright/test eslint eslint-config-next prettier supabase-cli (dev dep or global) server-only`
Pyodide/esbuild-wasm deferred to runtime-phase installs (lazy strategy documented in D07).

## 3. Env Handling

- `lib/config/env.ts`: zod-parsed env accessors; fail-fast on missing server vars in production build; `NEXT_PUBLIC_*` whitelist exported.
- Feature flags module: `PAYMENTS_ENABLED=false`, `GACHA_ENABLED=false`, `AI_ENABLED=true(local only)` defaults.
- Local dev uses `.env.local` copied from `/home/reja/ROBika/env`; Vercel envs set via CLI using provided token (server keys marked encrypted/hidden).

## 4. Supabase Baseline

1. Link project via access token (`supabase link --project-ref iqkhdxxbbjhgbxjviruu`).
2. Apply migrations `0001_profiles_character_saves_levels` (+ `0002_economy_core` optional this phase): tables, RLS policies per D03 §12 subset, seed `levels` XP curve rows.
3. Auth config: email confirmation ON (dev bypass seed user created via dashboard), redirect URLs allowlist = Vercel domains + localhost.
4. Storage buckets: `avatars` (private) created; policies placeholder.
5. Smoke RPC: `grant_rewards` function deployed with tests even though callers arrive in later phases (proves authority path early).

## 5. Auth Wiring (D04)

Middleware session refresh; `/account/login|register|setup` pages with world-styled shell; onboarding guard state machine; logout clears local caches. Acceptance test E2E-01 registered in suite.

## 6. Design System & Art Bible Kickoff

- `tailwind.config.ts` tokens from Art Bible palette (D20 §1); shared UI primitives in `components/shared` (Panel, PixelButton, states: loading/empty/error/offline/retry).
- `docs/art/art-bible.md` drafted + style-reference generation queued as FIRST PixelLab action of Phase 1 (not bulk now — PRD rule).
- `docs/art/asset-manifest.json` skeleton with loader util in `game/data`.

## 7. Audio Architecture Stub

AudioSystem class + buses + cues registry file (empty cue map acceptable), settings sliders persisted; unlock-on-gesture handled at Title route shell.

## 8. Game Shell Placeholder

`/game` route mounts Phaser BootScene showing title card + "Phase 1" marker — proves engine bundling, canvas scaling, React↔Phaser EventBus plumbing end-to-end without gameplay content.

## 9. CI/CD & Deploy

- GitHub: push branch → PR → merge to `main` after green checks.
- Vercel linked via token to repo (project `robika` already exists per OIDC evidence); env sync step documented; preview deployments on PRs.
- Supabase branch-per-preview deferred (cost); staging uses same project + separate schema? NO — keep single dev project until Phase 13 hardening.

## 10. Phase 0 Exit Checklist (gate to report)

- [ ] Repo cloned/scaffolded to D02 shape; branch merged
- [ ] CI green incl. secret-scan (no key material in git)
- [ ] Migrations applied; RLS verified by integration smoke test
- [ ] Register→login→setup→enter guarded `/game` shell works on Vercel preview
- [ ] `.env.example` matches real env names; flags default OFF for payments/gacha
- [ ] Art bible doc v0 + manifest skeleton + AudioSystem stub present
- [ ] Phase report filed: implemented / files changed / DB changes / tests added / results / known limitations / next phase (= Phase 1 playable game core)

## 11. Known Risks

Midtrans prod-vs-sandbox flag contradiction (D15 ⚠️) must be resolved by user before any paid flow; AI key pool health unknown until first proxy call; Pyodide bundle size deferred; single Supabase project means preview tests share data (mitigated by seeded test users + cleanup script).
