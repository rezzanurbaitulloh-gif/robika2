import { Scene } from "phaser";
import { EventBus } from "@/game/EventBus";
import { ASSET_MANIFEST_URL, type AssetManifest } from "@/game/data/assetTypes";
import { t } from "@/lib/i18n";

export class BootScene extends Scene {
  private manifest!: AssetManifest;

  constructor() {
    super("BootScene");
  }

  preload() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d1b1e");

    // S56 — loading in-world: mascot pixel + judul region
    const mascotX = width / 2;
    const mascotY = height / 2 + 46;
    const body = this.add.rectangle(mascotX, mascotY, 10, 14, 0x2f8f4a);
    const head = this.add.rectangle(mascotX, mascotY - 11, 9, 8, 0x34d399);
    const hood = this.add.rectangle(mascotX, mascotY - 15, 11, 4, 0x1f7a55);
    const legL = this.add.rectangle(mascotX - 3, mascotY + 9, 3, 5, 0x5a3a2a);
    const legR = this.add.rectangle(mascotX + 3, mascotY + 9, 3, 5, 0x5a3a2a);
    this.tweens.add({
      targets: [legL, legR],
      scaleX: { from: 1, to: 0.4 },
      duration: 260,
      yoyo: true,
      repeat: -1,
      onYoyo: (tw) => { void tw; },
    });
    void body; void head; void hood;

    const barW = width * 0.6;
    const bar = this.add.rectangle(width / 2, height / 2, 2, 8, 0x34d399).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2, barW, 10, 0x12262b).setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 52, t("world.boot_valley.name"), {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#34d399",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 28, t("loading.world"), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#a7f3d0",
      })
      .setOrigin(0.5);

    this.load.on("progress", (v: number) => {
      bar.width = Math.max(2, barW * v);
    });
    this.load.on("loaderror", (file: { key: string; url: string }) => {
      console.error("[Boot] gagal muat aset:", file.key, file.url);
    });

    // Loader-driven: Phaser menunggu file ini selesai sebelum create()
    this.load.json("asset_manifest", ASSET_MANIFEST_URL);
  }

  create() {
    const raw = this.cache.json.get("asset_manifest") as AssetManifest | null;
    if (!raw) {
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, t("loading.manifestFail"), {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#f87171",
          align: "center",
        })
        .setOrigin(0.5);
      EventBus.emit("game.bootFailed", {});
      return;
    }
    this.manifest = raw;

    for (const [key, img] of Object.entries(this.manifest.images ?? {})) {
      if (!this.textures.exists(key)) this.load.image(key, img.url);
    }
    for (const [key, sheet] of Object.entries(this.manifest.spritesheets ?? {})) {
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, sheet.url, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      }
    }

    this.load.once("complete", () => {
      for (const [key, sheet] of Object.entries(this.manifest.spritesheets ?? {})) {
        const label = `anim_${key}`;
        if (this.anims.exists(label)) continue;
        const total = this.textures.get(key).frameTotal - 1; // minus __BASE
        if (total <= 0) continue;
        this.anims.create({
          key: label,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: total - 1 }),
          frameRate: sheet.fps ?? 8,
          repeat: sheet.repeat,
        });
      }
      this.registry.set("manifest", this.manifest);
      EventBus.emit("game.booted", { scene: "BootScene" });
      this.scene.start("TitleScene", {});
    });

    this.load.start();
  }
}
