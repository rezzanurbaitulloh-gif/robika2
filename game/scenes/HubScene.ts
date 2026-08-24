import Phaser from "phaser";
import { EventBus } from "@/game/EventBus";
import { worlds, dialogues } from "@/game/data/ContentRegistry";
import type { AssetManifest } from "@/game/data/assetTypes";
import { Player } from "@/game/entities/Player";
import { DialogueRunner } from "@/game/dialogue/DialogueRunner";
import { InteractionSystem, type Interactable } from "@/game/systems/InteractionSystem";
import { SaveSystem } from "@/game/systems/SaveSystem";
import { touch } from "@/lib/game/touchInput";

interface HubData {
  worldId: string;
  manifest?: AssetManifest;
}

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private runner = new DialogueRunner();
  private interactions!: InteractionSystem;
  private saves!: SaveSystem;
  private flags: Record<string, unknown> = {};
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private tileIdx = { grass: 0, grass_alt: 0, path: 1 };
  private worldId = "boot_valley";

  constructor() {
    super("HubScene");
  }

  create(data: HubData) {
    const world = worlds[data.worldId];
    if (!world) return;
    this.worldId = data.worldId;
    const TS = world.tile_size;

    this.saves = new SaveSystem(world.id);
    this.runner = new DialogueRunner();
    this.interactions = new InteractionSystem(this, this.runner);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyE = this.input.keyboard!.addKey("E");
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.runner?.isActive) EventBus.emit("input:interact");
    });

    if ((data.manifest ?? this.registry.get("manifest"))?.tiles) {
      const tiles = (data.manifest ?? (this.registry.get("manifest") as AssetManifest))!.tiles!;
      this.tileIdx.grass = tiles.grass ?? 0;
      this.tileIdx.grass_alt = tiles.grass_alt ?? 0;
      this.tileIdx.path = tiles.path ?? 1;
    }

    // ---- Ground + solids ----
    const rows = world.rows;
    const mapW = rows[0].length * TS;
    const mapH = rows.length * TS;

    const groundLayer = this.make.tilemap({
      tileWidth: TS,
      tileHeight: TS,
      width: rows[0].length,
      height: rows.length,
    });
    let tileset: Phaser.Tilemaps.Tileset | null = null;
    if (this.textures.exists("tiles_boot_valley")) {
      tileset = groundLayer.addTilesetImage("tiles_boot_valley", "tiles_boot_valley", TS, TS, 0, 0)!;
    }
    let layer: Phaser.Tilemaps.TilemapLayer | null = null;
    if (tileset) {
      layer = groundLayer.createBlankLayer("ground", tileset)!;
      layer.setDepth(-10);
    }

    const solids = this.physics.add.staticGroup();

    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const kind = world.legend[rows[y][x]] ?? "grass";
        const px = x * TS + TS / 2;
        const py = y * TS + TS / 2;

        if (layer) {
          if (kind === "path") {
            layer.putTileAt(this.pathTileAt(rows, x, y), x, y);
          } else if (kind === "grass_alt") layer.putTileAt(this.tileIdx.grass_alt, x, y);
          else layer.putTileAt(this.tileIdx.grass, x, y);
        }

        if (!world.solid.includes(kind)) continue;

        if (kind === "tree" && this.textures.exists("prop_tree")) {
          this.add.image(px, py + 8, "prop_tree").setOrigin(0.5, 1).setDepth(py + 16);
        }
        const rect = this.add.rectangle(px, py - 4, TS - 6, 20);
        solids.add(rect);
      }
    }

    // ---- NPC ----
    const npcSpawn = world.spawns["npc_engineer_mira"];
    if (npcSpawn && this.textures.exists("npc_mira_south")) {
      const nx = npcSpawn.x * TS + TS / 2;
      const ny = npcSpawn.y * TS + TS / 2;
      this.add.image(nx, ny, "npc_mira_south").setOrigin(0.5, 0.9).setDepth(ny).setName("npc_mira");

      const dlg = dialogues["npc_engineer_mira"];
      const mira: Interactable = {
        id: "npc_engineer_mira",
        kind: "npc",
        x: nx,
        y: ny,
        radius: 1.7 * TS,
        lines: [],
        resolveLines: () => {
          if (!dlg) return [];
          const treeName =
            this.flags["met_mira"] === true ? "repeat" : dlg.default_tree;
          return dlg.trees[treeName] ?? [];
        },
        onDialogueEnd: () => {
          this.flags["met_mira"] = true;
          this.persistSave();
        },
      };
      this.interactions.register(mira);
    }

    // ---- Sign ----
    const signSpawn = world.spawns["sign_post"];
    const signDef = world.interactables.find((i) => i.id === "sign_post");
    if (signSpawn && signDef && this.textures.exists("prop_sign")) {
      const sx = signSpawn.x * TS + TS / 2;
      const sy = signSpawn.y * TS + TS / 2;
      this.add.image(sx, sy + 10, "prop_sign").setOrigin(0.5, 1).setDepth(sy).setName("sign_post");
      this.interactions.register({
        id: "sign_post",
        kind: "sign",
        x: sx,
        y: sy,
        radius: (signDef.radius_tiles ?? 1.4) * TS,
        lines: signDef.lines ?? [],
      });
    }

    // ---- Player ----
    this.player = new Player(this, -999, -999);
    this.physics.add.collider(this.player, solids);

    // ---- Camera ----
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    const zoom = Math.min(2, Math.max(1, window.innerWidth / 720));
    this.cameras.main.setZoom(zoom);

    void this.spawnFromSave(world, TS);
  }

  private pathTileAt(rows: string[], x: number, y: number): number {
    const world = worlds[this.worldId];
    const walkable = (xx: number, yy: number): boolean => {
      if (yy < 0 || yy >= rows.length || xx < 0 || xx >= rows[yy].length) return true;
      const k = world.legend[rows[yy][xx]] ?? "grass";
      return k !== "path" && !world.solid.includes(k);
    };
    // atlas: 0 grass · 1 path center · 2 edge_n · 3 edge_s · 4 edge_e · 5 edge_w
    if (walkable(x, y - 1)) return 2;
    if (walkable(x, y + 1)) return 3;
    if (walkable(x + 1, y)) return 4;
    if (walkable(x - 1, y)) return 5;
    return this.tileIdx.path;
  }

  private async spawnFromSave(world: (typeof worlds)[string], TS: number) {
    const save = await this.saves.load();
    const sp = world.spawns["player_default"] ?? { x: 5, y: 5 };
    const px = (save?.position?.x as number) ?? sp.x * TS + TS / 2;
    const py = (save?.position?.y as number) ?? sp.y * TS + TS / 2;
    this.flags = (save?.state as Record<string, unknown>) ?? {};
    this.player.setPosition(px, py);
    this.persistSave();
  }

  private persistSave() {
    if (!this.player || this.player.x < 0) return;
    this.saves.save("HubScene", { x: this.player.x, y: this.player.y }, this.flags);
  }

  update() {
    if (!this.player || !this.cursors || this.player.x < 0) return;

    const locked = this.runner.isActive;
    if (!locked) {
      let dx = touch.dx;
      let dy = touch.dy;
      if (this.cursors.left.isDown) dx = -1;
      else if (this.cursors.right.isDown) dx = 1;
      if (this.cursors.up.isDown) dy = -1;
      else if (this.cursors.down.isDown) dy = 1;
      const v = new Phaser.Math.Vector2(dx, dy);
      if (v.lengthSq() > 1) v.normalize();
      this.player.move(v.x, v.y);

      if (Phaser.Input.Keyboard.JustDown(this.keyE)) EventBus.emit("input:interact");
    } else {
      this.player.move(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) EventBus.emit("input:interact");
    }

    this.interactions.update(this.player.x, this.player.y);
  }
}
