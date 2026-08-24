# D08 — ROBika Game-Code Bridge Architecture

> The contract that makes **coding visibly change the world** (PRD product rule). The bridge is the ONLY channel from sandboxed code to the running game. Verbs are declarative effects: sandbox records them, engine validates + replays them.

---

## 1. Design Principles

1. **Narrow surface** — a fixed, documented set of verbs; no access to Phaser objects, stores, network, or DOM.
2. **Record → Validate → Replay** — sandbox collects effect intents; runner checks them against challenge `on_success_effects`; scene performs them with juice (particles/sound).
3. **Deterministic** — same code + inputs ⇒ same verb sequence; enables server-side re-run parity for quest grading.
4. **Quota-guarded** — per-run call limits per verb to prevent spam/abuse.
5. **Versioned** — `bridge_version` in every run envelope; content declares minimum version so old challenges fail loudly after API changes.

## 2. Data Flow

```
Sandbox user code
  └─ calls bridge.<verb>(args)          [Worker context]
       └─ BridgeStub validates shape + quota → appends EffectIntent{verb,args,t}
Run completes (status=success)
  └─ RunResult.effects = EffectIntent[]
        │ postMessage to main thread
        ▼
BridgeHost (game/coding)
  ├─ filter: keep only verbs allowed by challenge spec (on_success_effects / free-play allowlist)
  ├─ replay each intent through VerbRegistry handler bound to current scene
  └─ emit EventBus 'world.changed' {verbs} → quest objective checkers listen
```

## 3. Verb Catalog (MVP)

| Verb | Args | World reaction |
|---|---|---|
| `powerGate` | `{gateId}` | gate sprite animates open, collision layer toggles, SFX |
| `activateTerminal` | `{terminalId}` | terminal screen flickers alive, lights region |
| `repairObject` | `{objectId}` | broken prop swaps to fixed state, dust particles |
| `movePlatform` | `{platformId, x?, y?}` | platform tweens to target; carries player |
| `spawnLight` | `{x,y,color}` | light radius appears (dungeon dark zones) |
| `setFlag` | `{flag,value}` | generic world flag consumed by quests/dialogue conditions |
| `say` | `{npcId,text}` | bubble over NPC (rate-limited, length-capped) |

Extension policy: new verbs ship as registry entries + docs entry + tests; challenges reference verb names only.

## 4. Free Play vs Graded Contexts

- **Graded (challenge inside quest)**: replay limited to declared effects; extra verbs ignored + flagged in telemetry (`code_run` analytics §64).
- **Free play (CodeLab "Playground" mode)**: broader allowlist on a sandbox map instance; still no economy/progression side effects — playground cannot grant items/XP (server-authoritative rule).

## 5. Failure Semantics

- Unknown verb / bad args ⇒ run status stays success but replay logs warning card "effect skipped" (teaches API discipline without failing silent code).
- Engine-side validation failure (e.g., target id not in scene) ⇒ skip + hint chip pointing at interactable name.
- Bridge version mismatch ⇒ friendly modal "This world speaks bridge v{n}" with reload action.

## 6. Implementation Notes

- Types shared via `lib/coding/bridge-types.ts` imported by both worker stub and game host (single source of truth).
- Worker stub is plain JS string template injected into worker blob — must never import engine modules (enforced by test scanning worker source).
- Effects carry `t` offsets so replays can be sequenced cinematically rather than instant.

## 7. Testing (feeds D22)

Unit: stub arg validation; quota counters; version gating.
Gameplay: each MVP verb has a headless scene spec asserting observable world delta (collision mask flip, sprite frame, tween completion).
Integration: server re-run produces identical EffectIntent list for golden solutions.
E2E: §70 step 11 — after successful run, player walks through opened gate.
