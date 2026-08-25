import bootValley from "@/content/worlds/boot_valley.json";
import miraDialogue from "@/content/dialogue/mira.json";
import chGatePower from "@/content/challenges/ch_gate_power.json";
import qBoot01 from "@/content/quests/q_boot_01_darkened_bridge.json";
import enemiesJson from "@/content/enemies/enemies.json";
import type { ChallengeDef } from "@/lib/coding/ChallengeRunner";

export interface WorldDef {
  id: string;
  name_key: string;
  tile_size: number;
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
    challenge_ref?: string;
  }>;
}

export interface DialogueDef {
  npc_id: string;
  trees: Record<string, Array<{ speaker: string; text: string }>>;
  default_tree: string;
}

export const worlds: Record<string, WorldDef> = { boot_valley: bootValley as WorldDef };
export const dialogues: Record<string, DialogueDef> = { npc_engineer_mira: miraDialogue as DialogueDef };
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
  title: string;
  giver: string;
  objectives: Array<{ id: string; type: string; target: string; text: string }>;
  rewards: { xp: number; credits: number };
}
export const quests: Record<string, QuestDef> = {
  q_boot_01_darkened_bridge: qBoot01 as unknown as QuestDef,
};
