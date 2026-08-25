# ROBika Art Bible — Aetheria Visual Language

> D20 wajib: dokumen ini adalah acuan SEBELUM generasi aset massal. Setiap aset baru
> harus lolos cek konsistensi terhadap dokumen ini.

## 1. Identitas Visual

**ROBika** = petualangan pixel-art di dunia Aetheria: alam teal-tech bertemu mesin
rust korup. Dunia yang hangat dan hidup, dengan "luka" glitch sebagai konflik visual.

- **Bukan** dashboard SaaS, bukan estetika AI ungu-biru generik.
- Identitas datang dari dunia: tile rumput, terminal kode, NPC, gerbang energi.

## 2. Kamera & View

- Karakter/dunia: **low top-down (~20°)**, gaya RPG klasik 3/4.
- Prop pendukung boleh high top-down bila lebih terbaca.

## 3. Palet

| Keluarga | Hex inti | Penggunaan |
|---|---|---|
| Rumput Aetheria | `#3fae5a` / `#2f8f4a` | tile dasar dunia |
| Tanah/jalan | `#8a5a3b` / `#6e4530` | path, tebing tanah |
| Teal teknologi | `#34d399` / `#22d3aa` | energi, terminal, UI aksen |
| Karat/mesin | `#5a5f6b` / `#3a3f4a` | gerbang, warden, logam |
| Glitch merah | `#ef4444` / `#ff5555` | musuh, bahaya, HP |
| Latar UI | `#0d1b1e` / `#12262b` | panel, layar |

Dilarang memperkenalkan ungu/biru default generatif sebagai warna identitas.

## 4. Outline & Shading

- Outline: **single color black** (1px, warna gelap palet).
- Shading: **basic→medium** (2–3 tingkat per material).
- Detail: medium — terbaca di 32–68px.

## 5. Ukuran Kanonik

| Kelas | Ukuran canvas | Catatan |
|---|---|---|
| Karakter (player/NPC/enemy) | 48px base (canvas hasil 48–92) | 4–8 arah |
| Mini-boss | 64px base (canvas 92) | siluet > 1.4× scout |
| Tile | 32×32 | square top-down, Wang transition |
| Prop kecil | 48–64 | pohon 64, sign/terminal 48 |
| VFX | 48 | slash, spark |

## 6. Rambu-rambu Konten

1. Satu anchor style per kelas aset; aset baru mengacu anchor (PixelLab
   style_character_id / style_object_id).
2. Dilarang placeholder massal yang membangun bahasa visual salah (aturan PRD).
3. Nama file kebab-case; id manifest `<kelas>.<nama>`.
4. Setiap aset masuk `public/assets/manifest.json` — scene tidak boleh hard-code path.

## 7. Audio (pasangan visual)

Chiptune prosedural (WebAudio): square/triangle lead, sawtooth untuk bahaya.
Palet nada pentatonik minor — hangat, sedikit misterius.
