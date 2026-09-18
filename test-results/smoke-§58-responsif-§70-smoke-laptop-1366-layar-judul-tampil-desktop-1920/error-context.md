# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> §58 responsif + §70 smoke >> [laptop-1366] layar judul tampil
- Location: tests/e2e/smoke.spec.ts:33:9

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3101/
Call log:
  - navigating to "http://localhost:3101/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { PNG } from "pngjs";
  3  | 
  4  | 
  5  | async function robustLogin(page: import("@playwright/test").Page, base: string) {
  6  |   await page.goto(base + "/account/login", { waitUntil: "networkidle", timeout: 90000 });
  7  |   // tunggu React hydrate (handler submit terpasang)
  8  |   await page
  9  |     .waitForFunction(
  10 |       () => {
  11 |         const b = document.querySelector("button");
  12 |         return !!b && Object.keys(b).some((k) => k.startsWith("__react"));
  13 |       },
  14 |       { timeout: 45000 }
  15 |     )
  16 |     .catch(() => {});
  17 |   await page.fill("input[type=email]", "dev@robika.game");
  18 |   await page.fill("input[type=password]", "RobikaDev2026!");
  19 |   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  20 |   const [resp] = await Promise.all([
  21 |     page
  22 |       .waitForResponse((r: import("@playwright/test").Response) => r.url().includes("/auth/") && r.request().method() === "POST", { timeout: 20000 })
  23 |       .catch(() => null),
  24 |     page.getByRole("button", { name: "MASUK" }).click(),
  25 |   ]);
  26 |   await page.waitForURL("**/game**", { timeout: 90000 });
  27 | }
  28 | 
  29 | const BASE = process.env.E2E_URL ?? "http://localhost:3100";
  30 | 
  31 | test.describe("§58 responsif + §70 smoke", () => {
  32 |   for (const viewport of ["desktop-1920", "laptop-1366", "mobile-landscape"]) {
  33 |     test(`[${viewport}] layar judul tampil`, async ({ page }) => {
> 34 |       await page.goto(BASE);
     |                  ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3101/
  35 |       await expect(page.getByText("ROBIKA", { exact: true })).toBeVisible();
  36 |     });
  37 |   }
  38 | 
  39 |   test("login → dunia ter-render (canvas tidak hitam)", async ({ page }) => {
  40 |     await robustLogin(page, BASE);
  41 |     await page.waitForURL("**/game**", { timeout: 20_000 });
  42 | 
  43 |     // tunggu lobi siap (§68), lalu mulai petualangan
  44 |     await page.waitForFunction(
  45 |       () => {
  46 |         const g = (
  47 |           window as unknown as {
  48 |             __ROBIKA_GAME?: {
  49 |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  50 |             };
  51 |           }
  52 |         ).__ROBIKA_GAME;
  53 |         return !!g && g.scene.scenes.some((s) => s.scene.key === "TitleScene" && s.sys.settings.status === 5);
  54 |       },
  55 |       { timeout: 30_000 }
  56 |     );
  57 |     await page.keyboard.press("Enter");
  58 |     await page.waitForTimeout(1500);
  59 | 
  60 |     // §68: story intro saat memasuki dunia -> lewati
  61 |     const skip = page.getByText(/Lewati|Skip/);
  62 |     if (await skip.isVisible().catch(() => false)) {
  63 |       await skip.click();
  64 |     }
  65 | 
  66 |     // tunggu dunia jalan
  67 |     await page.waitForFunction(
  68 |       () => {
  69 |         const g = (
  70 |           window as unknown as {
  71 |             __ROBIKA_GAME?: {
  72 |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  73 |             };
  74 |           }
  75 |         ).__ROBIKA_GAME;
  76 |         return !!g && g.scene.scenes.some((s) => s.scene.key === "HubScene" && s.sys.settings.status === 5);
  77 |       },
  78 |       { timeout: 30_000 }
  79 |     );
  80 |     await page.waitForTimeout(2500);
  81 | 
  82 |     const shot = await page.screenshot();
  83 |     const png = PNG.sync.read(shot);
  84 |     let nonDark = 0;
  85 |     const samples = 400;
  86 |     for (let i = 0; i < samples; i++) {
  87 |       const idx = Math.floor((i / samples) * (png.data.length / 4)) * 4;
  88 |       if (png.data[idx] + png.data[idx + 1] + png.data[idx + 2] > 90) nonDark += 1;
  89 |     }
  90 |     expect(nonDark / samples, "canvas harus menampilkan dunia").toBeGreaterThan(0.3);
  91 |   });
  92 | });
  93 | 
```