# D23 — ROBika Security Model

> Defense-in-depth around three axes: **server authority**, **sandbox isolation**, **secret hygiene**. PRD §62/§63/§2648 SECURITY list is the contract.

---

## 1. Trust Boundaries

```
Browser client ──(anon key, user JWT)──► Next.js API routes / Edge ──(service role)──► Supabase
     ▲                                          │
     │ sandboxed Worker (user code)             ├──► Midtrans (server key)
     └──────── NO direct DB access ─────────────┴──► AI providers (key pools)
```
- Client = untrusted: all balances, XP, ownership, gacha results, payment status computed server-side.
- Sandbox worker = doubly untrusted: no network, no DOM, no app imports; bridge verbs only.
- Service-role key exists ONLY in server runtime (`server-only` import barrier).

## 2. Server-Authoritative Checklist (each has enforcing doc)

| Concern | Mechanism |
|---|---|
| Gems/Credits | `wallet_apply` RPC + append-only ledger (D14) |
| Payments | signature verify + event digest idempotency + status cross-check (D15) |
| Gacha | pull RPC owns RNG/pity/duplicates (D16) |
| Ownership/equip | vault FK-scoped equip RPC (D12) |
| XP/rewards | grant RPC validates quest/objective context (D06/D03 §13) |
| Sync claims | plausibility validation on offline intents (D19) |

## 3. Secret Inventory & Handling

From `/home/reserved env` verified values — ALL classified SERVER-SIDE ONLY except the two NEXT_PUBLIC_*:
`SUPABASE_SERVICE_ROLE_KEY` · `MIDTRANS_SERVER_KEY` · `GEMINI_API_KEY` · `ROBIKA_KEY_HC_1..5` · `ROBIKA_KEY_MISTRAL_1..6` · `ROBIKA_KEY_OMNIROUTE` · `ROBIKA_KEY_ROUTER9`.
Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.

Rules:
1. `.env*` and `/env` gitignored from repo birth ("JANGAN pernah commit"); `.env.example` carries names only.
2. Production values mirrored into Vercel Encrypted Env + Supabase dashboard secrets.
3. CI secret-scan step greps built bundle for key prefixes (`sbp_`, `Mid-server-`, `sk-`, service JWT shape).
4. Rotation runbook documented; keys never logged (redact middleware on logger).

## 4. Input & Injection Defenses

- Parameterized queries everywhere via supabase-js/RPC (no string SQL).
- Zod schemas validate every API route payload and content files at build.
- File uploads (avatars later): type+size whitelist, Storage bucket policies per-user folder.
- CSP headers (next.config): default-src self; script-src self+nonce; worker-src blob: (sandbox); frame-src Midtrans Snap domain; img-src self data: assets CDN.
- Rate limits: auth endpoints, AI proxy, gacha pulls, sync apply (per-user token bucket table).

## 5. Webhook Hardening (D15)

Raw-body sha512 signature check → event_digest uniqueness → gateway status re-fetch → transition-guarded finalize. Replay, spoof, and downgrade attempts covered by integration suite.

## 6. Client-Side Hardening

- No secrets in localStorage; IndexedDB holds only gameplay/cache data.
- Monaco/sandbox workers built from static blobs reviewed by test that scans for forbidden API strings.
- Preview iframes fully sandboxed (no same-origin) — CodeLab user pages cannot reach app storage.

## 7. Abuse & Economy Attack Matrix (tested, not assumed)

| Attack | Counter |
|---|---|
| Offline reward replay farming | intent validation + plausibility bounds + audit flags |
| Bridge verb spam | per-run quota + replay filter to declared effects |
| Double turn-in race | unique completion constraint inside grant transaction |
| Wallet negative via concurrent spends | row lock + version check |
| Golden-solution leak via AI | similarity post-filter + hint ladder cap (D11) |
| Webhook forgery | signature + cross-check fail-closed |

## 8. Ops Readiness (Phase 13/14 hooks)

Audit tables retained (ledger, payment_events, gacha_pulls rng_seed, sync_log) ⇒ incident forensics possible. Backups: Supabase daily PITR enabled pre-launch. Security regression suite runs in CI gate #4. Vulnerability intake: GitHub private vulnerability reporting enabled at Phase 14.
