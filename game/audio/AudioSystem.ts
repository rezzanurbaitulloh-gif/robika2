import { EventBus } from "@/game/EventBus";

/**
 * D21/§12 — AudioSystem: BGM + SFX via WebAudio synth prosedural
 * (nol aset, offline-native, gaya chiptune pixel). Volume per-bus
 * dikontrol dari /settings dan dipersistenkan.
 */

export type Cue =
  | "ui.click"
  | "attack"
  | "hit.enemy"
  | "hit.player"
  | "enemy.die"
  | "quest.accept"
  | "quest.complete"
  | "levelup"
  | "code.run"
  | "code.success"
  | "code.error"
  | "gate.open"
  | "coin"
  | "save";

interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}

const SETTINGS_KEY = "robika.audio";

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private settings: AudioSettings = { master: 0.8, music: 0.5, sfx: 0.7 };
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private bound = false;

  constructor() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...this.settings, ...(JSON.parse(raw) as AudioSettings) };
    } catch {}
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
    if (!this.bound) {
      this.bindEvents();
      this.bound = true;
    }
  }

  setVolumes(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.applyVolumes();
  }

  getVolumes(): AudioSettings {
    return { ...this.settings };
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.settings.master;
    this.musicBus.gain.value = this.settings.music * 0.5;
    this.sfxBus.gain.value = this.settings.sfx;
  }

  /** Nada chiptune sederhana. */
  private tone(freq: number, durMs: number, type: OscillatorType = "square", bus: GainNode = this.sfxBus, vol = 0.25, slideTo?: number): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + durMs / 1000);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durMs / 1000);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.02);
  }

  play(cue: Cue): void {
    if (!this.ctx) return;
    switch (cue) {
      case "ui.click": this.tone(660, 60, "square", this.sfxBus, 0.15); break;
      case "attack": this.tone(880, 90, "sawtooth", this.sfxBus, 0.2, 220); break;
      case "hit.enemy": this.tone(200, 120, "square", this.sfxBus, 0.25, 80); break;
      case "hit.player": this.tone(140, 180, "sawtooth", this.sfxBus, 0.3, 60); break;
      case "enemy.die": this.tone(300, 250, "square", this.sfxBus, 0.25, 50); break;
      case "quest.accept": [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 120), i * 90)); break;
      case "quest.complete": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 150), i * 110)); break;
      case "levelup": [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 140, "triangle"), i * 90)); break;
      case "code.run": this.tone(440, 80, "triangle", this.sfxBus, 0.15, 660); break;
      case "code.success": [659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 110, "triangle"), i * 80)); break;
      case "code.error": this.tone(180, 200, "sawtooth", this.sfxBus, 0.2, 90); break;
      case "gate.open": [262, 330, 392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 130), i * 100)); break;
      case "coin": this.tone(988, 70, "square", this.sfxBus, 0.18, 1319); break;
      case "save": this.tone(523, 70, "triangle", this.sfxBus, 0.1, 784); break;
    }
  }

  /** BGM hub: arpeggio pentatonik loop sederhana. */
  startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    const scale = [196.0, 233.08, 261.63, 293.66, 349.23, 392.0];
    const pattern = [0, 2, 4, 5, 4, 2, 3, 1];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.settings.music === 0) return;
      const n = pattern[this.step % pattern.length];
      this.tone(scale[n], 280, "triangle", this.musicBus, 0.22);
      if (this.step % 4 === 0) this.tone(scale[0] / 2, 300, "sine", this.musicBus, 0.3);
      this.step += 1;
    }, 340);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Sambungkan event engine -> cue. */
  private bindEvents(): void {
    EventBus.on("input:attack", () => this.play("attack"));
    EventBus.on("combat:attack", (p) => {
      if ((p as { hit: boolean }).hit) this.play("hit.enemy");
    });
    EventBus.on("enemy:defeated", () => this.play("enemy.die"));
    EventBus.on("ui:hp", () => this.play("hit.player"));
    EventBus.on("quest:updated", (p) => {
      const q = p as { state: string };
      if (q.state === "active") this.play("quest.accept");
      if (q.state === "completed") this.play("quest.complete");
    });
    EventBus.on("ui:levelup", () => this.play("levelup"));
    EventBus.on("ui:terminal:open", () => this.play("ui.click"));
    EventBus.on("code:run", () => this.play("code.run"));
    EventBus.on("code:result", (p) => this.play((p as { status: string }).status === "success" ? "code.success" : "code.error"));
    EventBus.on("world:gateOpened", () => this.play("gate.open"));
    EventBus.on("game:saved", () => this.play("save"));
  }
}

export const audio = new AudioSystem();
