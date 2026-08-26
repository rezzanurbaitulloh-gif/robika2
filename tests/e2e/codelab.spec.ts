import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_URL ?? "http://localhost:3100";

async function robustLogin(page: import("@playwright/test").Page, base: string) {
  await page.goto(base + "/account/login", { waitUntil: "networkidle", timeout: 90000 });
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
      .waitForResponse(
        (r: import("@playwright/test").Response) =>
          r.url().includes("/auth/") && r.request().method() === "POST",
        { timeout: 20000 }
      )
      .catch(() => null),
    page.getByRole("button", { name: "MASUK" }).click(),
  ]);
  if (!resp) await page.evaluate(() => document.querySelector("form")?.requestSubmit());
  await page.waitForURL("**/game**", { timeout: 90000 });
}

test.describe("D10 CodeLab", () => {
  test("buat proyek - edit - run - simpan versi - muat ulang", async ({ page }) => {
    test.setTimeout(180000);
    await robustLogin(page, BASE);
    await page.goto(BASE + "/codelab", { waitUntil: "networkidle" });
    const name = "QA-Proyek-" + Date.now();
    await page.fill("input[placeholder*='Nama proyek']", name);
    await page.click("text=+ Proyek");
    await page.waitForURL("**/codelab/**", { timeout: 60000 });
    await page
      .waitForFunction(
        () => {
          const t = document.querySelector("textarea");
          return !!t && Object.keys(t).some((k) => k.startsWith("__react"));
        },
        { timeout: 60000 }
      )
      .catch(() => {});
    await page.waitForTimeout(1500);

    await page.fill("textarea", 'console.log("HALO_CODELAB_42");');
    await page.click("text=RUN");
    await expect(page.locator("pre")).toContainText("HALO_CODELAB_42", { timeout: 30000 });

    await page.click("text=Simpan Versi");
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "networkidle" });
    await page
      .waitForFunction(
        () => {
          const t = document.querySelector("textarea");
          return !!t && Object.keys(t).some((k) => k.startsWith("__react"));
        },
        { timeout: 60000 }
      )
      .catch(() => {});
    await page.waitForTimeout(1500);
    const val = await page.inputValue("textarea");
    expect(val).toContain("HALO_CODELAB_42");
  });
});
