# D21 — ROBika Audio Pipeline

> AudioSystem owns all playback: BGM, SFX, dialogue blips, coding success/error, combat, quest, reward, level-up, UI, environment. Audio reinforces actions (PART IV) and never blocks the game loop.

---

## 1. Architecture

```
AudioSystem (game/audio)
├── Buses: master → [music, sfx, ui, voice, ambient]   (per-bus gain + mute)
├── Cue registry: cue_id → {file, bus, volume, loop, cooldown}
├── Playback engine: WebAudio via Phaser sound; pooling for one-shots
├── Music director: scene→track map with crossfade on transition; intensity layers later
└── Persistence: settings store volumes; mobile unlock-on-first-gesture gate
```

## 2. Cue Map (MVP)

| Context | Cues |
|---|---|
| BGM | title theme · hub overworld · dungeon tension · base calm · victory sting |
| SFX | footstep variants · sword swing/hit · enemy death · boss roar |
| Coding | key ticks (subtle) · run start whoosh · success chime · error buzz |
| Quest | accept stamp · objective ping · turn-in fanfare · level-up fanfare+sparkle |
| Economy | coin pickup · purchase ka-ching · gacha capsule shake/burst by rarity |
| UI | hover tick · confirm · cancel · panel open/close · notification pop |
| Environment | wind ambience hub · drips cave · terminal hum near interactables |

Registry is data (`content/audio/cues.json`); code references ids only — new sounds need no engine change.

## 3. Asset Production

- Sources: PixelLab covers visuals only → audio from licensed CC0 packs or commissioned 8-bit set; every file passes through loudness normalization (-16 LUFS music, -12 SFX peaks), mono SFX/stereo music, OGG+M4A dual encode (browser coverage).
- Files under `public/audio/{bgm,sfx}/cue_name.ogg|m4a`; manifest entries added alongside cues.json.
- Budget: total initial ≤ ~8MB; music loops must be seamless (verified by listen-through test script checking loop markers).

## 4. Behavior Rules

1. First user gesture unlocks WebAudio (mobile requirement) — TitleScene handles.
2. Scene transitions crossfade 0.8s; combat enters raise intensity layer if provided.
3. Cooldowns prevent machine-gun SFX (e.g., footsteps rate-limited by movement system events).
4. Settings (§59): sliders per bus + master mute persisted to profile settings; offline-safe.
5. Failure tolerance: missing file logs warn, plays nothing — never crashes scene load.

## 5. Dialogue Voice Strategy (later phase)

Blip-per-character retro voice per NPC pitch class; full VO out of MVP scope. Portrait talking GIFs (PixelLab) pair with blips when introduced.

## 6. Testing (feeds D22)

Unit: registry resolution; cooldown logic; bus routing math.
Integration: scene change swaps track without overlap glitch (headless timing assertions).
Manual QA checklist per platform matrix incl. iOS silent-switch behavior note.
