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

## Phase status

- [x] Phase 0 — Foundation (repo, scaffold, auth shell, DB baseline, CI)
- [x] Phase 1 — Playable game core (player, map, camera, NPC, dialogue, interaction)
- [x] Phase 2 — Coding (Monaco, sandbox, bridge, challenges)
- [x] Phase 3 — Quest (objectives, quest state, rewards)
- [x] Phase 4 — Combat (enemies, attack, damage, boss)
- [ ] Phase 5 — Academy (lessons, exercises, challenges, mastery)

Payments and gacha ship behind feature flags (`lib/config/flags.ts`) until verified.
