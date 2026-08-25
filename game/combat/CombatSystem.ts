import * as Phaser from "phaser";
import { EventBus } from "@/game/EventBus";
import type { Enemy } from "@/game/entities/Enemy";
import { playerDamage } from "@/lib/game/combatMath";

export class CombatSystem {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private slashTex = "fx_slash";
  private lastAttack = 0;
  private attackCooldownMs = 420;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  register(enemy: Enemy) {
    this.enemies.push(enemy);
  }

  get all() {
    return this.enemies;
  }

  tryAttack(player: Phaser.Physics.Arcade.Sprite, dir: { x: number; y: number }, basePower: number): void {
    const t = this.scene.time.now;
    if (t - this.lastAttack < this.attackCooldownMs) return;
    this.lastAttack = t;

    const angle = Math.atan2(dir.y, dir.x);
    const reach = 46;
    const cx = player.x + Math.cos(angle) * 22;
    const cy = player.y + Math.sin(angle) * 22;

    if (this.scene.textures.exists(this.slashTex)) {
      const slash = this.scene.add
        .image(cx, cy, this.slashTex)
        .setRotation(angle + Math.PI / 4)
        .setDepth(player.depth + 5)
        .setAlpha(0.95);
      this.scene.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 1.25,
        duration: 160,
        onComplete: () => slash.destroy(),
      });
    }

    const dmg = playerDamage(basePower);
    let hitAny = false;
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d <= reach) {
        e.hurt(dmg, player.x);
        hitAny = true;
      }
    }
    EventBus.emit("combat:attack", { hit: hitAny, damage: dmg });
  }
}
