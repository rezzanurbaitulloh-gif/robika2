import { EventBus } from "@/game/EventBus";

export interface DialogueLine {
  speaker: string;
  text: string;
  portrait?: string;
}

export interface DialogueChoice {
  text: string;
  set_flag?: string;
  extra_lines?: string[];
}

export interface DialogueConfig {
  lines: DialogueLine[];
  portrait?: string;
  choiceAt?: number;
  choices?: Array<{ text: string; set_flag?: string; extra_keys?: string[] }>;
  onFlag?: (flag: string) => void;
}

export class DialogueRunner {
  private lines: DialogueLine[] = [];
  private index = -1;
  private active = false;
  private config: DialogueConfig | null = null;
  private extraQueue: DialogueLine[] = [];

  get isActive() {
    return this.active;
  }

  start(lines: DialogueLine[], onEnd?: () => void) {
    this.startConfig({ lines }, onEnd);
    if (!this.bound) {
      this.bound = true;
      EventBus.on("ui:dialogue:applyChoice", (p) => {
        if (this.active) this.pickChoice(p as { text: string; set_flag?: string; extra_keys?: string[] });
      });
    }
  }

  private bound = false;

  startConfig(config: DialogueConfig, onEnd?: () => void) {
    if (!config.lines.length) return;
    this.config = config;
    this.lines = config.lines;
    this.index = 0;
    this.active = true;
    this.endCb = onEnd;
    EventBus.emit("ui:dialogue:start", {
      line: this.lines[0],
      portrait: config.portrait,
    });
    this.maybeChoices();
  }

  private endCb?: () => void;

  private maybeChoices() {
    if (!this.config?.choices || this.config.choiceAt === undefined) return;
    if (this.index === this.config.choiceAt) {
      EventBus.emit("ui:dialogue:choices", {
        prompt: this.config.lines[this.index],
        options: this.config.choices,
      });
    }
  }

  pickChoice(option: { text: string; set_flag?: string; extra_keys?: string[] }): void {
    if (option.set_flag) this.config?.onFlag?.(option.set_flag);
    if (option.extra_keys?.length) {
      this.extraQueue = option.extra_keys.map((k) => ({
        speaker: this.lines[this.index]?.speaker ?? "NPC",
        text: k,
      }));
    }
    EventBus.emit("ui:dialogue:choices:close", {});
    this.advance();
  }

  advance() {
    if (!this.active) return false;
    this.index += 1;
    if (this.index < this.lines.length) {
      EventBus.emit("ui:dialogue:line", {
        line: this.lines[this.index],
        portrait: this.config?.portrait,
      });
      this.maybeChoices();
      return true;
    }
    if (this.extraQueue.length) {
      const next = this.extraQueue.shift()!;
      EventBus.emit("ui:dialogue:line", { line: { speaker: next.speaker, text: t(next.text) }, portrait: this.config?.portrait });
      this.extraQueue = [];
      return true;
    }
    this.active = false;
    EventBus.emit("ui:dialogue:end", {});
    this.endCb?.();
    return true;
  }
}

import { t } from "@/lib/i18n";
