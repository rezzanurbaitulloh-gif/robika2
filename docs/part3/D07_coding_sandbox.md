# D07 — ROBika Coding Sandbox Architecture

> User code runs in the browser, isolated from the game engine and page. The sandbox exposes ONLY a controlled API surface (the bridge, D08). It never grants rewards directly; results are events.

---

## 1. Components

```
Monaco Editor (React shell)
   │  getValue / language id / diagnostics
   ▼
ChallengeRunner (lib/coding)
   ├─ RuntimeRegistry.resolve(language) → adapter
   ├─ builds program = [prelude, user_code, test_harness]
   └─ posts to SandboxWorker with resource limits + timeout
        ▼
SandboxWorker (Web Worker per run; Pyodide-in-Worker for Python)
   ├─ no DOM access · no network (fetch/XHR stubbed to throw) · no dynamic import of app code
   ├─ bridge object injected = narrow verb API (D08 §3) with quota counter
   └─ structured-clone result envelope only
        ▼
RunResult { status: success|error|timeout, logs[], tests[], effects[] , durationMs }
```

## 2. Resource Controls (§63 checklist)

| Control | JS/TS implementation | Python (Pyodide/WASM) |
|---|---|---|
| Timeout | `setTimeout` kill + worker terminate (default 5s, challenge-tunable ≤10s) | same wall-clock guard around `runPythonAsync` |
| Memory | heuristic loop/output caps; worker recycle per run | WASM linear memory cap where supported; recycle |
| CPU | single worker, cooperative yields via harness checkpoints | same |
| Network | `fetch`/`WebSocket`/`XHR` replaced with throwing stubs | `pyodide` fetch disabled; `micropip` disabled |
| Filesystem | virtual FS empty; FS APIs absent | Emscripten MEMFS sandboxed, no host paths |
| Output limit | console capture ring buffer (e.g. 200 lines / 32KB), truncation flag | stdout/stderr capture with same cap |
| Process isolation | fresh Worker per run; hard `terminate()` on violation | fresh Pyodide instance pool, recycled on violation |
| Allowed API surface | whitelist: `console`, challenge-provided helpers, `bridge` verbs, safe Math/String/Array | stdlib subset minus `os`/`subprocess`/`socket` |

Violation policy: any forbidden-API access or timeout ⇒ `status=error(reason)` surfaced as friendly pixel-styled error card; two violations trigger cooldown hint (not punishment).

## 3. Challenge Test Harness

```jsonc
// content/challenges/ch_js_loop_gate.json
{
  "id": "ch_js_loop_gate",
  "language": "javascript",
  "starter": "function fixGate(gate) {\n  // your code\n}",
  "solution_visible": false,
  "tests": [
    { "name": "opens after 3 pulses", "call": "fixGate", "expect": {"effect":"gate.open","pulses":3} },
    { "name": "rejects negative pulses", "throws": true }
  ],
  "hints": ["hint1_key","hint2_key","hint3_key"],   // progressive, never auto-solution (D11)
  "sandbox": { "timeout_ms": 5000, "max_log_lines": 100 },
  "on_success_effects": ["bridge.powerGate"]         // verbs replayed in-world
}
```

Runner semantics:
1. Tests execute inside sandbox against user function.
2. Effects are *recorded*, not executed, by sandbox; scene replays them post-validation ("see world react").
3. Server mirror for graded quests: challenge completion posted to RPC which re-runs deterministic tests server-side (Node VM with identical limits) before counting progress — client success alone is not authoritative for quest objectives.

## 4. Runtime Adapters (`RuntimeRegistry`)

| Adapter id | Tech | Notes |
|---|---|---|
| `javascript` | native, strict-mode module wrapper | MVP default (§69) |
| `typescript` | in-worker transpile (esbuild-wasm) → js path | phase P5+ |
| `python` | Pyodide (WASM) lazy-loaded on demand | phase P5+; heavy asset cached via SW |

Registry is data-driven — adding a language adds an adapter entry, not platform surgery (PRD rule: don't hard-code around a small fixed language list).

## 5. UX Contract (Code Terminal overlay)

- Opens from world terminal interactable; layout: editor left, output/console right; mobile landscape stacks vertically.
- States per §67: loading runtime / ready / running (spinner + cancel) / success (world reaction plays behind panel) / error (first failing test + hint button) / offline note.
- Buttons: Run (Ctrl/Cmd+Enter), Reset to starter, Hints (progressive), Close (confirm when dirty).
- Code drafts autosave locally per challenge (IndexedDB) and sync when online (D19 scope: drafts are device-local first).

## 6. Security Notes (feeds D23)

- Worker built from blob with CSP `worker-src 'self' blob:`; no `eval` outside worker context; Monaco uses its own web workers for language services.
- No secrets, no Supabase client, no wallet state reachable from sandbox scope.
- Bridge verbs rate-limited per run (quota map) to prevent effect spam.

## 7. Testing Matrix (feeds D22)

Unit: adapter resolution; harness expectation matching; log truncation.
Integration: server-side re-run parity for a golden set of challenges.
Sandbox security suite (must all fail-closed): network access, infinite loop timeout, memory bomb, prototype-pollution attempt on bridge, import of app modules, oversized output.
E2E: §70 steps 9–11 (open terminal → write → run → world reacts).
