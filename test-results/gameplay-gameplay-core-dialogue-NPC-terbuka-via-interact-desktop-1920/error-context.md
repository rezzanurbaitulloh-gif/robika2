# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.ts >> gameplay core >> dialogue NPC terbuka via interact
- Location: tests/e2e/gameplay.spec.ts:88:7

# Error details

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | 
  4   | async function robustLogin(page: import("@playwright/test").Page, base: string) {
  5   |   await page.goto(base + "/account/login", { waitUntil: "networkidle", timeout: 90000 });
  6   |   // tunggu React hydrate (handler submit terpasang)
  7   |   await page
  8   |     .waitForFunction(
  9   |       () => {
  10  |         const b = document.querySelector("button");
  11  |         return !!b && Object.keys(b).some((k) => k.startsWith("__react"));
  12  |       },
  13  |       { timeout: 45000 }
  14  |     )
  15  |     .catch(() => {});
  16  |   await page.fill("input[type=email]", "dev@robika.game");
  17  |   await page.fill("input[type=password]", "RobikaDev2026!");
  18  |   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  19  |   const [resp] = await Promise.all([
  20  |     page
  21  |       .waitForResponse((r: import("@playwright/test").Response) => r.url().includes("/auth/") && r.request().method() === "POST", { timeout: 20000 })
  22  |       .catch(() => null),
  23  |     page.getByRole("button", { name: "MASUK" }).click(),
  24  |   ]);
  25  |   await page.waitForURL("**/game**", { timeout: 90000 });
  26  | }
  27  | 
  28  | const BASE = process.env.E2E_URL ?? "http://localhost:3100";
  29  | 
  30  | /** §76 gameplay suite — mekanik inti di browser sungguhan. */
  31  | test.describe("gameplay core", () => {
  32  |   test.beforeEach(async ({ page }) => {
  33  |     await robustLogin(page, BASE);
  34  |     await page.waitForURL("**/game**", { timeout: 20_000 });
> 35  |     await page.waitForFunction(
      |                ^ Error: page.waitForFunction: Target page, context or browser has been closed
  36  |       () => {
  37  |         const g = (
  38  |           window as unknown as {
  39  |             __ROBIKA_GAME?: {
  40  |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  41  |             };
  42  |           }
  43  |         ).__ROBIKA_GAME;
  44  |         return !!g && g.scene.scenes.some((s) => s.scene.key === "TitleScene" && s.sys.settings.status === 5);
  45  |       },
  46  |       { timeout: 30_000 }
  47  |     );
  48  |     await page.keyboard.press("Enter");
  49  |     const skip = page.getByText(/Lewati|Skip/);
  50  |     if (await skip.isVisible().catch(() => false)) await skip.click();
  51  |     await page.waitForFunction(
  52  |       () => {
  53  |         const g = (
  54  |           window as unknown as {
  55  |             __ROBIKA_GAME?: {
  56  |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  57  |             };
  58  |           }
  59  |         ).__ROBIKA_GAME;
  60  |         return !!g && g.scene.scenes.some((s) => s.scene.key === "HubScene" && s.sys.settings.status === 5);
  61  |       },
  62  |       { timeout: 30_000 }
  63  |     );
  64  |     await page.waitForTimeout(2000);
  65  |   });
  66  | 
  67  |   function hub(page: import("@playwright/test").Page) {
  68  |     return page.evaluate(() => {
  69  |       const g = (window as unknown as { __ROBIKA_GAME?: { scene: { getScene: (k: string) => unknown } } })
  70  |         .__ROBIKA_GAME;
  71  |       return g?.scene.getScene("HubScene") as unknown as {
  72  |         player: { x: number; y: number };
  73  |         playerHp: number;
  74  |         combat: { all: Array<{ isDead: boolean; hp: number; x: number; y: number; hurt: (d: number, f: number) => void }> };
  75  |       };
  76  |     });
  77  |   }
  78  | 
  79  |   test("movement memindahkan player", async ({ page }) => {
  80  |     const before = (await hub(page)).player;
  81  |     await page.keyboard.down("KeyD");
  82  |     await page.waitForTimeout(700);
  83  |     await page.keyboard.up("KeyD");
  84  |     const after = (await hub(page)).player;
  85  |     expect(after.x).toBeGreaterThan(before.x);
  86  |   });
  87  | 
  88  |   test("dialogue NPC terbuka via interact", async ({ page }) => {
  89  |     await page.evaluate((pos) => {
  90  |       const g = (
  91  |         window as unknown as {
  92  |           __ROBIKA_GAME?: { scene: { getScene: (k: string) => { player: { setPosition: (x: number, y: number) => void } } } }
  93  |         }
  94  |       ).__ROBIKA_GAME;
  95  |       g!.scene.getScene("HubScene").player.setPosition(pos.x + 40, pos.y);
  96  |     }, { x: 7 * 32 + 16, y: 13 * 32 + 16 });
  97  |     await page.waitForTimeout(600);
  98  |     await page.keyboard.press("KeyE");
  99  |     await page.waitForTimeout(800);
  100 |     const dialogue = await page.evaluate(() =>
  101 |       !!document.querySelector(".z-30 .font-mono") // DialogueBox panel
  102 |     );
  103 |     expect(dialogue).toBeTruthy();
  104 |   });
  105 | 
  106 |   test("serangan mengurangi HP musuh di dungeon", async ({ page }) => {
  107 |     // musuh tinggal di dungeon — masuk lewat restart scene dengan worldId dungeon
  108 |     await page.evaluate(() => {
  109 |       const g = (
  110 |         window as unknown as {
  111 |           __ROBIKA_GAME?: {
  112 |             scene: { getScene: (k: string) => { scene: { restart: (d: unknown) => void } } };
  113 |           }
  114 |         }
  115 |       ).__ROBIKA_GAME;
  116 |       g!.scene.getScene("HubScene").scene.restart({ worldId: "dungeon_01", spawn: "from_hub" });
  117 |     });
  118 |     await page.waitForTimeout(2500);
  119 |     const dungeon = await page.evaluate(() => {
  120 |       const g = (
  121 |         window as unknown as {
  122 |           __ROBIKA_GAME?: {
  123 |             scene: {
  124 |               getScene: (k: string) => {
  125 |                 player: { setPosition: (x: number, y: number) => void };
  126 |                 combat?: { all: Array<{ isDead: boolean; hp: number; x: number; y: number }> };
  127 |               } & { player: { setPosition: (x: number, y: number) => void } };
  128 |             };
  129 |           }
  130 |         }
  131 |       ).__ROBIKA_GAME;
  132 |       const hub = g?.scene.getScene("HubScene") as unknown as {
  133 |         player: { x: number; y: number; setPosition: (x: number, y: number) => void };
  134 |         combat?: { all: Array<{ isDead: boolean; hp: number; x: number; y: number }> };
  135 |       };
```