import { Scene } from "phaser";
import { EventBus } from "@/game/EventBus";

export class BootScene extends Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d1b1e");

    this.add
      .text(width / 2, height / 2 - 24, "ROBIKA", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#34d399",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 24, "Phase 0 — Foundation online. Aetheria awakens in Phase 1.", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#a7f3d0",
      })
      .setOrigin(0.5);

    EventBus.emit("game.booted", { scene: "BootScene" });
  }
}
