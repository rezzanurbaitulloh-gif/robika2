import { Scene } from "phaser";
import { EventBus } from "@/game/EventBus";
import { t } from "@/lib/i18n";
import { audio } from "@/game/audio/AudioSystem";

/** §68 — Title/lobi: Lanjutkan / Petualangan Baru / Akademi / Pengaturan. */
export class TitleScene extends Scene {
  private hasSave = false;
  private items: Array<{ key: string; action: () => void; locked?: boolean }> = [];
  private selected = 0;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d1b1e");
    audio.unlock();
    audio.startMusic();

    this.add
      .text(width / 2, height * 0.28, "ROBIKA", {
        fontFamily: "monospace",
        fontSize: "64px",
        color: "#34d399",
      })
      .setOrigin(0.5)
      .setShadow(4, 4, "#064e3b", 0);
    this.add
      .text(width / 2, height * 0.28 + 52, t("title.tagline"), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#a7f3d0",
      })
      .setOrigin(0.5);

    void this.buildMenu(width, height);

    EventBus.on("input:confirm", this.boundConfirm);
    EventBus.on("input:menu:up", this.boundUp);
    EventBus.on("input:menu:down", this.boundDown);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.labels.forEach((l, i) => {
        if (l.getBounds().contains(pointer.x, pointer.y)) this.select(i);
      });
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      this.labels.forEach((l, i) => {
        if (l.getBounds().contains(pointer.x, pointer.y)) {
          this.select(i);
          this.activate();
        }
      });
    });

    // cek save untuk label Lanjutkan
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("saves").select("id").eq("user_id", user.id).limit(1);
        if (data && data.length > 0 && !this.hasSave) {
          this.hasSave = true;
          this.items[0].key = "title.continue";
          this.renderMenu(width, height);
        }
      } catch {}
    })();

    EventBus.emit("game.booted", { scene: "TitleScene" });
  }

  private async buildMenu(width: number, height: number) {
    // item default sinkron — menu selalu bisa diaktifkan sejak frame pertama
    this.items = [
      { key: this.hasSave ? "title.continue" : "title.play", action: () => this.startGame() },
      { key: "title.academy", action: () => this.openPage("/academy") },
      { key: "title.vault", action: () => this.openPage("/vault") },
      { key: "title.shop", action: () => this.openPage("/shop") },
      { key: "title.gacha", action: () => this.openPage("/gacha") },
      { key: "title.settings", action: () => this.openSettings() },
    ];
    this.renderMenu(width, height);

    // §menu kontekstual: item terkunci muncul sebagai progresi, bukan dashboard
    let flags: Record<string, unknown> = {};
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("saves").select("state").eq("user_id", user.id).limit(1);
        flags = ((data?.[0] as { state?: Record<string, unknown> })?.state) ?? {};
      }
    } catch {}

    this.items = [
      { key: this.hasSave ? "title.continue" : "title.play", action: () => this.startGame() },
      { key: "title.academy", action: () => this.openPage("/academy") },
      { key: "menu.codelab.locked", action: () => {}, locked: !flags["terminal_used"] },
      { key: "title.vault", action: () => this.openPage("/vault") },
      { key: "title.shop", action: () => this.openPage("/shop") },
      { key: "title.gacha", action: () => this.openPage("/gacha") },
      { key: "title.settings", action: () => this.openSettings() },
    ];
    this.renderMenu(width, height);
  }

  private boundConfirm = () => this.activate();
  private boundUp = () => this.move(-1);
  private boundDown = () => this.move(1);

  private renderMenu(width: number, height: number) {
    this.labels.forEach((l) => l.destroy());
    this.labels = this.items.map((item, i) => {
      const locked = item.locked === true;
      const prefix = locked ? "🔒 " : i === this.selected ? "▸ " : "";
      const suffix = locked ? "" : i === this.selected ? " ◂" : "";
      const label = this.add
        .text(width / 2, height * 0.52 + i * 44, prefix + t(item.key) + suffix, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: locked ? "#3f5f56" : i === this.selected ? "#34d399" : "#6ee7b7",
        })
        .setOrigin(0.5);
      return label;
    });
  }

  private select(i: number) {
    const next = Math.max(0, Math.min(this.items.length - 1, i));
    if (next !== this.selected) {
      this.selected = next;
      this.renderMenu(this.scale.width, this.scale.height);
      audio.play("ui.click");
    }
  }

  private move(d: number) {
    this.select(this.selected + d);
  }

  private activate() {
    const item = this.items[this.selected];
    if (!item || item.locked) {
      audio.play("ui.click");
      return;
    }
    audio.play("ui.click");
    item.action();
  }

  private startGame() {
    audio.stopMusic();
    this.scene.start("HubScene", { worldId: "boot_valley" });
  }

  private openPage(path: string) {
    window.location.href = path;
  }

  private openSettings() {
    EventBus.emit("ui:settings:open", {});
  }
}
