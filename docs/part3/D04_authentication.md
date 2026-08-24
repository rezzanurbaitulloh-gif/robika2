# D04 — ROBika Authentication Architecture

> Provider: Supabase Auth (GoTrue). Client: `@supabase/ssr` browser + server clients. All authorization enforced by RLS (D03 §12); the client never receives service-role credentials.

---

## 1. Flows

### 1.1 Onboarding chain (§68)
```
Launch → Title → Login/Register → Account Setup → Character Setup → Story Intro → World
```
- **Register**: email+password (MVP) with username reservation check; optional OAuth providers later (Google) — adapter point in `lib/auth/providers.ts`.
- **Account Setup** (`/account/setup`): unique username 3–24 chars, display name, language. Writes `profiles.onboarded_at` only after Character Setup completes.
- **Character Setup**: base appearance selection from art-bible options → writes `character_state.appearance`.
- Guard: any protected route redirects to `/account/login` when no session; `/game` additionally requires `profiles.onboarded_at IS NOT NULL`, else routes to setup steps.

### 1.2 Session handling
- Supabase session persisted by `@supabase/ssr` cookie storage; middleware (`middleware.ts`) refreshes tokens and exposes `supabase.user` to server components.
- Server API routes re-derive user via `createServerClient` — never trust a client-sent `user_id`.
- Service-role client exists only inside route handlers/Edge functions that need it and imports `server-only`.

### 1.3 Guest/offline posture
- No guest mode in MVP (vertical slice starts at create/login, §70 step 1).
- Offline: last valid session cached; game runs against local saves; auth-gated features degrade per D19 matrix.

## 2. Route Protection Matrix

| Route | Requirement |
|---|---|
| `/` , `/account/login`, `/account/register` | public |
| `/account/setup`, `/game/*`, `/academy/*`, `/codelab/*`, `/shop`, `/vault`, `/profile`, `/mentor`, `/settings` | authenticated |
| `/studio/*` | authenticated + `role='content_admin'` in profiles.settings (future phase) |
| `/api/payments/*`, `/api/sync/*`, `/api/ai/*` | authenticated server-side check |

## 3. Server-Side Rules

1. Every RPC/Edge function begins with `select auth.uid()` scoping; ownership checks in RLS are defense-in-depth, not the only gate.
2. Value-granting functions (`grant_rewards`, `gacha_pull`, `finalize_payment`) verify entitlement + rate limits internally.
3. Username uniqueness via DB constraint; profanity/reserved-word filter applied in setup handler before insert.
4. Password policy: min 8 chars; Supabase default leak-protection enabled.
5. Email confirmation required before gameplay entry (configurable flag for dev seeds).
6. Rate limits (per user/IP) on register, login, password reset via Upstash-free simple Postgres counters or Vercel WAF rules (Phase 13 hardening).

## 4. Security Invariants (ties to D23)

- Anon key is public by design; nothing sensitive depends on it alone.
- Service-role key never appears in client bundles: enforced by `server-only` import + CI grep + bundle audit test (D22).
- Sessions invalidated on password change (Supabase default); logout clears cookies + local caches of user-scoped IndexedDB stores.
- Account deletion: cascade delete via `profiles.id on delete cascade` graph; ledger rows retained (append-only audit) but anonymized user_id reference kept under GDPR-style request policy.

## 5. Testing Checklist (feeds D22)

- register → confirm → login → onboarded flow E2E
- protected-route redirect matrix (anon / authed-unonboarded / authed-onboarded)
- RPC called with foreign user id returns 403-equivalent error
- logout clears local save cache for that user
- refresh-token rotation survives offline reconnect
