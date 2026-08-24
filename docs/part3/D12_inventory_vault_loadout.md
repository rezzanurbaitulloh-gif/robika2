# D12 — ROBika Inventory / Vault / Loadout Architecture

> Three distinct domains with hard definitions (PRD):
> **VAULT** = permanent owned collection. **INVENTORY** = operational/current item storage (consumables, stackables). **LOADOUT** = what is equipped right now (skin/equipment/companion/effects).

---

## 1. Domain Rules

| Domain | Table | Duplication | Deletion | UI |
|---|---|---|---|---|
| Vault | `vault_items` (unique per user+kind+ref) | impossible by constraint | never (collection pride) | `/vault` museum-style grid by category+rarity |
| Inventory | `inventory_items` (quantity stack) | stacked counts | consume/decrement only | in-game panel + quick slots |
| Loadout | `loadout` (single active row MVP) | one active set | unequip ≠ delete | mirror in BaseScene + HUD chips |

Acquisition sources: quest rewards, shop purchases, gacha pulls, achievements — all arrive via server grant RPCs which write vault/inventory atomically and emit inbox receipts.

## 2. Flows

### 2.1 Grant
```
RPC grant_rewards / finalize_payment / gacha_pull
  ├─ equipment/skin/companion/module → INSERT ... ON CONFLICT (user_id,kind,ref) DO NOTHING
  │     conflict ⇒ duplicate policy: convert (gacha) or ignore+notify
  └─ consumable → UPSERT quantity += qty
```

### 2.2 Equip (Loadout)
`equip_item(user, kind, ref)` RPC:
1. verify ownership row exists in vault (or equipment-kind inventory for wearables if content declares),
2. validate slot compatibility from content (`content/items/*.json`: slot map, level reqs, stat mods),
3. write loadout JSON `{weapon, armor, trinket...}` — atomic replace,
4. return computed attribute deltas → client applies to CombatSystem via `item.equipped`.

Unequip = set slot null; swap = single call. No client-side equip writes ever.

### 2.3 Consume
`consume_item(user, ref, qty)` RPC decrements floor at 0; effects applied through same effect pipeline as rewards (e.g., XP booster item sets event_progress modifier).

## 3. Content Schema (`content/items/`, `content/skins/`)

```jsonc
// item
{ "id":"item_battery_cell", "kind":"consumable", "rarity":"common",
  "stackable":true, "effects":[{"type":"energy","amount":25}],
  "icon_ref":"items/battery_cell", "desc_key":"items.battery_cell.desc" }

// equipment
{ "id":"eq_circuit_blade", "kind":"equipment", "slot":"weapon", "rarity":"rare",
  "mods":{"power":4}, "level_req":2,
  "visual":{"player_layer":"weapon_circuit_blade"}, "desc_key":"..." }

// skin
{ "id":"skin_rust_scout", "kind":"skin", "rarity":"epic",
  "sprite_set":"skins/rust_scout", "preview_ref":"...", "desc_key":"..." }
```

Skins/equipment render through player layer composition (D13) — owning a skin swaps sprite_set; equipment overlays weapon/armor layers; both persist across scenes from loadout state.

## 4. UI Contracts

- **Vault page**: category tabs (Skins/Equipment/Companions/Modules), rarity glow tiers, detail popup with acquisition story line ("Obtained from The Darkened Bridge"). Empty states show silhouettes of obtainables (desire engine, PART IV).
- **Inventory panel (HUD)**: grid with count badges, context menu Use/Inspect; mobile = bottom sheet.
- **Equip surfaces**: BaseScene mirror + vault detail "Equip" button; HUD shows active skin/weapon mini-icons.
- All panels follow §67 states incl. offline read-from-cache.

## 5. Offline & Sync

- Read paths served from cached snapshot; grants made offline are queued as intents validated on sync apply (server remains authority; conflicts resolved D19).
- Loadout changes offline allowed but marked provisional until server confirm badge clears.

## 6. Testing (feeds D22)

Unit: grant dedupe/conversion; equip validation matrix (not-owned/wrong-level/slot-mismatch).
Integration: RPC ownership enforcement cross-user attempts blocked.
Gameplay: equip sword → damage delta visible vs dummy enemy; skin swap persists scene transitions.
E2E: §70 steps 15–16 (inspect vault → equip item).
