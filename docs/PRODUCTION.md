# ROBika Production Runbook

> Live: **https://robika2.vercel.app** · Supabase: `iqkhdxxbbjhgbxjviruu` (ap-northeast-2) · Vercel: `robika2` (team za18)

## Deploy

- Git-connected auto-deploy: push ke `main` → Vercel build (framework: nextjs, Node 22) → alias `robika2.vercel.app`
- Env: 20 vars (anon, service_role, Gemini, HC 1-5, Mistral 1-6, OmniRoute, Router9, Midtrans — `PAYMENTS_ENABLED=false` flag-off)
- Build: `TSC:0` · `lint 0/0` · `Vitest 9/9` · `Playwright 12/12` (3 viewport + retry 2) · `manifest 36/0`

## Supabase

- Status: `ACTIVE_HEALTHY` (auto-restore via API `POST /restore` — pernah INACTIVE → COMING_UP → RESTORING → ACTIVE)
- DB: 32 tabel public, 37+ policies, 11 RPC, 1 Edge Function `validate-exercise` (ACTIVE, verify_jwt=false, CORS 204)
- Backup: PITR daily (Supabase free tier) + `supabase/migrations/*` di git (restore = apply berurutan)
- Monitoring: `pg_stat_statements` + `analytics_events` + `wallet_transactions` ledger

## Secrets

- Tidak pernah di-commit (`.env*` + `/env` di `.gitignore` + CI secret-scan `grep sbp_/Mid-server`)
- Service role & Midtrans server key hanya di Vercel env (encrypted) + Supabase dashboard

## Rollback

- Vercel: `vercel rollback` atau redeploy commit sebelumnya
- Supabase: `supabase db reset` lokal atau apply migrasi terbalik (DROP TABLE ...)

## On-call

- Health check: `curl https://robika2.vercel.app/account/login` → 200, `SELECT count(*) FROM pg_tables` → 32, `GET /functions/v1/validate-exercise` OPTIONS 204
- Jika Supabase INACTIVE: `POST /v1/projects/{ref}/restore` → tunggu ACTIVE_HEALTHY
