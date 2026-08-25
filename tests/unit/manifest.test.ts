import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** D20 — manifest ↔ file integrity (mirror scripts/check-assets.mjs). */
describe("asset manifest", () => {
  const manifest = JSON.parse(readFileSync("public/assets/manifest.json", "utf8"));

  it("setiap URL manifest ada di public/", () => {
    const urls: string[] = [
      ...Object.values(manifest.images ?? {}).flatMap((i) => [(i as { url: string }).url]),
      ...Object.values(manifest.spritesheets ?? {}).flatMap((s) => [(s as { url: string }).url]),
    ];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(existsSync(join("public", url.replace(/^\//, ""))), url).toBe(true);
    }
  });

  it("aset inti dunia terdaftar", () => {
    for (const key of ["tiles_boot_valley", "player_south", "npc_mira_south", "prop_gate", "prop_terminal"]) {
      expect(manifest.images[key]).toBeDefined();
    }
    expect(manifest.spritesheets["player_walk_south"]).toBeDefined();
    expect(manifest.spritesheets["enemy_glitch_scout_walk_south"]).toBeDefined();
  });
});
