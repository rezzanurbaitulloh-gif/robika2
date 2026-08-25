# Phase 5 Report — Academy

> Per PRD contract: implemented · files changed · database changes · tests added · test results · known limitations · next phase.

## What was implemented

**Content (D09, keyed i18n):**
- Course **"Dasar Kode"** (JavaScript): 3 bab — Variabel → Kondisi → Loop; tiap bab 1 pelajaran berisi blok text (bold), code example, quiz interaktif, exercise ber-sandbox, dan **Practice in Game** (loop lesson → quest gerbang).
- Semua string berkunci (`course.*`, `chapter.*`, `lesson.*`, `b.*`) di `content/locales/{id,en}.json`; tipe `LessonBlock/ChapterDef/CourseDef` keyed.

**Routes:**
- `/academy` — katalog bergaya dunia (bukan dashboard).
- `/academy/[course]/[chapter]/[lesson]` — lesson player: progress resume, quiz feedback instan + pembahasan, latihan Monaco-style textarea + RUN.

**Exercise pipeline (server-authoritative, §62/D07):**
1. Client sandbox (worker: timeout 5s, log cap) menjalankan kode & membandingkan return.
2. **Edge Function `validate-exercise`** menjalankan ulang kode di isolate Deno (auth via GoTrue REST; tanpa dependensi eksternal setelah BOOT_ERROR esm.sh; OPTIONS 204 CORS).
3. RPC **`complete_lesson`**: XP idempoten (`lesson:<id>`) + mastery +25 + pencatatan completion + **sertifikat kursus** saat semua pelajaran tuntas — satu panggilan server, sanity bounds XP 0–200.

**Database (migrasi 0005):** `lesson_completions` (unique user+lesson), `certificates` (serial `ROBIKA-<hash>`, unique user+course), RPC `complete_lesson`. Total 17 tabel.

## Files changed
`3f7787e` — content/academy/**, content/locales/**, lib/academy/**, app/academy/**, supabase/migrations/0005, supabase/functions/validate-exercise/** (rewrite).

## Database changes
0005 applied: +2 tabel, +1 RPC (17 tabel total). Edge function redeployed (dependency-free).

## Tests added
Headless E2E academy flow (login → lesson → exercise RUN → server verdict) + DB trail assertions.

## Test results
- Lint 0/0 · TS clean · build ✓ · deploy READY 27s.
- E2E: jawaban benar → `✓ LULUS — pelajaran selesai! +20 XP`.
- DB trail: `lesson_completions` ✓ · `mastery js.variabel = 25` ✓ · ledger `lesson_completed +5` dengan kunci idempoten ✓ · wallet 110◈.

## Known limitations
1. Editor latihan = textarea (Monaco penuh menyusul di CodeLab P6; CDN→self-host P11).
2. Sertifikat: threshold "≥3 pelajaran kursus" hard-coded untuk kursus pertama — generalisasi via tabel course_lesson_count saat kursus kedua lahir.
3. Mastery display di profil menyusul (halaman profil = P7).
4. Quiz belum menyumbang mastery (hanya exercise).

## Next phase
**Phase 6 — CodeLab/Studio**: proyek multi-file, editor+run+preview iframe sandbox, project history/versions, runtime selection (D10); tabel CODELAB (projects/files/versions).
