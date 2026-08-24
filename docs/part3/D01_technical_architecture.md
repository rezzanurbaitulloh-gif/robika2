# D01 — ROBika Complete Technical Architecture

> Source of truth: `/home/reja/ROBika/masterprd.md` (`ROBika_COMPLETE_MASTER_CONCEPT_PRD_BLUEPRINT_v2.md`, PART II command).
> Status: Baseline deliverable (item 1 of 24). All other D-docs refine and must not contradict this document.

---

## 1. Product Identity

ROBika is a **pixel-art coding adventure game** where programming is the core mechanic — not a dashboard with game decoration.

Player loop:
`EXPLORES → DISCOVERS → LEARNS → CODES → RUNS → CHANGES THE WORLD → COMPLETES QUESTS → FIGHTS → EARNS REWARDS → PROGRESSES`

Prime directive: **real game first, educational ecosystem second.**

---

## 2. Non-Negotiable Architectural Rules (from PRD)

1. **Modular layers** — keep separate: game engine, application UI, coding engine, backend, database, AI, payment, economy, audio, asset pipeline, offline storage, synchronization.
2. **Server-authoritative**: economy (Gems/Credits grants), gacha RNG/pity/duplicates, ownership, XP/rewards validation. Never trust client values.
3. **Data-driven content**: regions, NPCs, dialogue, quests, enemies, items, skins, equipment, challenges, lessons, events, banners live in `content/` definitions — never hard-coded in React or Phaser scenes.
4. **Event bus decoupling**: systems communicate through named events (`quest.completed`, `enemy.defeated`, `coding.success`, `player.levelup`, `payment.completed`, `gacha.pulled`, …).
5. **State slicing**: PlayerState / WorldState / QuestState / CombatState / DialogueState / CodingState / InventoryState / VaultState / LoadoutState / AcademyState / EconomyState / AccountState / NetworkState / AudioState / UIState — no giant global object.
6. **Sandboxed user code** with timeout, memory, CPU, network/filesystem restriction, output limit, process isolation, controlled API surface.
7. **Payments behind PaymentService**, idempotent webhooks, Gems granted exactly once, never on client-side success alone.
8. **Offline mode stays useful** (game, cached lessons, local CodeLab, local saves); AI/cloud sync/payments/community disabled or limited offline; local queue + conflict-aware sync on reconnect.
9. **No generic SaaS dashboard aesthetic**; world, NPCs, terminals, maps define visual identity. No bulk placeholder assets that establish wrong visual language; art bible before large-scale generation.
10. **Do not hard-code the platform around a small fixed language list** — runtimes are pluggable adapters.
11. Do not randomly redesign the product. Report after each phase: implemented, files changed, DB changes, tests added, test results, known limitations, next phase.

---

## 3. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | One codebase for game routes, Academy, CodeLab, Studio, shop, account; SSR-safe shell around a client-heavy game |
| Game engine | Phaser 3 | Battle-tested 2D pixel engine, scene system, arcade physics, tilemap support |
| Styling | Tailwind CSS | Fast consistent HUD/UI theming aligned to art bible tokens |
| Editor | Monaco Editor | In-game Code Terminal + CodeLab editing surface |
| Backend/BaaS | Supabase (PostgreSQL + Auth + RLS + Storage + Realtime) | Auth, row-level security, storage for saves/assets, realtime inbox/events |
| Hosting | Vercel | Next.js-native deploys, env management, preview builds |
| Payments | Midtrans via server-side adapter | Indonesian market standard; Snap flow behind PaymentService |
| Code runtimes | Modular runtime adapters; JS/TS native in browser; Python via Pyodide/WASM | Pluggable languages; no fixed small language list |
| Asset generation | PixelLab MCP | Characters, NPCs, enemies, bosses, tiles, maps, objects, portraits, UI assets, animations, effects — one coherent style |
| AI providers | Server-side proxy over configured provider keys (Gemini primary free tier; HC/Mistral/OmniRoute/Router9 pools) | Contextual Tutor/Debugger/Mentor/BOT-1/Quest AI/Learning Coach |

Target platforms: **Desktop + Mobile Landscape** (responsive test targets §58). Modes: **Online + Offline**.

---

## 4. Layered Architecture

```
┌────────────────────────────── Browser (client) ──────────────────────────────┐
│                                                                              │
│  App Shell (Next.js routes)                                                  │
│   /game /academy /codelab /studio /mentor /shop /vault /profile /account     │
│                                                                              │
│  Application UI (React + Tailwind)                                           │
│    HUD · popups · loading · settings · mobile landscape controls             │
│                                                                              │
│  ┌─ Game Engine (Phaser) ─────────────────────────────────────────────────┐  │
│  │  Scenes: Boot · Title · World(Hub/Dungeon) · Base · UI overlay        │  │
│  │  Entities: player · NPC · enemy · boss · pickups                      │  │
│  │  Systems: movement · camera · collision · interaction · combat ·      │  │
│  │           dialogue · quest · audio (BGM/SFX) · effects                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                    ▲ Event Bus ▼                                             │
│  State Slices (zustand-style stores, one per domain — see Rule 5)            │
│                    ▲                                                         │
│  ┌─ Coding Engine ──────────────┐   ┌─ Offline Layer ────────────────────┐   │
│  │ Monaco terminal              │   │ IndexedDB/localStorage saves       │   │
│  │ Runtime adapters (JS/TS/Py)  │   │ Cached lessons/content             │   │
│  │ Sandbox worker (isolated)    │   │ Local CodeLab projects             │   │
│  │ Controlled Game APIs bridge  │   │ Outbox queue (mutations)           │   │
│  │ Run results/errors/hints     │   │ Conflict-aware sync engine         │   │
│  └──────────────────────────────┘   └────────────────────────────────────┘   │
│                                                                              │
│  lib/ clients: supabase-js (anon) · analytics · audio loader                 │
└──────────────────────────────────────────────────────────────────────────────┘
                 │ HTTPS (REST/RPC/Realtime/Storage)          │ never exposes
                 ▼                                            ▼ service-role keys
┌────────────────────────── Supabase (server-authoritative) ───────────────────┐
│ PostgreSQL: MASTERY · CODELAB · ECONOMY · GACHA · LIVE CONTENT · AI · CERTS  │
│ Row Level Security on every player-owned table                               │
│ RPC/Edge Functions: grant XP/Credits/Gems, gacha pull, purchase finalize,    │
│                     sync apply, certificate issue                            │
│ Storage: avatars/saves/screenshots buckets                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                 │                              │
                 ▼                              ▼
┌──────── Next.js API routes / Edge (server-only) ─────────────────────────────┐
│ PaymentService (Midtrans createOrder/getStatus/handleNotification/verify)    │
│ AIProxy (Tutor/Debugger/Mentor/BOT-1; usage metering ai_usage/ai_sessions)   │
│ Economy guards · Gacha RNG+pity · Sync conflict resolver helpers             │
└──────────────────────────────────────────────────────────────────────────────┘
                 │                              │
                 ▼                              ▼
          Midtrans (Snap)                AI provider APIs
```

---

## 5. Module Responsibilities

| Module | Owns | Must not |
|---|---|---|
| Game engine (`game/`) | scenes, entities, systems, quests, combat, dialogue, audio, effects, data loading | business rules for money/XP; direct DB writes |
| App UI (`components/`) | HUD, menus, panels, forms, responsive layout | game logic; reading secrets |
| Coding engine (`lib/coding` + workers) | editor, runtime adapters, sandbox, challenge tests, result mapping | granting rewards directly |
| Game-code bridge | controlled APIs exposed to sandboxed code (world mutation verbs) | exposing raw engine internals |
| Backend (`app/api`, Supabase RPCs) | auth flows, payments, AI proxy, authoritative mutations | trusting client payloads |
| Database | persistence domains (§60), indexes, RLS | holding business logic outside functions |
| AI layer (`lib/ai`) | contextual prompts, session logging, rate limiting | auto-revealing challenge solutions |
| Payment layer (`lib/payments`) | order lifecycle, idempotency ledger | granting Gems outside verified webhook path |
| Economy | wallets, ledgers, shop, top-ups | client-side balance math |
| Audio (`game/audio`) | BGM/SFX/dialogue/UI/environment playback | blocking game loop on load |
| Asset pipeline (PixelLab MCP) | art bible adherence, manifest, batch generation | shipping without style refs |
| Offline storage | saves cache, content cache, outbox | silent conflict overwrite |
| Synchronization | queue drain, conflict resolution, `sync.completed` event | online-only assumptions in core loop |

---

## 6. Key Data Flows

### 6.1 Vertical slice loop (§70 acceptance)
Boot → auth → enter world → move → NPC dialogue → quest accept → explore → problem → Code Terminal → write/run code (sandbox) → bridge mutates world → combat → quest complete → XP/Credits/item grant (server RPC) → Vault inspect → equip → return base → save (local+remote) → reload → continue.

### 6.2 Payment (§61, §62)
frontend requests order → server PaymentService creates Midtrans transaction → user pays → Midtrans webhook → server verifies signature+status → updates `payment_orders`/`wallet_transactions` exactly once (idempotency key = notification id/order id) → grant Gems via single RPC → ledger row → client refreshes wallet on `payment.completed`.

### 6.3 Gacha (§35, §62)
client requests pull → server reads banner odds + pity counters → RNG resolved server-side → duplicate→conversion rule applied → rewards + history persisted atomically → pity updated → response returns result; probabilities displayed pre-purchase with confirmation gate.

### 6.4 Offline → Online sync (§66, P11)
mutations append to local outbox with monotonic lamport clock + device id → reconnect drains queue via `/api/sync/apply` → conflicts resolved by explicit policy table (last-write-wins per field group, merges for inventories) → `sync.completed` event refreshes state.

### 6.5 AI request
client sends context bundle (lesson/challenge ids, redacted code, error) → AIProxy validates quota + entitlement → logs `ai_usage` → calls provider → returns guidance; solution-reveal guard applies prompt+post filters.

---

## 7. Environment Configuration Inventory (verified against `/home/reja/ROBika/env`)

Server-side only (never `NEXT_PUBLIC_`, never committed):
`SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `GEMINI_API_KEY`,
`ROBIKA_KEY_HC_1..5`, `ROBIKA_KEY_MISTRAL_1..6`, `ROBIKA_KEY_OMNIROUTE`, `ROBIKA_KEY_ROUTER9`.

Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.

Operational flags: `MIDTRANS_IS_PRODUCTION=true` (⚠️ env comment says "sandbox untuk percobaan" while flag says production — resolve before enabling paid flows; default Phase 0 keeps payment feature-flagged off).

Vercel: OIDC token present for project `robika` (team z18). GitHub repo: `rezzanurbaitulloh-gif/robika2.git`.

Rule: the `env` file itself must never be committed ("JANGAN pernah commit file ini"); `.env.local` pattern used locally, values mirrored into Vercel/Supabase dashboards.

---

## 8. Cross-Cutting Concerns

- **Error-state contract (§67)**: every screen implements loading / success / empty / error / offline / retry.
- **Analytics (§64)**: lesson_started/completed, code_run, purchase_created/completed, gacha_pull, level_up; no unnecessary personal data.
- **Inbox & notifications (§66)**: reward/system inbox tables + contextual in-game notifications via event bus.
- **Testing (§76)**: automated (unit/integration/API/db/auth/coding-runner/payment/wallet-ledger/gacha/sync) + gameplay suites + responsive (desktop/laptop/mobile-landscape) + modes (online/offline/reconnect).
- **Definition of Done (§77)**: implemented, integrated, tested, responsive, secure, error-handled, visually consistent, online/offline defined, persistence verified, loading-empty-error states present, no secrets exposed.

---

## 9. Document Map (PART III deliverables 2–24)

D02 folder structure · D03 database ERD/schema · D04 authentication · D05 game scenes · D06 quest architecture · D07 coding sandbox · D08 game-code bridge · D09 academy content model · D10 CodeLab · D11 AI architecture · D12 inventory/Vault/loadout · D13 skin/equipment/attributes · D14 economy/wallet · D15 Midtrans payments · D16 gacha/pity · D17 events/seasons · D18 inbox/notifications · D19 offline/online sync · D20 PixelLab asset pipeline · D21 audio pipeline · D22 testing strategy · D23 security model · D24 Phase 0 implementation plan.

Each D-doc inherits Section 2 rules; contradictions are resolved in favor of `masterprd.md`.
