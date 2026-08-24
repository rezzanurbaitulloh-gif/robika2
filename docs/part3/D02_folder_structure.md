# D02 — ROBika Complete Folder Structure

> Inherits D01 rules: modular layers, data-driven content, no hard-coded content in React/Phaser scenes.
> Root package name: `robika`. Framework: Next.js App Router + TypeScript (strict).

```
robika/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # root shell, fonts, theme provider, audio init guard
│   ├── page.tsx                      # Launch / Title entry (§68 onboarding start)
│   ├── game/
│   │   ├── layout.tsx                # full-screen canvas host; blocks scroll; landscape prompt
│   │   └── page.tsx                  # mounts Phaser GameCanvas + React HUD bridge
│   ├── academy/
│   │   ├── page.tsx                  # course catalog (world-styled, not dashboard)
│   │   └── [courseSlug]/
│   │       ├── page.tsx              # chapter list
│   │       └── [chapterSlug]/
│   │           └── [lessonSlug]/page.tsx   # lesson player + exercises
│   ├── codelab/
│   │   ├── page.tsx                  # project browser
│   │   ├── new/page.tsx
│   │   └── [projectId]/page.tsx      # editor · run · output · preview · history
│   ├── studio/page.tsx               # content authoring (quests/dialogue/worlds) [later phase]
│   ├── mentor/page.tsx               # AI Mentor surface (Learning Coach)
│   ├── shop/page.tsx                 # Credits/Gems shop + top-ups
│   ├── vault/page.tsx                # permanent collection: skins/equipment/companions/modules
│   ├── profile/page.tsx              # XP, level, achievements, certificates, stats
│   ├── account/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── setup/page.tsx            # account setup → character setup (§68)
│   └── settings/page.tsx             # audio/display/language/data controls (§59)
│   └── api/                          # SERVER-ONLY routes (no secrets to client)
│       ├── payments/
│       │   ├── create-order/route.ts        # Midtrans Snap token via PaymentService
│       │   └── webhook/route.ts             # idempotent notification handler
│       ├── ai/
│       │   ├── tutor/route.ts
│       │   ├── debugger/route.ts
│       │   ├── mentor/route.ts
│       │   └── bot1/route.ts
│       ├── sync/apply/route.ts               # offline outbox drain + conflict resolution
│       └── health/route.ts
├── components/                       # React UI only — no game logic
│   ├── game-ui/                      # HUD, dialogue box, quest tracker, code terminal shell,
│   │                                 # inventory panel, vault grid, combat bar, minimap,
│   │                                 # notifications, loading screens, popups (§54–56)
│   ├── account/                      # auth forms, profile editor, character creator
│   ├── academy/                      # lesson renderer, exercise runner, mastery meter
│   ├── codelab/                      # file tree, tabs, run console, preview frame
│   ├── economy/                      # wallet widget, shop cards, top-up flow, purchase history
│   ├── vault/                        # collection grids, equip flows, loadout editor
│   ├── mentor/                       # chat surfaces, context badges
│   └── shared/                       # buttons, panels, modals, error/offline/retry states,
│                                     # responsive helpers, art-token primitives
├── game/                             # Phaser engine domain — no React imports inside scenes
│   ├── scenes/                       # BootScene · TitleScene · HubScene · DungeonScene(s) ·
│   │                                 # BaseScene · UIScene overlay hooks
│   ├── entities/                     # Player · NPC · Enemy · Boss · Projectile · Pickup
│   ├── systems/                      # MovementSystem · CameraSystem · CollisionSystem ·
│   │                                 # InteractionSystem · CombatSystem · SaveSystem ·
│   │                                 # TimeSystem · SpawnSystem
│   ├── quests/                       # QuestEngine, objective checkers, reward dispatch
│   ├── combat/                       # damage model, hitboxes, status effects, boss patterns
│   ├── dialogue/                     # dialogue runner, typewriter, choice handling
│   ├── coding/                       # in-world Code Terminal trigger, bridge client
│   ├── audio/                        # AudioSystem: BGM/SFX buses, cues registry playback
│   ├── effects/                      # particles, screen shake, transitions
│   ├── data/                         # loaders for content JSON into typed registries
│   └── EventBus.ts                   # typed pub/sub (§74 event names)
├── lib/                              # framework-agnostic shared logic
│   ├── supabase/                     # browser client (anon), server client (service role),
│   │                                 # realtime channels, storage helpers
│   ├── auth/                         # session guards, onboarding state machine
│   ├── payments/                     # PaymentService interface + MidtransAdapter
│   ├── midtrans/                     # snap api client, signature verification utils
│   ├── coding/                       # RuntimeRegistry, adapters (js/ts/pyodide), test runner
│   ├── ai/                           # provider router over key pools, prompts, guards,
│   │                                 # usage metering client
│   ├── economy/                      # wallet types, ledger helpers (client-safe reads)
│   ├── offline/                      # IndexedDB store, outbox queue, cache policies
│   ├── sync/                         # conflict resolver, lamport clock, apply pipeline
│   ├── analytics/                    # §64 event emitter wrapper
│   └── config/                       # env parsing (zod), feature flags, constants
├── content/                          # DATA-DRIVEN DEFINITIONS (§73) — versioned JSON/TS
│   ├── academy/                      # courses → chapters → lessons → examples/exercises
│   ├── quests/                       # quest defs, objectives, rewards, prerequisites
│   ├── dialogue/                     # npc dialogues, branches, conditions
│   ├── worlds/                       # regions, maps metadata, spawn points, interactables
│   ├── challenges/                   # coding challenges: starter code, tests, hints, APIs
│   ├── items/                        # items, equipment, companions
│   ├── skins/                        # skin defs + rarity + acquisition sources
│   ├── events/                       # live events, schedules, modifiers
│   └── gacha/                        # banners, odds tables, pity rules, duplicate conversions
├── public/
│   ├── assets/                       # generated PixelLab sprites/tiles/UI (manifest-driven)
│   ├── audio/                        # bgm/, sfx/, voice/
│   ├── fonts/                        # pixel font files
│   └── maps/                         # Tiled JSON maps referenced by worlds content
├── supabase/
│   ├── migrations/                   # ordered SQL: domains per §60 (MASTERY, CODELAB,
│   │                                 # ECONOMY, GACHA, LIVE CONTENT, AI, CERTIFICATES)
│   ├── seed/                         # dev seed users/items/banners (non-prod)
│   └── functions/                    # edge functions: grant_xp_credits, gacha_pull,
│                                     # finalize_payment, apply_sync_batch, issue_certificate
├── tests/
│   ├── unit/                         # pure logic (economy math, pity calc, sync resolver)
│   ├── integration/                  # API routes + Supabase RPCs against local stack
│   ├── gameplay/                     # headless Phaser specs: movement/collision/dialogue/
│   │                                 # quest/combat/rewards/inventory/vault/equip/save-load
│   ├── coding-runner/                # sandbox timeout/memory/network isolation suites
│   ├── payment/                      # midtrans webhook idempotency, signature checks
│   ├── e2e/                          # Playwright: §70 21-step vertical slice, responsive set
│   └── fixtures/                     # deterministic content snapshots
├── docs/                             # D01–D24 deliverables mirror (source at repo /docs/part3)
├── .env.example                      # NAMES ONLY — mirrors /home/reja/ROBika/env keys, no values
├── .gitignore                        # includes .env*, /env, service keys, build outputs
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Boundary Rules

1. `app/api/**` and `lib/midtrans`, `lib/supabase/server` import `SUPABASE_SERVICE_ROLE_KEY`/`MIDTRANS_SERVER_KEY` only — never bundled to client (enforced by route handlers + `server-only` package).
2. `game/**` never imports from `components/**`; communication is Event Bus + typed stores.
3. `content/**` is the single source of gameplay/content data; `game/data` compiles it into registries consumed by scenes; Academy/CodeLab read their own slices.
4. `public/assets` contents are listed in an asset manifest (`docs/art/asset-manifest.json`) produced by the PixelLab pipeline (D20) so scenes never hard-code filenames.
5. `supabase/functions` are the ONLY writers of Gems/Credits/XP/gacha results (Rule: server-authoritative).
6. Tests mirror module boundaries; every Phase gate runs its slice before reporting (PRD "AFTER EACH PHASE").
