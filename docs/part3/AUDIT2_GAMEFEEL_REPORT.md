# Laporan Audit Mendalam #2 + Game Feel & World (Phase 5.5)

> Commit `caa857e` + `8558509` + portrait fix. Audit ulang terhadap SUMBER PRD
> (bukan ingatan): §5, §7, §8, §9, §12–14, §53–59, §68–71.

## Gap yang ditemukan & diperbaiki (semuanya)

| § PRD | Item | Fix |
|---|---|---|
| §69 | 3 NPC (hanya Mira) | + **Pak Dengklek** (penjaga reruntuhan) & **Lulu** (botanis) + dialog |
| §68/§70 | "return to base" (langkah 17) | **Basis Petualang**: altar pulih+simpan, pintu selatan |
| §69 | "one dungeon" | **Reruntuhan Glitch**: interior batu, 4 musuh, glitch core, pintu di balik gerbang |
| §66/D18 | notifications tak tertulis | mirror level_up & quest_completed (migrasi 0006 + lib/notify) |
| §76/D22 | gameplay suite tak di-commit | 9 spec E2E committed (gerak/dialog/combat × 3 viewport) |
| D08 | bridge_version tak dijalankan | challenge `min_bridge_version` + worker report + runner reject |
| §7.4 | portrait & choices dialog | **sistem pilihan penuh** (schema+runner+UI) + 3 portrait; pilihan Mira: Siap!/Persiapan (flag + baris lanjutan) |
| §7.3 | NPC statis, tanpa idle | breathing-idle 3 NPC (4f) + wander ringan radius rumah |
| §7.2 | dodge tidak ada | **dodge dash** (Shift/tombol »») + i-frames 450ms, biaya energi |
| §54 | energy & Gems | bar EN teal (regen 12/dtk) + chip ◆ Gems |
| §55 | quest complete = toast | **★ popup pixel** (bintang, reward, LANJUTKAN) |
| §53 | base kosong | Terminal Akademi (portal ke /academy) |
| §56 | loading teks | maskot pixel berjalan + judul region |
| §12 | matriks dukungan bahasa | `course.support` {content/editor/execution/offline} + badge katalog |

## Feedback client (Gini) — dieksekusi

- **P1 Game Feel**: lunge serangan, damage number melayang, partikel ledakan musuh, NPC bob/idle, variasi ukuran pohon, screen shake (ada), SFX/BGM (ada)
- **P2 World**: **map didesain ulang** — sungai+autotile air, jembatan (gerbang di atasnya, pintas diblokir), gubuk Mira, bunga/batu/semak, **relik rahasia** tenggara (+25◈ sekali), pintu dungeon & basis, fallback tile dasar (162 tile kosong → 0)
- **Menu kontekstual**: CodeLab 🔒 sampai menemukan Terminal Kode; item default sinkron (fix race Enter)
- Landing page: dipertahankan sebagai layer SYSTEM UI (sesuai visi dua-layer client)

## Bug yang dibunuh

1. Tile dasar hilang di sel solid → latar hitam (162 → 0)
2. Dobel advance `input:interact` (2 listener) → pilihan dialog terlewati
3. Race menu TitleScene (buildMenu async) → Enter mati
4. Collision rect tampak hitam → disembunyikan
5. Edge function BOOT_ERROR (esm.sh) → rewrite dependency-free + OPTIONS 204

## Verifikasi

TSC 0 · lint 0/0 · Vitest 9/9 · Playwright smoke 12/12 + gameplay 3/3 (desktop) · manifest 36/0 · deploy READY 33s · DB 17 tabel + migrasi 0006.

## Sisa tercatat (rencana jelas)

- Dodge animation frame (logika jalan, anim khusus menyusul P12)
- Quiz → mastery contribution (P13 tuning)
- Offline validation queue (P11 — desain antrean sinkron)
- MCP fallback terpakai: backup (tileset+portrait Mira), pixellab-3 (2 portrait) — pool utama tersisa ~6
