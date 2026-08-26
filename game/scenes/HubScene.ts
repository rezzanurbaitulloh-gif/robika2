import * as Phaser from "phaser";
import { EventBus } from "@/game/EventBus";
import { worlds, dialogues, enemies, quests } from "@/game/data/ContentRegistry";
import type { AssetManifest } from "@/game/data/assetTypes";
import type { WorldDef } from "@/game/data/ContentRegistry";
import { Player } from "@/game/entities/Player";
import { Enemy } from "@/game/entities/Enemy";
import { CombatSystem } from "@/game/combat/CombatSystem";
import { DialogueRunner, type DialogueConfig } from "@/game/dialogue/DialogueRunner";
import { InteractionSystem, type Interactable } from "@/game/systems/InteractionSystem";
import { SaveSystem } from "@/game/systems/SaveSystem";
import { QuestEngine } from "@/game/quests/QuestEngine";
import { touch } from "@/lib/game/touchInput";
import { keyboardState } from "@/lib/game/keyboardInput";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { ChallengeDef } from "@/lib/coding/ChallengeRunner";
import chGatePower from "@/content/challenges/ch_gate_power.json";

interface HubData {
  worldId: string;
  spawn?: string;
}

interface DoorTarget {
  world: string;
  spawn: string;
}

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private runner = new DialogueRunner();
  private interactions!: InteractionSystem;
  private saves!: SaveSystem;
  private flags: Record<string, unknown> = {};
  private keyAttack!: Phaser.Input.Keyboard.Key;
  private tileIdx: Record<string, number> = { grass: 0, grass_alt: 0, path: 1, water: 6, waterEdgeN: 7, waterEdgeS: 8, waterEdgeE: 9, waterEdgeW: 10, edgeN: 2, edgeS: 3, edgeE: 4, edgeW: 5, stone: 0, stone_alt: 1 };
  private worldId = "boot_valley";
  private combat!: CombatSystem;
  private playerHp = 50;
  private playerMaxHp = 50;
  private invulnUntil = 0;
  private energy = 100;
  private energyMax = 100;
  private dashUntil = 0;
  private lastDir: { x: number; y: number } | null = null;
  private questEngine?: QuestEngine;
  private terminalOpen = false;
  private challengeRegistry: Record<string, ChallengeDef> = {};
  private gateRect?: Phaser.GameObjects.Rectangle;
  private gateImage?: Phaser.GameObjects.Image;
  private transitioning = false;

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
    this.keyAttack = this.input.keyboard!.addKey("SPACE");
    this.challengeRegistry = { ch_gate_power: chGatePower as ChallengeDef };
    EventBus.on("world:effect", (p) => this.onWorldEffect(p));
    EventBus.on("combat:damage", (p) => this.spawnDamageNumber(p));
    EventBus.on("enemy:defeated", (p) => {
      void this.onEnemyDefeated(p);
      this.burstParticles((p as { x?: number }).x, (p as { y?: number }).y);
    });

    const manifest = this.registry.get("manifest") as AssetManifest | undefined;
    const worldTiles = manifest?.tiles?.[world.atlas];
    if (worldTiles) {
      this.tileIdx = { ...this.tileIdx, ...(worldTiles as Record<string, number>) };
    }

    const rows = world.rows;
    const mapW = rows[0].length * TS;
    const mapH = rows.length * TS;

    // ---- Ground + solids ----
    const groundLayer = this.make.tilemap({ tileWidth: TS, tileHeight: TS, width: rows[0].length, height: rows.length });
    let tileset: Phaser.Tilemaps.Tileset | null = null;
    if (this.textures.exists(world.atlas)) {
      tileset = groundLayer.addTilesetImage(world.atlas, world.atlas, TS, TS, 0, 0)!;
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
          if (kind === "path") layer.putTileAt(this.pathTileAt(rows, x, y), x, y);
          else if (kind === "water") layer.putTileAt(this.waterTileAt(world, rows, x, y), x, y);
          else if (kind === "grass_alt") layer.putTileAt(this.tileIdx.grass_alt ?? this.tileIdx.grass, x, y);
          else if (kind === "stone_alt") layer.putTileAt(this.tileIdx.stone_alt ?? this.tileIdx.grass, x, y);
          else if (kind === "grass" || kind === "stone") layer.putTileAt(this.tileIdx.grass, x, y);
          // bridge/door/gate: gambar path dasar di bawahnya
          else if (kind === "bridge" || kind === "gate") layer.putTileAt(this.tileIdx.path, x, y);
          else if (kind === "door_dungeon" || kind === "door_base" || kind === "door_hub") layer.putTileAt(this.tileIdx.path, x, y);
          // fallback: semua sel non-void dapat dasar (rumput/batu) agar tak tembus hitam
          else if (kind !== "void") layer.putTileAt(this.tileIdx.grass, x, y);
        }

        if (!world.solid.includes(kind)) continue;
        if (kind === "gate" && this.textures.exists("prop_gate")) {
          this.gateImage = this.add.image(px, py + 12, "prop_gate").setOrigin(0.5, 1).setDepth(py + 16);
          this.gateRect = this.add.rectangle(px, py - 4, TS - 6, 20) as Phaser.GameObjects.Rectangle;
          this.gateRect.setVisible(false);
          solids.add(this.gateRect);
          continue;
        }
        if (kind === "core" && this.textures.exists("prop_gate")) {
          const core = this.add.image(px, py + 12, "prop_gate").setOrigin(0.5, 1).setDepth(py + 16);
          this.tweens.add({ targets: core, alpha: { from: 1, to: 0.55 }, duration: 900, yoyo: true, repeat: -1 });
          const rect = this.add.rectangle(px, py - 4, TS - 6, 20) as Phaser.GameObjects.Rectangle;
          rect.setVisible(false);
          solids.add(rect);
          continue;
        }
        if (kind === "shrine" && this.textures.exists("prop_shrine")) {
          const sh = this.add.image(px, py + 10, "prop_shrine").setOrigin(0.5, 1).setDepth(py);
          this.tweens.add({ targets: sh, y: "-=2", duration: 1200, yoyo: true, repeat: -1 });
          const rect = this.add.rectangle(px, py, TS - 8, 16) as Phaser.GameObjects.Rectangle;
          rect.setVisible(false);
          solids.add(rect);
          continue;
        }
        if (kind === "tree" && this.textures.exists("prop_tree")) {
          const scale = 0.9 + ((x * 7 + y * 13) % 5) * 0.06; // variasi ukuran halus
          this.add.image(px, py + 8, "prop_tree").setOrigin(0.5, 1).setDepth(py + 16).setScale(scale);
        }
        const rect = this.add.rectangle(px, py - 4, TS - 6, 20);
        rect.setVisible(false);
        solids.add(rect);
      }
    }

    // ---- Props ----
    for (const prop of world.props ?? []) {
      if (!this.textures.exists(prop.ref)) continue;
      const px = prop.x * TS + TS / 2;
      const py = prop.y * TS + TS / 2;
      const img = this.add.image(px, py + 10, prop.ref).setOrigin(0.5, 1).setDepth(py + 14);
      if (prop.solid) {
        const rect = this.add.rectangle(px, py, TS - 4, TS - 8) as Phaser.GameObjects.Rectangle;
        rect.setVisible(false);
        solids.add(rect);
      }
      void img;
    }

    // ---- NPCs ----
    for (const npcId of ["npc_engineer_mira", "npc_pak_dengklek", "npc_lulu"]) {
      const sp = world.spawns[npcId];
      const tex = `npc_${npcId.split("_")[1]}_south`;
      if (!sp) continue;
      const textureKey =
        npcId === "npc_engineer_mira" ? "npc_mira_south" : npcId === "npc_pak_dengklek" ? "npc_dengklek_south" : "npc_lulu_south";
      if (!this.textures.exists(textureKey)) continue;
      const nx = sp.x * TS + TS / 2;
      const ny = sp.y * TS + TS / 2;
      const img: Phaser.GameObjects.Image & { play?: (k: string) => unknown } = this.add.sprite(nx, ny, textureKey).setOrigin(0.5, 0.9).setDepth(ny).setName(npcId);
      const idleKey = `anim_npc_idle_${npcId.split("_")[1]}`;
      if (this.anims.exists(idleKey)) {
        img.play?.(idleKey);
      } else {
        this.tweens.add({ targets: img, y: "-=1.5", duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      // S7.3 — NPC wander ringan dalam radius rumah
      this.time.addEvent({
        delay: 2600 + Math.random() * 1800,
        loop: true,
        callback: () => {
          if (this.transitioning) return;
          const tx = nx + Phaser.Math.Between(-1, 1) * TS;
          const ty = ny + Phaser.Math.Between(-1, 1) * TS;
          this.tweens.add({ targets: img, x: tx, y: ty, duration: 900, ease: "Sine.easeInOut" });
        },
      });

      const dlg = dialogues[npcId];
      const def = world.interactables.find((i) => i.id === npcId);
      const interactable: Interactable = {
        id: npcId,
        kind: "npc",
        x: nx,
        y: ny,
        radius: (def?.radius_tiles ?? 1.7) * TS,
        lines: [],
        resolveLines: () => {
          if (!dlg) return [];
          const treeName = this.npcTree(npcId, dlg.default_tree);
          const keys = dlg.trees[treeName] ?? dlg.trees[dlg.default_tree] ?? [];
          const speaker = dlg.speaker ?? "NPC";
          return keys.map((k) => ({ speaker, text: t(k) }));
        },
        onDialogueEnd: () => {
          const tree = this.npcTree(npcId, "first_meeting");
          if (npcId === "npc_engineer_mira") this.questEngine?.onDialogueEnd(tree);
          if (this.flags["met_mira"] !== true) this.flags["met_mira"] = true;
          if (npcId !== "npc_engineer_mira") {
            this.flags[`met_${npcId}`] = true;
          }
          this.persistSave();
        },
        resolveConfig: () => {
          if (!dlg) return null;
          const treeName = this.npcTree(npcId, dlg.default_tree);
          const keys = dlg.trees[treeName] ?? dlg.trees[dlg.default_tree] ?? [];
          const speaker = dlg.speaker ?? "NPC";
          const lines = keys.map((k) => ({ speaker, text: t(k) }));
          const choiceDef = (dlg as unknown as {
            choices?: Record<string, { after_index?: number; prompt_key?: string; options?: Array<{ text_key: string; set_flag?: string; extra_lines?: string[] }> }>;
            portrait?: string;
          }).choices?.[treeName];
          if (!choiceDef?.options) return null;
          return {
            lines,
            portrait: (dlg as unknown as { portrait?: string }).portrait,
            choiceAt: choiceDef.after_index ?? lines.length - 1,
            choices: choiceDef.options.map((o) => ({
              text: t(o.text_key),
              set_flag: o.set_flag,
              extra_keys: o.extra_lines,
            })),
            onFlag: (f: string) => {
              this.flags[f] = true;
              this.persistSave();
            },
          } satisfies DialogueConfig;
        },
      };
      this.interactions.register(interactable);
    }

    // ---- Sign / terminal / doors / shrine / relic ----
    const signSpawn = world.spawns["sign_post"];
    const signDef = world.interactables.find((i) => i.id === "sign_post");
    if (signSpawn && signDef && this.textures.exists("prop_sign")) {
      const sx = signSpawn.x * TS + TS / 2;
      const sy = signSpawn.y * TS + TS / 2;
      this.add.image(sx, sy + 10, "prop_sign").setOrigin(0.5, 1).setDepth(sy).setName("sign_post");
      this.interactions.register({
        id: "sign_post", kind: "sign", x: sx, y: sy, radius: (signDef.radius_tiles ?? 1.4) * TS,
        lines: (signDef.lines_keys ?? []).map((k) => ({ speaker: "Sign", text: t(k) })),
      });
    }

    const termSpawn = world.spawns["gate_bridge"];
    const termDef = world.interactables.find((i) => i.id === "terminal_gate");
    if (termSpawn && termDef && this.textures.exists("prop_terminal")) {
      const kx = termSpawn.x * TS + TS / 2;
      const ky = (termSpawn.y + 2) * TS + TS / 2;
      this.add.image(kx, ky + 10, "prop_terminal").setOrigin(0.5, 1).setDepth(ky).setName("terminal_gate");
      this.interactions.register({
        id: "terminal_gate", kind: "terminal", x: kx, y: ky, radius: (termDef.radius_tiles ?? 1.5) * TS, lines: [],
        onInteract: () => {
          const cid = termDef.challenge_ref ?? "ch_gate_power";
          if (this.challengeRegistry[cid]) {
            this.flags["terminal_used"] = true;
            EventBus.emit("ui:terminal:open", { challengeId: cid });
          }
        },
      });
    }

    for (const def of world.interactables) {
      if (!["door", "shrine", "relic"].includes(def.kind)) continue;
      const sp = def.kind === "relic" ? def.props_at : world.spawns[def.id];
      if (!sp) continue;
      const dx = sp.x * TS + TS / 2;
      const dy = sp.y * TS + TS / 2;
      this.interactions.register({
        id: def.id, kind: def.kind, x: dx, y: dy, radius: (def.radius_tiles ?? 1.4) * TS, lines: [],
        onInteract: () => this.onSpecialInteract(def),
      });
    }

    // ---- Enemies ----
    this.combat = new CombatSystem(this);
    for (const es of world.enemy_spawns ?? []) {
      const def = enemies[es.def];
      if (!def || !this.textures.exists(def.texture)) continue;
      const e = new Enemy(this, es.x * TS + TS / 2, es.y * TS + TS / 2, def);
      this.physics.add.collider(e, solids);
      this.physics.add.collider(e, this.player);
      this.combat.register(e);
    }
    EventBus.on("input:attack", () => {
      if (this.runner.isActive || this.terminalOpen || !this.player || this.transitioning) return;
      const dir = this.lastDir ?? { x: 0, y: 1 };
      this.combat.tryAttack(this.player, dir, 5);
    });
    EventBus.on("input:dodge", () => this.tryDodge());

    // ---- Quest ----
    const qdef = quests["q_boot_01_darkened_bridge"];
    if (qdef) {
      this.questEngine = new QuestEngine(qdef, this.flags, () => this.persistSave());
    }

    // ---- Player ----
    this.player = new Player(this, -999, -999);
    this.physics.add.collider(this.player, solids);
    this.physics.add.collider(this.player, this.player);

    // ---- Camera ----
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    const zoom = Math.min(2, Math.max(1, window.innerWidth / 720));
    this.cameras.main.setZoom(zoom);
    this.cameras.main.fadeIn(500, 13, 27, 30);

    void this.spawnPlayer(world, TS, data.spawn);
    EventBus.emit("world:entering", {});
  }

  private npcTree(npcId: string, defaultTree: string): string {
    if (npcId === "npc_engineer_mira" && this.questEngine) return this.questEngine.miraTree();
    return this.flags[`met_${npcId}`] === true ? "repeat" : defaultTree;
  }

  private async onSpecialInteract(def: {
    id: string; kind: string; target?: DoorTarget; lines_keys?: string[]; credits?: number; idem?: string; target_url?: string;
  }) {
    if (def.kind === "door" && def.target) {
      await this.transitionTo(def.target.world, def.target.spawn);
      return;
    }
    if (def.kind === "shrine") {
      this.playerHp = this.playerMaxHp;
      EventBus.emit("ui:hp", { hp: this.playerHp, max: this.playerMaxHp });
      this.persistSave();
      EventBus.emit("ui:toast", { text: t("toast.shrine") });
      return;
    }
    if (def.kind === "portal" && def.target_url) {
      window.location.href = def.target_url;
      return;
    }
    if (def.kind === "relic" && this.flags[def.id] !== true) {
      this.flags[def.id] = true;
      try {
        const supabase = createClient();
        await supabase.rpc("grant_rewards", {
          p_xp: 0, p_credits: def.credits ?? 25, p_reason: "relic",
          p_idem: def.idem ?? `relic:${def.id}`,
        });
      } catch {}
      EventBus.emit("ui:toast", { text: t("toast.relic") });
      EventBus.emit("wallet:refresh", {});
      this.persistSave();
    }
  }

  private async transitionTo(worldId: string, spawn: string) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(400, 13, 27, 30);
    await new Promise((r) => this.time.delayedCall(420, r));
    this.scene.restart({ worldId, spawn });
  }

  private async spawnPlayer(world: WorldDef, TS: number, spawnKey?: string) {
    const save = await this.saves.load();
    const sameWorld = save && (save as { world_id?: string }).world_id === world.id;
    const sp = spawnKey
      ? world.spawns[spawnKey] ?? world.spawns["player_default"]
      : sameWorld && save?.position
        ? { x: (save.position.x as number) / TS - 0.5, y: (save.position.y as number) / TS - 0.5 }
        : world.spawns["player_default"] ?? { x: 5, y: 5 };
    const px = spawnKey || !sameWorld ? sp.x * TS + TS / 2 : (save!.position.x as number);
    const py = spawnKey || !sameWorld ? sp.y * TS + TS / 2 : (save!.position.y as number);
    const loaded = (save?.state as Record<string, unknown>) ?? {};
    Object.keys(this.flags).forEach((k) => delete this.flags[k]);
    Object.assign(this.flags, loaded);
    this.questEngine = new QuestEngine(
      quests["q_boot_01_darkened_bridge"],
      this.flags,
      () => this.persistSave()
    );
    EventBus.emit("quest:updated", this.questEngine.view());
    this.player.setPosition(px, py);
    if (this.flags["gate_opened"] === true) this.applyGateOpened();
    this.persistSave();
  }

  private applyGateOpened() {
    if (this.gateRect) {
      const body = this.gateRect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) body.enable = false;
      this.gateRect.setVisible(false);
    }
    this.gateImage?.setAlpha(0.2);
  }

  private onWorldEffect(payload: unknown) {
    const { verb, target } = payload as { verb: string; target: string };
    if (verb !== "pulse" || target !== "gate_bridge") return;
    if (!this.gateImage || this.flags["gate_opened"] === true) return;
    this.tweens.add({
      targets: this.gateImage,
      alpha: { from: 1, to: 0.25 },
      duration: 160,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.flags["gate_opened"] = true;
        this.applyGateOpened();
        this.gateImage?.setScale(0.92);
        EventBus.emit("ui:toast", { text: t("gate.opened") });
        EventBus.emit("world:gateOpened", {});
        this.persistSave();
      },
    });
  }

  private async onEnemyDefeated(p: unknown) {
    const { enemyId, name } = p as { enemyId: string; name: string; xp: number; credits: number };
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("record_enemy_kill", { p_enemy_id: enemyId });
      if (error || !data) throw error;
      const g = data as { xp_granted?: number; credits?: number };
      EventBus.emit("ui:toast", {
        text: t("combat.killed", { name, xp: g.xp_granted ?? 0, credits: g.credits ?? 0 }),
      });
      EventBus.emit("wallet:refresh", {});
      void import("@/lib/analytics").then((m) => m.track("enemy_defeated", { enemy: enemyId }));
    } catch {}
  }

  /** S7.2 — dodge: dash arah hadap + i-frames, biaya energi. */
  private tryDodge() {
    if (this.runner.isActive || this.terminalOpen || this.transitioning) return;
    if (this.energy < 25 || this.time.now < this.invulnUntil) return;
    this.energy -= 25;
    EventBus.emit("ui:energy", { energy: this.energy, max: this.energyMax });
    const dir = this.lastDir ?? { x: 0, y: 1 };
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dir.x * 420, dir.y * 420);
    this.dashUntil = this.time.now + 220;
    this.invulnUntil = this.time.now + 450;
    this.player.setAlpha(0.55);
    this.time.delayedCall(230, () => {
      this.player.setAlpha(1);
    });
  }

  private hitPlayer(dmg: number) {
    if (this.time.now < this.invulnUntil) return;
    this.invulnUntil = this.time.now + 600;
    this.playerHp = Math.max(0, this.playerHp - dmg);
    EventBus.emit("ui:hp", { hp: this.playerHp, max: this.playerMaxHp });
    this.cameras.main.shake(120, 0.004);
    this.player.setTint(0xff6666);
    this.time.delayedCall(180, () => this.player.clearTint());
    if (this.playerHp <= 0) {
      this.playerHp = this.playerMaxHp;
      const sp = worlds[this.worldId].spawns["player_default"] ?? { x: 5, y: 5 };
      this.player.setPosition(sp.x * 32 + 16, sp.y * 32 + 16);
      EventBus.emit("ui:hp", { hp: this.playerHp, max: this.playerMaxHp });
      EventBus.emit("ui:toast", { text: t("combat.faint") });
    }
  }

  private spawnDamageNumber(payload: unknown) {
    const { x, y, amount } = payload as { x: number; y: number; amount: number };
    const txt = this.add
      .text(x + Phaser.Math.Between(-6, 6), y - 20, `-${amount}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#fde047",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9999);
    this.tweens.add({
      targets: txt,
      y: y - 44,
      alpha: 0,
      duration: 650,
      onComplete: () => txt.destroy(),
    });
  }

  private burstParticles(x?: number, y?: number) {
    if (x === undefined || y === undefined) return;
    for (let i = 0; i < 8; i++) {
      const bit = this.add
        .rectangle(x, y, 4, 4, i % 2 ? 0x34d399 : 0xf87171)
        .setDepth(9998);
      const angle = (Math.PI * 2 * i) / 8;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * 26,
        y: y + Math.sin(angle) * 26,
        alpha: 0,
        duration: 420,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private pathTileAt(rows: string[], x: number, y: number): number {
    const world = worlds[this.worldId];
    const walkable = (xx: number, yy: number): boolean => {
      if (yy < 0 || yy >= rows.length || xx < 0 || xx >= rows[yy].length) return true;
      const k = world.legend[rows[yy][xx]] ?? "grass";
      return k !== "path" && !world.solid.includes(k);
    };
    if (walkable(x, y - 1)) return this.tileIdx.edgeN ?? 2;
    if (walkable(x, y + 1)) return this.tileIdx.edgeS ?? 3;
    if (walkable(x + 1, y)) return this.tileIdx.edgeE ?? 4;
    if (walkable(x - 1, y)) return this.tileIdx.edgeW ?? 5;
    return this.tileIdx.path ?? 1;
  }

  private waterTileAt(world: WorldDef, rows: string[], x: number, y: number): number {
    const isWater = (xx: number, yy: number): boolean => {
      if (yy < 0 || yy >= rows.length || xx < 0 || xx >= rows[yy].length) return true;
      return (world.legend[rows[yy][xx]] ?? "grass") === "water";
    };
    if (!isWater(x, y - 1)) return this.tileIdx.waterEdgeN ?? 6;
    if (!isWater(x, y + 1)) return this.tileIdx.waterEdgeS ?? 6;
    if (!isWater(x + 1, y)) return this.tileIdx.waterEdgeE ?? 6;
    if (!isWater(x - 1, y)) return this.tileIdx.waterEdgeW ?? 6;
    return this.tileIdx.water ?? 6;
  }

  private persistSave() {
    if (!this.player || this.player.x < 0) return;
    this.saves.save("HubScene", { x: this.player.x, y: this.player.y }, this.flags);
  }

  update() {
    if (!this.player || this.player.x < 0 || this.transitioning) return;

    const locked = this.runner.isActive || this.terminalOpen;
    if (!locked) {
      if (this.time.now < this.dashUntil) {
        // dash aktif: jangan override velocity
      } else {
        const keys = keyboardState();
        const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) || touch.dx;
        const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) || touch.dy;
        const v = new Phaser.Math.Vector2(dx, dy);
        if (v.lengthSq() > 1) v.normalize();
        this.player.move(v.x, v.y);
        if (v.lengthSq() > 0) this.lastDir = { x: v.x, y: v.y };
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) EventBus.emit("input:attack");
    } else {
      this.player.move(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) EventBus.emit("input:interact");
    }

    this.interactions.update(this.player.x, this.player.y);

    // regen energi 12/detik
    if (this.energy < this.energyMax) {
      const before = this.energy;
      this.energy = Math.min(this.energyMax, this.energy + 0.2);
      if (Math.floor(before / 10) !== Math.floor(this.energy / 10)) {
        EventBus.emit("ui:energy", { energy: Math.round(this.energy), max: this.energyMax });
      }
    }

    const invuln = this.time.now < this.invulnUntil;
    for (const e of this.combat.all) {
      e.update(this.player.x, this.player.y, invuln, (dmg) => this.hitPlayer(dmg));
    }
  }
}
