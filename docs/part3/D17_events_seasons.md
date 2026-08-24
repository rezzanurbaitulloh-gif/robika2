# D17 — ROBika Event / Season Architecture

> Data-driven **events** (time-boxed world modifiers, boosts, banners) and future-ready **seasons** (progression pass skeleton). Nothing event-related is hard-coded; the live-content tables + content files drive behavior.

---

## 1. Events

### Model
`events` table rows: `{id, kind, config, starts_at, ends_at, active}` — kinds registry:

| Kind | Config shape | Effect application |
|---|---|---|
| `xp_boost` | `{pct, scopes:["combat","lessons"]}` | stat composition fn reads active events (D13 effects) |
| `credit_boost` | `{pct}` | wallet grant wrapper multiplies validated rewards |
| `world_modifier` | `{spawn_rate?, darkness?, enemy_tier?}` | scene bootstrap merges modifiers |
| `banner` | `{banner_id}` | gacha UI surfaces banner during window (D16) |
| `quest_chain` | `{quest_ids[]}` | quest availability window gate |

### Runtime
- Client fetches active events at session start + subscribes to realtime channel `events:active`.
- EventService (`game/systems` or lib) exposes `isActive(kind,id)` and derived multipliers; HUD shows small event chip with countdown.
- Server always recomputes multipliers at grant time — client display is cosmetic only.

## 2. Seasons

MVP ships schema + passive season 0:
- `seasons` row defines window + `pass_tiers` JSON (future battle-pass tiers: points → rewards).
- Player actions accrue `season_progress.points` via same reward pipeline (tagged).
- No paid track in MVP (future decision); architecture leaves `pass_tiers[].premium` flag ready.
- Season rollover job archives progress to history table (added then) and resets points.

## 3. Daily Missions (live content sibling)

- `daily_missions` content + per-day `missions_progress`; reset at local-midnight boundary computed server-side (UTC+7 baseline for ID market).
- Claim path uses standard reward RPC with mission validation — no client-trusted claims.
- HUD tracker widget lists today's missions with counters; completion pings inbox receipt too.

## 4. Authoring Flow

1. Designer edits `content/events/*.json` or inserts row via Studio (later phase).
2. Validation lint: window sane, kind registered, referenced ids exist.
3. Activation is data-only deploy (no code release) for pure config events; new *kinds* require engine update.

## 5. Offline

Active-event snapshot cached; countdowns show stale marker when offline; boost math still server-authoritative on sync apply.

## 6. Testing (feeds D22)

Unit: window overlap logic; multiplier stacking rules (cap at defined max).
Integration: mission claim double-submit rejected; expired event grants refused server-side.
E2E: seeded xp_boost event visibly increases XP gain in combat test scenario.
