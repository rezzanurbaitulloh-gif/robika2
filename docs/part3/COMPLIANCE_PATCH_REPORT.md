# Laporan Tambalan Kepatuhan PRD (Phase 0–4)

> Commit `91332d0`. Hasil audit internal terhadap `masterprd.md` — semua item
> diperbaiki tanpa terkecuali sesuai perintah owner.

## Matriks Perbaikan

| # | Item PRD | Sebelum | Sesudah |
|---|---|---|---|
| 1 | **D20 Art bible** sebelum generasi massal | ❌ tidak ada | ✅ `docs/art/art-bible.md` (palet, outline, ukuran kanonik, rambu-rambu) |
| 2 | **Audio architecture** (Phase 0; klaim laporan lama = palsu) | ❌ | ✅ `game/audio/AudioSystem.ts` — WebAudio prosedural: bus master/music/sfx, 14 cue (attack, hit, quest, levelup, code, gate, coin, save), unlock-on-gesture, persistensi pengaturan, BGM arpeggio |
| 3 | **Asset manifest pipeline + CI** | ⚠️ manual | ✅ `scripts/check-assets.mjs` + langkah CI + test unit integritas |
| 4 | **§59 Settings** | ❌ 404 | ✅ halaman `/settings` + overlay in-game: slider audio per-bus, bahasa id/en, logout, reset draft |
| 5 | **§68 Lobi (Title scene)** | ❌ | ✅ `TitleScene`: Lanjutkan (deteksi save)/Petualangan Baru/Akademi/Pengaturan, navigasi pointer+keyboard, BGM |
| 6 | **§68 Story Intro** | ❌ | ✅ sinematik 4 slide saat memasuki dunia, bisa dilewati, flag tersimpan |
| 7 | **§64 Analytics** | ❌ nol event | ✅ `lib/analytics` (antrean offline) + tabel `analytics_events` + event: lesson_started/completed, code_run, enemy_defeated, quest_completed, level_up |
| 8 | **§62 Validasi server challenge (D07)** | ❌ klien otoritatif | ✅ RPC `validate_challenge_run`: efek diverifikasi ulang di server; gerbang hanya terbuka bila server sah; **fail-closed saat offline** |
| 9 | **§62 Reward musuh** | ❌ klien kirim nilai | ✅ RPC `record_enemy_kill(enemy_id)` — hadiah dari `enemy_defs` server; klien tak pernah mengirim angka |
| 10 | **§62 Validasi latihan academy** | — | ✅ Edge Function `validate-exercise` (Deno isolate menjalankan ulang kode; verify_jwt aktif) |
| 11 | **D06 Objektif tervalidasi server** | ❌ flag klien dipercaya | ✅ `world_events` + `complete_quest` v2 mengecek event tercatat; `challenge_defs.requires_events` |
| 12 | **§66/D18 Inbox** | ❌ | ✅ tabel inbox_messages + notifications, `InboxDrawer` di HUD (badge belum-baca), receipt quest otomatis |
| 13 | **D06 i18n keys** | ❌ string mentah | ✅ `content/locales/{id,en}.json` + `t()` dengan placeholder; dialog/quest/sign/toast semua berkunci |
| 14 | **§57 Prompt rotasi portrait** | ❌ | ✅ `RotatePrompt` overlay |
| 15 | **§58 Matrix responsif** | ❌ | ✅ Playwright 3 viewport (desktop-1920/laptop-1366/mobile-landscape) |
| 16 | **§75 State slices** | ⚠️ tercecer | ✅ zustand `UIState/PlayerState/QuestState` + binding event engine |
| 17 | **D13 Level-up feest** | ❌ senyap | ✅ deteksi kenaikan level → toast + event + analytics |
| 18 | **§76/D22 Testing** | ❌ hanya lint+build | ✅ Vitest 9 test (validasi uji, damage, i18n, manifest) + Playwright 12 test (alur §70 penuh: login→lobi→intro→dunia→pixel check) |
| 19 | **Boss pattern (D05)** | ⚠️ | ✅ Warden fase mengamuk ≤50% HP (speed +30%, cooldown −30%, tint + toast) |
| 20 | **Animasi musuh** | ❌ statis | ✅ 8 sheet walk (scout+warden × 4 arah × 6 frame) |
| 21 | **Scene fade-in (§56)** | ❌ | ✅ kamera fadeIn masuk dunia |

## Bug yang ditemukan & dibunuh selama proses

1. **Keyboard Phaser 3.90 tidak pernah memancarkan event** di stack ini (plugin terpasang, event window sampai, handler internal tak jalan) → **bypass total**: window listener → EventBus (`lib/game/keyboardInput.ts`); gerak/serang/interaksi/lobi semuanya EventBus. Teruji headless & browser asli.
2. **Bundle dev basi** menyamar sebagai bug logika (listener tak terdaftar) → dev server di-restart; pelajaran: restart setelah ubah modul non-React.
3. Story intro semula menimpa lobi → diurutkan sesuai §68 (muncul saat `world:entering`).

## Verifikasi akhir

- `tsc --noEmit` bersih · ESLint 0/0 · build ✓ (10 rute)
- Vitest **9/9** · Playwright **12/12** (3 viewport × alur penuh)
- Manifest 25 entri / 0 hilang · deploy produksi READY 30 dtk
- DB: migrasi 0004 terpasang (15 tabel, 8 RPC, 1 Edge Function AKTIF)

## Sisa yang disengaja (bukan kelalaian)

- Monaco masih via CDN (self-host = P11 offline)
- Certificate & gacha & payments = fase sesuai urutan PRD (P6+/P8/P9)
- Anti-farm rate-limit granular = P13 hardening (fondasi server-authority sudah ada)
