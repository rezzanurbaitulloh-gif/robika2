import { Scene } from "phaser";
import { EventBus } from "@/game/EventBus";
import { ASSET_MANIFEST_URL, type AssetManifest } from "@/game/data/assetTypes";

export class BootScene extends Scene {
  private manifest!: AssetManifest;

  constructor() {
    super("BootScene");
  }

  preload() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d1b1e");

    const barW = width * 0.6;
    const bar = this.add.rectangle(width / 2, height / 2, 2, 8, 0x34d399).setOrigin(0.5);
    const track = this.add.rectangle(width / 2, height / 2, barW, 10, 0x12262b).setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 28, "Memuat Aetheria…", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#a7f3d0",
      })
      .setOrigin(0.5);

    this.load.on("progress", (v: number) => bar.width = Math.max(2, barW * v));
    void track;

    fetch(ASSET_MANIFEST_URL)
      .then((r) => r.json())
      .then((manifest: AssetManifest) => {
        this.manifest = manifest;
        for (const [key, img] of Object.entries(manifest.images ?? {})) {
          this.load.image(key, img.url);
        }
        for (const [key, sheet] of Object.entries(manifest.spritesheets ?? {})) {
          this.load.spritesheet(key, sheet.url, {
            frameWidth: sheet.frameWidth,
            frameHeight: sheet.frameHeight,
          });
        }
        this.load.start();
      })
      .catch(() => EventBus.emit("game.bootFailed", {}));
  }

  create() {
    for (const [key, sheet] of Object.entries(this.manifest.spritesheets ?? {})) {
      const label = `anim_${key}`;
      if (this.anims.exists(label)) continue;
      this.anims.create({
        key: label,
        frames: this.anims.generateFrameNumbers(key, {
          start: 0,
          end: Math.max(0, (this.textures.get(key).frameTotal - 2)),
        }),
        frameRate: sheet.fps ?? 8,
        repeat: sheet.repeat,
      });
    }
    EventBus.emit("game.booted", { scene: "BootScene" });
    this.registry.set("manifest", this.manifest);
    this.scene.start("HubScene", { worldId: "boot_valley" });
  }
}
