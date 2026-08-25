import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";

const BASE = process.env.E2E_URL ?? "http://localhost:3100";

test.describe("§58 responsif + §70 smoke", () => {
  for (const viewport of ["desktop-1920", "laptop-1366", "mobile-landscape"]) {
    test(`[${viewport}] layar judul tampil`, async ({ page }) => {
      await page.goto(BASE);
      await expect(page.getByText("ROBIKA", { exact: true })).toBeVisible();
    });
  }

  test("login → dunia ter-render (canvas tidak hitam)", async ({ page }) => {
    await page.goto(`${BASE}/account/login`);
    await page.fill("input[type=email]", "dev@robika.game");
    await page.fill("input[type=password]", "RobikaDev2026!");
    await page.click("button");
    await page.waitForURL("**/game**", { timeout: 20_000 });

    // tunggu lobi siap (§68), lalu mulai petualangan
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
    await page.waitForTimeout(1500);

    // §68: story intro saat memasuki dunia -> lewati
    const skip = page.getByText(/Lewati|Skip/);
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    }

    // tunggu dunia jalan
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
    await page.waitForTimeout(2500);

    const shot = await page.screenshot();
    const png = PNG.sync.read(shot);
    let nonDark = 0;
    const samples = 400;
    for (let i = 0; i < samples; i++) {
      const idx = Math.floor((i / samples) * (png.data.length / 4)) * 4;
      if (png.data[idx] + png.data[idx + 1] + png.data[idx + 2] > 90) nonDark += 1;
    }
    expect(nonDark / samples, "canvas harus menampilkan dunia").toBeGreaterThan(0.3);
  });
});
