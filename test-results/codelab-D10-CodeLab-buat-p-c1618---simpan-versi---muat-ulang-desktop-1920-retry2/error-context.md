# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: codelab.spec.ts >> D10 CodeLab >> buat proyek - edit - run - simpan versi - muat ulang
- Location: tests/e2e/codelab.spec.ts:33:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3101/account/login
Call log:
  - navigating to "http://localhost:3101/account/login", waiting until "networkidle"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const BASE = process.env.E2E_URL ?? "http://localhost:3100";
  4  | 
  5  | async function robustLogin(page: import("@playwright/test").Page, base: string) {
> 6  |   await page.goto(base + "/account/login", { waitUntil: "networkidle", timeout: 90000 });
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3101/account/login
  7  |   await page
  8  |     .waitForFunction(
  9  |       () => {
  10 |         const b = document.querySelector("button");
  11 |         return !!b && Object.keys(b).some((k) => k.startsWith("__react"));
  12 |       },
  13 |       { timeout: 45000 }
  14 |     )
  15 |     .catch(() => {});
  16 |   await page.fill("input[type=email]", "dev@robika.game");
  17 |   await page.fill("input[type=password]", "RobikaDev2026!");
  18 |   const [resp] = await Promise.all([
  19 |     page
  20 |       .waitForResponse(
  21 |         (r: import("@playwright/test").Response) =>
  22 |           r.url().includes("/auth/") && r.request().method() === "POST",
  23 |         { timeout: 20000 }
  24 |       )
  25 |       .catch(() => null),
  26 |     page.getByRole("button", { name: "MASUK" }).click(),
  27 |   ]);
  28 |   if (!resp) await page.evaluate(() => document.querySelector("form")?.requestSubmit());
  29 |   await page.waitForURL("**/game**", { timeout: 90000 });
  30 | }
  31 | 
  32 | test.describe("D10 CodeLab", () => {
  33 |   test("buat proyek - edit - run - simpan versi - muat ulang", async ({ page }) => {
  34 |     test.setTimeout(180000);
  35 |     await robustLogin(page, BASE);
  36 |     await page.goto(BASE + "/codelab", { waitUntil: "networkidle" });
  37 |     const name = "QA-Proyek-" + Date.now();
  38 |     await page.fill("input[placeholder*='Nama proyek']", name);
  39 |     await page.click("text=+ Proyek");
  40 |     await page.waitForURL("**/codelab/**", { timeout: 60000 });
  41 |     await page
  42 |       .waitForFunction(
  43 |         () => {
  44 |           const t = document.querySelector("textarea");
  45 |           return !!t && Object.keys(t).some((k) => k.startsWith("__react"));
  46 |         },
  47 |         { timeout: 60000 }
  48 |       )
  49 |       .catch(() => {});
  50 |     await page.waitForTimeout(1500);
  51 | 
  52 |     await page.fill("textarea", 'console.log("HALO_CODELAB_42");');
  53 |     await page.click("text=RUN");
  54 |     await expect(page.locator("pre")).toContainText("HALO_CODELAB_42", { timeout: 30000 });
  55 | 
  56 |     await page.click("text=Simpan Versi");
  57 |     await page.waitForTimeout(2000);
  58 | 
  59 |     await page.reload({ waitUntil: "networkidle" });
  60 |     await page
  61 |       .waitForFunction(
  62 |         () => {
  63 |           const t = document.querySelector("textarea");
  64 |           return !!t && Object.keys(t).some((k) => k.startsWith("__react"));
  65 |         },
  66 |         { timeout: 60000 }
  67 |       )
  68 |       .catch(() => {});
  69 |     await page.waitForTimeout(1500);
  70 |     const val = await page.inputValue("textarea");
  71 |     expect(val).toContain("HALO_CODELAB_42");
  72 |   });
  73 | });
  74 | 
```