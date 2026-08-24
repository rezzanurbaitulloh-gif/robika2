# D11 — ROBika AI Architecture

> AI is **contextual and pedagogical**: Tutor, Debugger, Mentor, BOT-1 (in-world NPC companion), Quest AI flavor, Learning Coach. Hard rule: **AI must not automatically reveal challenge solutions** — it guides, hints, and asks questions.

---

## 1. Agents

| Agent | Surface | Context bundle | Guard level |
|---|---|---|---|
| Tutor | Academy lesson sidebar | course/chapter/lesson ids, current block, user's last exercise attempt (code + failing test), mastery slice | strict hint ladder |
| Debugger | Code Terminal / CodeLab error card | error text, relevant code frame, test name | explain-then-nudge; never emits passing solution |
| Mentor (`/mentor`) | chat hub across activities | recent quests, mastery map, streaks, goals | open coaching |
| BOT-1 | in-world NPC dialogue | scene id, active quest, nearby interactables | scripted persona; short answers; can trigger bridge `say`/hints |
| Quest AI | dialogue flavor generation (authoring-time mostly) | quest content | content pipeline only, no runtime authority |
| Learning Coach | profile/plan view | progress history, calendar cadence | suggestions only |

## 2. Server Proxy (only path to providers)

```
client → POST /api/ai/{agent}
   ├─ auth check (session) · quota check (ai_usage window) · entitlement check
   ├─ build system prompt per agent (persona + guardrails) from lib/ai/prompts
   ├─ attach redacted context bundle (ids + code frames; NEVER secrets/wallet data)
   ├─ provider router: primary Gemini free tier → fallback pools
   │    HC_1..5 → MISTRAL_1..6 → OMNIROUTE → ROUTER9   (round-robin within pool)
   ├─ response post-filter: solution-leak heuristics (diff-similarity vs golden solution,
   │    forbidden patterns like full corrected function when challenge graded)
   └─ write ai_usage row (+ ai_session lifecycle) → return guidance JSON
```

Provider keys live ONLY in server env (verified present in `/home/reja/ROBika/env`: GEMINI_API_KEY, ROBIKA_KEY_HC_1..5, ROBIKA_KEY_MISTRAL_1..6, OMNIROUTE, ROUTER9). Client never sees provider identity.

## 3. Anti-Solution Guardrails

1. Prompt-level: agent instructed to give conceptual hints, ask Socratic questions, cap code snippets at ≤5 lines of scaffolding for graded contexts.
2. Post-filter: compare model output against stored golden solutions (token/Jaccard similarity threshold) → if too-close, degrade to next hint level.
3. Hint ladder: challenges define ordered `hints[]`; AI may only reference up to the highest unlocked hint tier.
4. Free contexts (Mentor general chat about concepts, non-graded playground) allow fuller explanations — grading boundary is the switch.
5. Audit: sampled human review queue of flagged responses (Phase 13 QA hook).

## 4. Quotas & Cost Control

- Per-user daily message caps by agent (config in `lib/config`): Tutor 40 / Debugger 30 / Mentor 20 / Coach 10 (tunable).
- Token budget logged per request (`ai_usage.tokens_in/out`) with provider tag for pool health dashboards.
- Circuit breaker: repeated provider failures auto-skip to next pool; all-down state returns friendly "BOT-1 is recharging" card — game remains fully playable without AI (offline rule parity).

## 5. Offline Behavior

AI features are **disabled offline** (§2648 matrix). UI shows locked state with explanation; cached lesson hints remain available since they're static content.

## 6. Data & Privacy

- Context bundles contain ids + user-authored code only; no credentials, no payment data, no third-party personal data.
- Sessions recorded (`ai_sessions`) with agent + context refs; raw prompts NOT persisted beyond usage metrics in MVP (minimize storage risk).
- User toggle: "Disable AI assistance" in Settings removes surfaces entirely (not just hides).

## 7. Testing (feeds D22)

Unit: router failover order; quota windows; prompt builder snapshots.
Integration: proxy route auth/quota enforcement; leak-filter triggers on planted golden-solution output.
E2E: debugger gives escalating hints on seeded failing exercise without printing solution; offline shows disabled state.
