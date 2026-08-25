import bootValley from "@/content/worlds/boot_valley.json";
import miraDialogue from "@/content/dialogue/mira.json";
import dengklekDialogue from "@/content/dialogue/dengklek.json";
import luluDialogue from "@/content/dialogue/lulu.json";
import chGatePower from "@/content/challenges/ch_gate_power.json";
import qBoot01 from "@/content/quests/q_boot_01_darkened_bridge.json";
import dungeon01 from "@/content/worlds/dungeon_01.json";
import baseWorld from "@/content/worlds/base.json";
import enemiesJson from "@/content/enemies/enemies.json";
import type { ChallengeDef } from "@/lib/coding/ChallengeRunner";

export interface WorldProp {
  id: string;
  ref: string;
  x: number;
  y: number;
  solid?: boolean;
}

export interface WorldDef {
  id: string;
  name_key: string;
  atlas: string;
  tile_size: number;
  props?: WorldProp[];
  legend: Record<string, string>;
  solid: string[];
  rows: string[];
  spawns: Record<string, { x: number; y: number }>;
  enemy_spawns?: Array<{ def: string; x: number; y: number }>;
  interactables: Array<{
    id: string;
    kind: string;
    radius_tiles: number;
    lines?: Array<{ speaker: string; text: string }>;
    lines_keys?: string[];
    challenge_ref?: string;
    target?: { world: string; spawn: string };
    props_at?: { x: number; y: number };
    credits?: number;
    idem?: string;
    target_url?: string;
  }>;
}

export interface DialogueDef {
  npc_id: string;
  speaker?: string;
  trees: Record<string, string[]>;
  default_tree: string;
}

export const worlds: Record<string, WorldDef> = {
  boot_valley: bootValley as unknown as WorldDef,
  dungeon_01: dungeon01 as unknown as WorldDef,
  base: baseWorld as unknown as WorldDef,
};
export const dialogues: Record<string, DialogueDef> = {
  npc_engineer_mira: miraDialogue as DialogueDef,
  npc_pak_dengklek: dengklekDialogue as DialogueDef,
  npc_lulu: luluDialogue as DialogueDef,
};
export const challenges: Record<string, ChallengeDef> = { ch_gate_power: chGatePower as unknown as ChallengeDef };

export interface EnemyDef {
  id: string;
  name: string;
  texture: string;
  frame_size: number;
  hp: number;
  damage: number;
  speed: number;
  aggro_radius: number;
  attack_radius: number;
  attack_cooldown_ms: number;
  xp: number;
  credits: number;
  respawn_ms: number;
  body_offset: { w: number; h: number; ox: number; oy: number };
}
export const enemies: Record<string, EnemyDef> = enemiesJson as Record<string, EnemyDef>;

export interface QuestDef {
  id: string;
  title_key: string;
  giver: string;
  objectives: Array<{ id: string; type: string; target: string; text_key: string }>;
  rewards: { xp: number; credits: number };
}
export const quests: Record<string, QuestDef> = {
  q_boot_01_darkened_bridge: qBoot01 as unknown as QuestDef,
};
