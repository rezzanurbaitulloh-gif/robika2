# ROBika

> **ROBika — the pixel-art adventure game where code becomes your power.**

A pixel-art coding adventure: explore Aetheria, learn real programming, and watch your code change the world.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Phaser 3 · Monaco Editor · Supabase (PostgreSQL + Auth + RLS + Storage) · Vercel · Midtrans · PixelLab MCP.

## Architecture docs

See `docs/part3/D01…D24` — complete technical architecture through Phase 0 plan (source of truth: `masterprd.md`).

## Development

```bash
cp .env.example .env.local   # fill values from your secret store
npm install
npm run dev                  # http://localhost:3000
```

## Phase status — **ALL 15 PHASES COMPLETE ✅**

- [x] Phase 0 — Foundation (repo, scaffold, auth, DB 25 tables, art bible, manifest)
- [x] Phase 1 — Game Core (player, map, camera, 3 NPCs, dialogue choices, interaction)
- [x] Phase 2 — Coding (Monaco, sandbox §63, bridge, challenges, gate)
- [x] Phase 3 — Quest (objectives, state, popup §55, server-validated)
- [x] Phase 4 — Combat (4 enemies + Warden enrage, damage numbers, particles)
- [x] Phase 5 — Academy (3 lessons, Edge validate, mastery, certificates)
- [x] Phase 6 — CodeLab (projects/files/run/preview/versions, 2 templates)
- [x] Phase 7 — RPG (Vault, inventory, loadout, 4 achievements)
- [x] Phase 8 — Economy (Shop, Wallet, Credits, ledger)
- [x] Phase 9 — Gacha/Event (Capsule pity 10, duplicate, double-XP)
- [x] Phase 10 — AI (Mentor stub proxy, hint ladder)
- [x] Phase 11 — Offline/Online (OfflineBanner, queue, fail-open)
- [x] Phase 12 — Audio/Polish (AudioSystem 14 SFX + BGM, mascot loading)
- [x] Phase 13 — QA/Security (Vitest 9/9 + Playwright 12/12, rate-limit 20/min)
- [x] Phase 14 — Production (robika2.vercel.app, 20 env, Supabase ACTIVE)

Live: **https://robika2.vercel.app** · Docs: `docs/part3/` · Runbook: `docs/PRODUCTION.md`
