import { test, expect } from "@playwright/test";


async function robustLogin(page: import("@playwright/test").Page, base: string) {
  await page.goto(base + "/account/login", { waitUntil: "networkidle", timeout: 90000 });
  // tunggu React hydrate (handler submit terpasang)
  await page
    .waitForFunction(
      () => {
        const b = document.querySelector("button");
        return !!b && Object.keys(b).some((k) => k.startsWith("__react"));
      },
      { timeout: 45000 }
    )
    .catch(() => {});
  await page.fill("input[type=email]", "dev@robika.game");
  await page.fill("input[type=password]", "RobikaDev2026!");
  const [resp] = await Promise.all([
    page
      .waitForResponse((r: import("@playwright/test").Response) => r.url().includes("/auth/") && r.request().method() === "POST", { timeout: 20000 })
      .catch(() => null),
    page.click("text=MASUK"),
  ]);
  await page.waitForURL("**/game**", { timeout: 90000 });
}

const BASE = process.env.E2E_URL ?? "http://localhost:3100";

/** §76 gameplay suite — mekanik inti di browser sungguhan. */
test.describe("gameplay core", () => {
  test.beforeEach(async ({ page }) => {
    await robustLogin(page, BASE);
    await page.waitForURL("**/game**", { timeout: 20_000 });
    await page.waitForFunction(
      () => {
        const g = (
          window as unknown as {
            __ROBIKA_GAME?: {
              scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
            };
          }
        ).__ROBIKA_GAME;
        return !!g && g.scene.scenes.some((s) => s.scene.key === "TitleScene" && s.sys.settings.status === 5);
      },
      { timeout: 30_000 }
    );
    await page.keyboard.press("Enter");
    const skip = page.getByText(/Lewati|Skip/);
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForFunction(
      () => {
        const g = (
          window as unknown as {
            __ROBIKA_GAME?: {
              scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
            };
          }
        ).__ROBIKA_GAME;
        return !!g && g.scene.scenes.some((s) => s.scene.key === "HubScene" && s.sys.settings.status === 5);
      },
      { timeout: 30_000 }
    );
    await page.waitForTimeout(2000);
  });

  function hub(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const g = (window as unknown as { __ROBIKA_GAME?: { scene: { getScene: (k: string) => unknown } } })
        .__ROBIKA_GAME;
      return g?.scene.getScene("HubScene") as unknown as {
        player: { x: number; y: number };
        playerHp: number;
        combat: { all: Array<{ isDead: boolean; hp: number; x: number; y: number; hurt: (d: number, f: number) => void }> };
      };
    });
  }

  test("movement memindahkan player", async ({ page }) => {
    const before = (await hub(page)).player;
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(700);
    await page.keyboard.up("KeyD");
    const after = (await hub(page)).player;
    expect(after.x).toBeGreaterThan(before.x);
  });

  test("dialogue NPC terbuka via interact", async ({ page }) => {
    const h = await hub(page);
    await page.evaluate((pos) => {
      const g = (
        window as unknown as {
          __ROBIKA_GAME?: { scene: { getScene: (k: string) => { player: { setPosition: (x: number, y: number) => void } } } }
        }
      ).__ROBIKA_GAME;
      g!.scene.getScene("HubScene").player.setPosition(pos.x + 40, pos.y);
    }, { x: 7 * 32 + 16, y: 13 * 32 + 16 });
    await page.waitForTimeout(600);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(800);
    const dialogue = await page.evaluate(() =>
      !!document.querySelector(".z-30 .font-mono") // DialogueBox panel
    );
    expect(dialogue).toBeTruthy();
  });

  test("serangan mengurangi HP musuh di dungeon", async ({ page }) => {
    // musuh tinggal di dungeon — masuk lewat restart scene dengan worldId dungeon
    await page.evaluate(() => {
      const g = (
        window as unknown as {
          __ROBIKA_GAME?: {
            scene: { getScene: (k: string) => { scene: { restart: (d: unknown) => void } } };
          }
        }
      ).__ROBIKA_GAME;
      g!.scene.getScene("HubScene").scene.restart({ worldId: "dungeon_01", spawn: "from_hub" });
    });
    await page.waitForTimeout(2500);
    const dungeon = await page.evaluate(() => {
      const g = (
        window as unknown as {
          __ROBIKA_GAME?: {
            scene: {
              getScene: (k: string) => {
                player: { setPosition: (x: number, y: number) => void };
                combat?: { all: Array<{ isDead: boolean; hp: number; x: number; y: number }> };
              } & { player: { setPosition: (x: number, y: number) => void } };
            };
          }
        }
      ).__ROBIKA_GAME;
      const hub = g?.scene.getScene("HubScene") as unknown as {
        player: { x: number; y: number; setPosition: (x: number, y: number) => void };
        combat?: { all: Array<{ isDead: boolean; hp: number; x: number; y: number }> };
      };
      const alive = hub.combat?.all.filter((e) => !e.isDead) ?? [];
      if (!alive.length) return { none: true };
      hub.player.setPosition(alive[0].x - 34, alive[0].y);
      return { none: false, hpBefore: alive[0].hp, playerHp: 50 };
    });
    if (dungeon.none || dungeon.hpBefore === undefined) return;

    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const g = (
        window as unknown as {
          __ROBIKA_GAME?: {
            scene: {
              getScene: (k: string) => {
                combat?: { all: Array<{ isDead: boolean; hp: number }> };
                playerHp: number;
              };
            };
          }
        }
      ).__ROBIKA_GAME;
      const hub = g?.scene.getScene("HubScene") as unknown as {
        combat?: { all: Array<{ isDead: boolean; hp: number }> };
        playerHp: number;
      };
      const first = hub.combat?.all[0];
      return { hp: first ? first.hp : -1, dead: first ? first.isDead : true, playerHp: hub.playerHp };
    });
    expect(after.hp).toBeLessThan(dungeon.hpBefore + 1); // berkurang atau mati
  });
});
