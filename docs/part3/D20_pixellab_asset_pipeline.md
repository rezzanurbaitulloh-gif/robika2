# D20 — ROBika PixelLab Asset Pipeline

> All art originates from **PixelLab MCP** generation under one Art Bible so every sprite shares a coherent visual language (PART IV). No bulk placeholder assets that establish wrong visual language.

---

## 1. Art Bible (created BEFORE large-scale generation)

`docs/art/art-bible.md` + `docs/art/style-references/` pins:
- View: low top-down (~20°) for characters/world; side for platformer-style props if ever needed.
- Palette: limited ramp per material family (Aetheria: teal-tech nature + rust machines), shared hex tokens in `tailwind.config` + palette PNG used with PixelLab color-palette features.
- Outline: single color black outline; shading: basic→medium; detail: medium.
- Sizes: characters 48px base canvas (~68px anim canvas); tiles 32px square_topdown; objects 64px; portraits 256px.
- Reference workflow: first approved hero sprite becomes `style_character_id`; tiles use `style_object_id` chaining for set coherence.

## 2. Asset Classes → Tool Mapping

| Class | PixelLab route |
|---|---|
| Player/NPC/Enemy/Boss characters | `create_character` (v3/pro w/ style_character_id) + `create_character_state` variants |
| Animations | `animate_character` template first; v3 custom for signature moves (idle/walk/attack/hurt per direction) |
| World tiles terrain | `create_topdown_tileset` chains (grass↔dirt↔stone↔water) 32px |
| Props/objects | `create_8_direction_object` or map objects styled from background refs |
| Buildings | `create_building_kit` (walls/floors/doors) |
| Paths/roads | `create_path_tiles` |
| UI panels/buttons | `create_ui_asset` with style_image from HUD mock |
| Portraits (dialogue) | `character_to_portrait` |
| Talking NPC cutscenes (later) | `set_character_portrait` + vocal/talking GIF pipeline |
| Fonts | `create_font` pixel font matching title logo |

## 3. Operational Procedure (MCP)

1. Balance check (`get_balance`) before any batch; servers ordered `pixellab` → backup/3/4/5 on exhaustion (per workspace config).
2. Generate ONE canonical style anchor per class → human (user) approval gate.
3. Batch generate remaining assets referencing anchors; tag every asset (`update_*_tags`) e.g. `robika,aetheria,npc`.
4. Download to `public/assets/<class>/<id>/…` via returned URLs; never hot-link at runtime.
5. Record each in **Asset Manifest**:

```jsonc
// docs/art/asset-manifest.json
{ "characters.player": { "file":"assets/characters/player/sheet.png", "frame":48, "anims":["idle","walk","attack"] },
  "tiles.boot_valley": { "tileset":"assets/tiles/boot_valley.png", "size":32 },
  "ui.panel.main": { "nine_slice":"assets/ui/panel_main.png" } }
```
6. Scenes load ONLY through manifest keys — no hard-coded filenames (D02 boundary rule).

## 4. Processing Steps (build-time scripts `scripts/assets/`)

- Trim transparent margins · pack into TexturePacker-compatible atlases ≤2048² · generate `.json` frame data for Phaser · optimize (pngquant-level) · copy maps from Map Workshop exports into `public/maps`.
- Integrity test: manifest ↔ files existence check in CI.

## 5. Naming & Versioning

`<class>.<name>` manifest ids; files kebab-case; regenerated assets bump `?v=hash` query via build to bust caches.

## 6. MVP Asset Checklist (Phase-0/1 scope, §69)

player (8-dir + idle/walk) · 3 NPCs (+portrait) · 3 enemies + mini-boss · Boot Valley tileset chain · hub map props · base interior kit · dungeon tileset · UI: panel, button, dialogue box, HP/XP bars, code terminal frame · font · BGM/SFX handled by D21.

## 7. Testing / QA

Visual review board (user approves each batch) · atlas load smoke test in BootScene · missing-manifest-entry CI failure · palette drift check (dominant-color distance vs art bible tokens).
