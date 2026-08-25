import { Physics, type Scene } from "phaser";

export type Dir = "south" | "north" | "east" | "west";

export class Player extends Physics.Arcade.Sprite {
  speed = 140;
  private dir: Dir = "south";
  private walkAnims: Partial<Record<Dir, string>> = {};
  private idleFrames: Partial<Record<Dir, string>> = {};

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, "player_south");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body!.setSize(20, 16).setOffset(14, 30);
    this.setDepth(10);
    this.setName("player");

    for (const d of ["south", "north", "east", "west"] as Dir[]) {
      if (scene.anims.exists(`anim_player_walk_${d}`)) {
        this.walkAnims[d] = `anim_player_walk_${d}`;
      }
      const tex = `player_${d}`;
      if (scene.textures.exists(tex)) this.idleFrames[d] = tex;
    }
    this.playIdle();
  }

  private playIdle() {
    this.anims.stop();
    if (this.idleFrames[this.dir]) this.setTexture(this.idleFrames[this.dir]!);
  }

  move(dx: number, dy: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dx * this.speed, dy * this.speed);

    if (dx === 0 && dy === 0) {
      if (this.walkAnims[this.dir] && this.anims.isPlaying) this.playIdle();
      else if (!this.walkAnims[this.dir]) this.playIdle();
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? "east" : "west";
    else if (dy !== 0) this.dir = dy > 0 ? "south" : "north";

    const anim = this.walkAnims[this.dir];
    if (anim) {
      if (this.anims.currentAnim?.key !== anim || !this.anims.isPlaying) this.play(anim);
    } else {
      this.setTexture(`player_${this.dir}`);
    }
  }
}
