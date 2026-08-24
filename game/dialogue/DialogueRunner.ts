import { EventBus } from "@/game/EventBus";

export interface DialogueLine {
  speaker: string;
  text: string;
}

export class DialogueRunner {
  private lines: DialogueLine[] = [];
  private index = -1;
  private active = false;

  get isActive() {
    return this.active;
  }

  start(lines: DialogueLine[], onEnd?: () => void) {
    if (!lines.length) return;
    this.lines = lines;
    this.index = 0;
    this.active = true;
    this.endCb = onEnd;
    EventBus.emit("ui:dialogue:start", { line: this.lines[0] });
  }

  private endCb?: () => void;

  advance() {
    if (!this.active) return false;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.active = false;
      EventBus.emit("ui:dialogue:end", {});
      this.endCb?.();
      return true;
    }
    EventBus.emit("ui:dialogue:line", { line: this.lines[this.index] });
    return true;
  }
}
