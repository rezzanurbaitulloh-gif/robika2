# D06 — ROBika Quest Architecture

> Quests are data (§73). The engine runs objectives; the server validates completion and grants rewards (`grant_rewards`). MVP scope: 5–10 meaningful quests across Boot Valley hub + one dungeon (§69).

---

## 1. Content Model (`content/quests/*.json`)

```jsonc
{
  "id": "q_boot_01_power_loss",
  "title": "The Darkened Bridge",
  "giver": "npc_engineer_mira",          // NPC ref in content/dialogue
  "prerequisites": [],                    // quest ids or mastery thresholds
  "level_requirement": 1,
  "description_key": "quests.q_boot_01.desc",
  "objectives": [
    {
      "id": "obj_find_terminal",
      "type": "reach_interactable",       // objective types below
      "target": "terminal_bridge_gate",
      "hint_key": "quests.q_boot_01.hint1"
    },
    {
      "id": "obj_fix_code",
      "type": "coding_challenge",
      "challenge_ref": "ch_js_loop_gate",  // content/challenges entry
      "optional": false
    },
    {
      "id": "obj_clear_scouts",
      "type": "defeat_enemies",
      "target": "enemy_glitch_scout",
      "count": 3
    }
  ],
  "rewards": {                            // applied ONLY via server RPC
    "xp": 60,
    "credits": 25,
    "items": [{ "ref": "item_battery_cell", "qty": 1 }],
    "unlock_quest": ["q_boot_02"]
  },
  "turn_in_npc": "npc_engineer_mira"
}
```

### Objective types (extensible registry)
`talk_to` · `reach_interactable` · `collect_item(count)` · `defeat_enemies(target,count)` · `coding_challenge(ref)` · `explore_zone(zone_id)` · `escort/follow` (later) · `custom_scripted` (Studio-authored, later).

## 2. Runtime Engine (`game/quests/QuestEngine.ts`)

State machine per quest: `LOCKED → AVAILABLE → ACCEPTED → OBJECTIVES(n) → READY_TO_TURN_IN → COMPLETED`.

- Objective progress updates arrive via EventBus (`enemy.defeated`, `item.collected`, `coding.success`, zone-enter events).
- Progress persisted in save snapshot (`state.quests`) locally + mirrored to server progress table for authoritative quests.
- Server-side validation: turn-in calls `grant_rewards` RPC with quest id; function re-checks prerequisites/objectives from canonical quest content before granting — client-completed flags are never trusted alone.

## 3. UI Integration

- **Quest tracker HUD** (top-right, §54): active objective lines with counters; collapses on mobile landscape into compact pill.
- **Dialogue integration**: accept/decline inside DialogueRunner choices; `dialogue.completed` may auto-accept scripted tutorial quests.
- **Turn-in**: marker over NPC head (`!` available, `?` ready — classic pixel grammar), popup panel shows rewards before confirm.
- **Notifications**: `quest.completed` toast + inbox receipt row (D18).

## 4. Reward Flow

```
objective done (client) ──► turn_in request ──► RPC grant_rewards(quest_id)
   ├─ validates: level req, prereqs, all objectives complete, not already turned in
   ├─ writes: xp/credits via wallet+character_state, vault/inventory rows
   └─ returns reward summary ──► client plays reward popup + events
```

Idempotency: unique constraint on `(user_id, quest_id)` completion record prevents double-grant even if client retries offline-later.

## 5. Authoring Rules (Studio-ready)

- No scene code references quest ids except through registries built at load time.
- Localization keys required for title/description/hints (id + en minimum).
- Every quest must be completable within its region's interactables/enemies defined in world content.
- Balance pass checklist: XP curve alignment (levels config), credit economy sinks/sources (D14), difficulty vs coding challenge tier.

## 6. Testing (feeds D22)

Unit: state machine transitions; prerequisite chains; reward summary math.
Integration: `grant_rewards` double-turn-in rejection; offline turn-in replay.
Gameplay: full §70 loop quest (accept→code→fight→turn-in) headless spec.
E2E: first quest completes without manual dev tools.
