import bootValley from "@/content/worlds/boot_valley.json";
import miraDialogue from "@/content/dialogue/mira.json";

export interface WorldDef {
  id: string;
  name_key: string;
  tile_size: number;
  legend: Record<string, string>;
  solid: string[];
  rows: string[];
  spawns: Record<string, { x: number; y: number }>;
  interactables: Array<{
    id: string;
    kind: string;
    radius_tiles: number;
    lines?: Array<{ speaker: string; text: string }>;
  }>;
}

export interface DialogueDef {
  npc_id: string;
  trees: Record<string, Array<{ speaker: string; text: string }>>;
  default_tree: string;
}

export const worlds: Record<string, WorldDef> = { boot_valley: bootValley as WorldDef };
export const dialogues: Record<string, DialogueDef> = { npc_engineer_mira: miraDialogue as DialogueDef };
