# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> §58 responsif + §70 smoke >> login → dunia ter-render (canvas tidak hitam)
- Location: tests/e2e/smoke.spec.ts:38:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 90000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/game**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "Masuk ke Aetheria" [level=1] [ref=e4]
      - textbox "Email" [ref=e5]: dev@robika.game
      - textbox "Password" [ref=e6]: RobikaDev2026!
      - button "MASUK" [ref=e7]
      - paragraph [ref=e8]:
        - text: Belum punya akun?
        - link "Daftar" [ref=e9] [cursor=pointer]:
          - /url: /account/register?next=%2Fgame
  - alert [ref=e10]
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
  19 |   const [resp] = await Promise.all([
  20 |     page
  21 |       .waitForResponse((r: import("@playwright/test").Response) => r.url().includes("/auth/") && r.request().method() === "POST", { timeout: 20000 })
  22 |       .catch(() => null),
  23 |     page.click("text=MASUK"),
  24 |   ]);
> 25 |   await page.waitForURL("**/game**", { timeout: 90000 });
     |              ^ Error: page.waitForURL: Test timeout of 90000ms exceeded.
  26 | }
  27 | 
  28 | const BASE = process.env.E2E_URL ?? "http://localhost:3100";
  29 | 
  30 | test.describe("§58 responsif + §70 smoke", () => {
  31 |   for (const viewport of ["desktop-1920", "laptop-1366", "mobile-landscape"]) {
  32 |     test(`[${viewport}] layar judul tampil`, async ({ page }) => {
  33 |       await page.goto(BASE);
  34 |       await expect(page.getByText("ROBIKA", { exact: true })).toBeVisible();
  35 |     });
  36 |   }
  37 | 
  38 |   test("login → dunia ter-render (canvas tidak hitam)", async ({ page }) => {
  39 |     await robustLogin(page, BASE);
  40 |     await page.waitForURL("**/game**", { timeout: 20_000 });
  41 | 
  42 |     // tunggu lobi siap (§68), lalu mulai petualangan
  43 |     await page.waitForFunction(
  44 |       () => {
  45 |         const g = (
  46 |           window as unknown as {
  47 |             __ROBIKA_GAME?: {
  48 |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  49 |             };
  50 |           }
  51 |         ).__ROBIKA_GAME;
  52 |         return !!g && g.scene.scenes.some((s) => s.scene.key === "TitleScene" && s.sys.settings.status === 5);
  53 |       },
  54 |       { timeout: 30_000 }
  55 |     );
  56 |     await page.keyboard.press("Enter");
  57 |     await page.waitForTimeout(1500);
  58 | 
  59 |     // §68: story intro saat memasuki dunia -> lewati
  60 |     const skip = page.getByText(/Lewati|Skip/);
  61 |     if (await skip.isVisible().catch(() => false)) {
  62 |       await skip.click();
  63 |     }
  64 | 
  65 |     // tunggu dunia jalan
  66 |     await page.waitForFunction(
  67 |       () => {
  68 |         const g = (
  69 |           window as unknown as {
  70 |             __ROBIKA_GAME?: {
  71 |               scene: { scenes: Array<{ scene: { key: string }; sys: { settings: { status: number } } }> };
  72 |             };
  73 |           }
  74 |         ).__ROBIKA_GAME;
  75 |         return !!g && g.scene.scenes.some((s) => s.scene.key === "HubScene" && s.sys.settings.status === 5);
  76 |       },
  77 |       { timeout: 30_000 }
  78 |     );
  79 |     await page.waitForTimeout(2500);
  80 | 
  81 |     const shot = await page.screenshot();
  82 |     const png = PNG.sync.read(shot);
  83 |     let nonDark = 0;
  84 |     const samples = 400;
  85 |     for (let i = 0; i < samples; i++) {
  86 |       const idx = Math.floor((i / samples) * (png.data.length / 4)) * 4;
  87 |       if (png.data[idx] + png.data[idx + 1] + png.data[idx + 2] > 90) nonDark += 1;
  88 |     }
  89 |     expect(nonDark / samples, "canvas harus menampilkan dunia").toBeGreaterThan(0.3);
  90 |   });
  91 | });
  92 | 
```