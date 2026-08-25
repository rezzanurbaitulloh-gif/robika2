import * as Phaser from "phaser";
import { EventBus } from "@/game/EventBus";

export interface EnemyDef {
  id: string;
  name: string;
  texture: string;
  frame_size: number;
  hp: number;
  damage: number;
  speed: number;
  aggro_radius: number;
  attack_radius: number;
  attack_cooldown_ms: number;
  xp: number;
  credits: number;
  respawn_ms: number;
  body_offset: { w: number; h: number; ox: number; oy: number };
}

type Mode = "idle" | "chase" | "attack" | "dead";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyDef;
  private mode: Mode = "idle";
  private hp: number;
  private homeX: number;
  private homeY: number;
  private wanderTarget?: Phaser.Math.Vector2;
  private attackCd = 0;
  private respawnAt = 0;
  private hpBar?: Phaser.GameObjects.Graphics;
  private hurtUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, def.texture);
    this.def = def;
    this.hp = def.hp;
    this.homeX = x;
    this.homeY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setSize(def.body_offset.w, def.body_offset.h).setOffset(def.body_offset.ox, def.body_offset.oy);
    this.setDepth(y);
    this.hpBar = scene.add.graphics().setDepth(y + 1);
    this.drawHpBar();
  }

  private drawHpBar() {
    if (!this.hpBar) return;
    this.hpBar.clear();
    if (this.mode === "dead" || this.hp >= this.def.hp) return;
    const w = this.def.frame_size * 0.7;
    const x = this.x - w / 2;
    const y = this.y - this.def.frame_size * 0.55;
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 5);
    this.hpBar.fillStyle(0xef4444, 1).fillRect(x, y, (w * this.hp) / this.def.hp, 3);
  }

  get isDead() {
    return this.mode === "dead";
  }

  get position() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  hurt(dmg: number, fromX: number): boolean {
    if (this.mode === "dead") return false;
    this.hp -= dmg;
    this.hurtUntil = this.scene.time.now + 120;
    this.setTint(0xff8888);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const away = new Phaser.Math.Vector2(this.x - fromX, 0)
      .normalize()
      .scale(90);
    body.setVelocity(away.x, body.velocity.y - 40);
    this.scene.time.delayedCall(140, () => {
      if (this.mode !== "dead") {
        body.setVelocity(0, 0);
        this.clearTint();
      }
    });
    if (this.hp <= 0) this.die();
    this.drawHpBar();
    return true;
  }

  private die() {
    this.mode = "dead";
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.hpBar?.clear();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 90,
      scale: 0.7,
      duration: 350,
      onComplete: () => this.setVisible(false),
    });
    this.respawnAt = this.scene.time.now + this.def.respawn_ms;
    EventBus.emit("enemy:defeated", {
      enemyId: this.def.id,
      name: this.def.name,
      xp: this.def.xp,
      credits: this.def.credits,
    });
  }

  private respawn() {
    this.hp = this.def.hp;
    this.mode = "idle";
    this.setPosition(this.homeX, this.homeY);
    this.setVisible(true);
    this.setAlpha(1);
    this.setAngle(0);
    this.setScale(1);
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    this.drawHpBar();
  }

  update(playerX: number, playerY: number, playerInvuln: boolean, onHitPlayer: (dmg: number) => void) {
    if (this.mode === "dead") {
      if (this.scene.time.now >= this.respawnAt) this.respawn();
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const t = this.scene.time.now;

    if (this.hurtUntil && t > this.hurtUntil) {
      this.clearTint();
      this.hurtUntil = 0;
    }

    if (dist < this.def.attack_radius) {
      this.mode = "attack";
      body.setVelocity(0, 0);
      if (t >= this.attackCd && !playerInvuln) {
        this.attackCd = t + this.def.attack_cooldown_ms;
        onHitPlayer(this.def.damage);
      }
    } else if (dist < this.def.aggro_radius) {
      this.mode = "chase";
      this.scene.physics.moveTo(this, playerX, playerY, this.def.speed);
    } else {
      this.mode = "idle";
      if (!this.wanderTarget || Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y) < 8) {
        this.wanderTarget = new Phaser.Math.Vector2(
          this.homeX + Phaser.Math.Between(-40, 40),
          this.homeY + Phaser.Math.Between(-40, 40)
        );
      }
      this.scene.physics.moveTo(this, this.wanderTarget.x, this.wanderTarget.y, this.def.speed * 0.4);
    }

    this.setDepth(this.y);
    this.hpBar?.setDepth(this.y + 1);
    this.drawHpBar();
  }
}
