# D05 — ROBika Game Scene Architecture

> Engine: Phaser 3 inside Next.js client route `/game`. React renders HUD; Phaser owns the world canvas. Communication: typed EventBus + state stores (D01 §5). All scene content is data-driven from `content/worlds` (§73) — scenes contain mechanics, not content.

---

## 1. Scene Graph & Lifecycle

```
BootScene ──► TitleScene ──► HubScene (Boot Valley hub, §69)
                 │                  │
                 │                  ├─► DungeonScene (one dungeon MVP)
                 │                  └─► BaseScene (player base: Vault/loadout access)
                 └── (settings/audio persist across all via registry)

UIScene (overlay): runs parallel on top; React HUD bridge subscribes to it.
```

| Scene | Responsibility | Data source |
|---|---|---|
| `BootScene` | load asset manifest → preload core atlases → audio unlock gate → hand off | `asset-manifest.json` (D20) |
| `TitleScene` | title art, Continue/New Game, settings shortcut; first-screen "feels like a game" (PART IV) | content/worlds/title |
| `HubScene` | Boot Valley: NPCs, quest board triggers, exits to dungeon/base; ambient systems | `content/worlds/boot_valley.json` + Tiled map |
| `DungeonScene` | combat space: enemies, mini-boss, coding-problem interactables | `content/worlds/dungeon_*.json` |
| `BaseScene` | safe zone: vault terminal, loadout mirror, save shrine | `content/worlds/base.json` |
| `UIScene` | forwards engine events ↔ React store slices; input lock during dialogue/coding | — |

Rules: every scene extends a shared `BaseWorldScene` providing camera follow, interaction system hooks, spawn points from map metadata, and pause/resume contract with UIScene.

## 2. Entities (`game/entities/`)

- **Player**: arcade physics body, movement system driven by keyboard/gamepad/touch joystick (mobile landscape, §57), animation state machine from PixelLab sheets, interaction sensor.
- **NPC**: idle/walk animations, interaction radius, dialogue runner binding, quest-giver flags resolved from content.
- **Enemy / MiniBoss**: patrol/chase/attack states, stats from `content` enemy defs, damage interface consumed by CombatSystem, death → `enemy.defeated` event.
- **Pickup/Interactable**: world objects that fire bridge verbs (terminals, chests, shrines).

## 3. Systems (`game/systems/`)

1. **MovementSystem** — velocity model, collision layers (ground/blocks/water), mobile touch vector.
2. **CameraSystem** — smooth-follow player, bounds from Tiled map, zoom presets per platform.
3. **CollisionSystem** — layer masks + entity overlap routing into InteractionSystem/CombatSystem.
4. **InteractionSystem** — nearest-target selection, "E"/tap prompt, emits `interact.requested`.
5. **CombatSystem** — attack resolution, damage formula using attributes+equipment modifiers (D13), hit feedback, boss phase logic.
6. **SaveSystem** — serializes WorldState/QuestState/PlayerState snapshot → local cache + debounced remote upsert (`saves.revision++`).
7. **SpawnSystem** — reads spawn tables, respawns enemies on timer/dungeon reset rules.

## 4. Event Contract (subset of §74 consumed here)

Engine emits: `quest.accepted/completed`, `coding.started/success/failure`, `enemy.defeated`, `player.levelup`, `item.collected/equipped`, `skin.obtained`, `dialogue.started/completed`.
Engine consumes: UI commands (open inventory, equip), bridge world-mutation verbs (D08), sync results (`sync.completed` → reload deltas).

## 5. Coding Integration Points

- Interactable "problem terminals" in dungeons/hub open the Code Terminal overlay (React/Monaco).
- Successful run posts a verb through the game-code bridge (e.g., `bridge.openBridge()`, `bridge.powerGate()`) → scene reacts visibly ("coding changes the world").
- Failure surfaces hints (no auto-solutions, D11).

## 6. Responsive Behavior (§57–58)

- Canvas scales to viewport letterboxed at 16:9-safe region; HUD reflows via Tailwind breakpoints.
- Mobile landscape: virtual joystick left, action buttons right; portrait shows rotate prompt.
- Test targets: desktop 1920×1080 / laptop 1366×768 / mobile landscape ~844×390 class devices.

## 7. Performance & Polish Budget

- Texture atlases ≤ 2048²; target 60fps desktop / 30fps floor mid-mobile.
- Scene transitions: fade/iris via EffectsSystem; BGM crossfade via AudioSystem buses (D21).
- Loading screens per §56 with progress from BootScene manifest loader.

## 8. Acceptance Hooks for §70 Slice

Steps mapped: enter world (HubScene) · move (MovementSystem) · talk (Interaction+Dialogue) · receive quest (QuestEngine) · explore (map content) · find problem (terminal interactable) · write/run code (CodingEngine+bridge) · world reacts (verb handler) · fight (CombatSystem vs enemy) · complete quest (rewards RPC) · return to base (BaseScene save shrine).
