import * as Phaser from "phaser";
import { EventBus } from "@/game/EventBus";

export interface Interactable {
  id: string;
  kind: string;
  x: number;
  y: number;
  radius: number;
  lines: Array<{ speaker: string; text: string }>;
  resolveLines?: () => Array<{ speaker: string; text: string }>;
  resolveConfig?: () => import("@/game/dialogue/DialogueRunner").DialogueConfig | null;
  onDialogueEnd?: () => void;
  onInteract?: () => void;
}

export class InteractionSystem {
  private scene: Phaser.Scene;
  private runner: DialogueRunnerRef;
  private items: Interactable[] = [];
  private nearest: Interactable | null = null;

  constructor(scene: Phaser.Scene, runner: DialogueRunnerRef) {
    this.scene = scene;
    this.runner = runner;
    const off = EventBus.on("input:interact", this.boundTry);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private boundTry = () => this.tryInteract();

  register(item: Interactable) {
    this.items.push(item);
  }

  update(playerX: number, playerY: number) {
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.items) {
      const d = Phaser.Math.Distance.Between(playerX, playerY, it.x, it.y);
      if (d < it.radius && d < bestDist) {
        best = it;
        bestDist = d;
      }
    }
    if (best !== this.nearest) {
      this.nearest = best;
      EventBus.emit("ui:prompt", best ? { label: best.kind === "npc" ? "talk" : "inspect" } : null);
    }
  }

  tryInteract() {
    if (this.runner.isActive) {
      this.runner.advance();
      return;
    }
    if (!this.nearest) return;
    const it = this.nearest;
    if (it.onInteract) {
      EventBus.emit("ui:prompt", null);
      it.onInteract();
      return;
    }
    const config = it.resolveConfig?.() ?? null;
    const lines = config?.lines ?? (it.resolveLines ? it.resolveLines() : it.lines);
    if (lines.length) {
      EventBus.emit("ui:prompt", null);
      if (config) this.runner.startConfig(config, it.onDialogueEnd);
      else this.runner.start(lines, it.onDialogueEnd);
    }
  }
}

interface DialogueRunnerRef {
  isActive: boolean;
  advance(): boolean;
  start(lines: Array<{ speaker: string; text: string }>, onEnd?: () => void): void;
  startConfig(config: import("@/game/dialogue/DialogueRunner").DialogueConfig, onEnd?: () => void): void;
}
