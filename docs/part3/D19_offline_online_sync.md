# D19 — ROBika Offline / Online Synchronization Architecture

> Offline mode stays **useful** (game, cached lessons, supported runtimes, local CodeLab, local saves); AI/cloud sync/payments/community are disabled or limited. Reconnect drains a local queue through **conflict-aware synchronization** — never silent overwrite.

---

## 1. Capability Matrix

| Feature | Online | Offline | On reconnect |
|---|---|---|---|
| Play world / combat / quests | ✓ | ✓ (local authority, provisional) | progress intents validated+applied server-side |
| Saves | dual-write (local immediate, remote debounced 10s) | local only | revision-based merge |
| Academy lessons | full | cached-open lessons; JS exercises runnable | mastery events flushed |
| CodeLab projects | cloud-backed | full local edit/run (JS) | file-level merge |
| Shop / Gacha / Payments | ✓ | locked with explanation chip | — |
| AI agents | ✓ | disabled ("BOT-1 recharging") | — |
| Inbox | realtime + poll | cached read-only; claims queued | claim replay |

## 2. Local Foundation

- **IndexedDB** stores: `saves`, `content_cache` (worlds/lessons/quests JSON + manifest hash), `codelab.projects`, `outbox`.
- Every mutation that would hit the server goes through **Outbox** envelope:
```jsonc
{ "op_id":"uuid", "lamport":42, "device_id":"dvc_a1", "entity":"quest_turn_in",
  "payload":{...}, "created_at":"...", "status":"pending|applied|conflict|rejected" }
```
- Lamport counter increments per local mutation and merges max(local,remote)+1 on fetch.

## 3. Sync Pipeline (`POST /api/sync/apply`)

```
drain batch (≤50 ops, ordered by lamport)
   per op → route to authoritative RPC/handler
     success            ⇒ status=applied, return canonical row
     version conflict    ⇒ CONFLICT RESOLUTION POLICY (below)
     validation reject   ⇒ status=rejected + reason (user-visible digest)
server returns updated entity snapshots + new lamport watermark
client applies snapshots to stores → EventBus 'sync.completed'
```

### Conflict policy table
| Entity | Policy |
|---|---|
| saves.position/state | field-groups: position=latest-wins; quest flags=union; inventory deltas=additive |
| codelab files | per-file last-write-wins by lamport; conflicting versions kept as auto-version snapshot |
| profile settings | key-level LWW |
| wallet/economy | never conflicts locally (spend locked offline) — rejected ops surface notice |

Conflicts never silently drop user work: losers land in inbox/system note or version history.

## 4. Connectivity Handling

- Network monitor (navigator online + heartbeat ping) flips NetworkState store.
- UI chrome shows offline pixel-badge; actions that require network show disabled-with-reason states (§67).
- Reconnect sequence: refresh auth token → push outbox → pull delta (updated_at > watermark per entity class) → content manifest check → `sync.completed`.

## 5. Content Caching & Versioning

- Manifest (`content-manifest.json` w/ hashes) fetched when online; changed bundles downloaded in background.
- Stale cache still runs game but flags "content update available".
- Service worker caches app shell + public assets for repeat offline launches.

## 6. Anti-Cheat Considerations

Server treats offline-derived intents as *claims*: validates against canonical content (quest exists? objectives plausible? timestamps sane?) and plausibility bounds before granting. Suspicious patterns (impossible velocity, repeated turn-ins) → rejected + audit flag, not silent acceptance.

## 7. Testing (feeds D22)

Unit: lamport merge; policy functions per entity; batch chunking.
Integration: kill-network mid-play scenario suite (Playwright context offline): play→quest→reconnect→verify single grant.
Chaos: duplicate op replays idempotent; clock skew tolerated via lamports not wall-time.
E2E matrix rows for §76 modes: online/offline/reconnect/sync.
