const { chromium } = require("@playwright/test");

(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const results = {};
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 150)));
  try {
    // login UI deterministik
    await p.goto("http://localhost:3101/account/login", { waitUntil: "networkidle", timeout: 90000 });
    await p
      .waitForFunction(
        () => {
          const btn = document.querySelector("button");
          return !!btn && Object.keys(btn).some((k) => k.startsWith("__react"));
        },
        null,
        { timeout: 60000 }
      )
      .catch(() => {});
    await p.fill("input[type=email]", "dev@robika.game");
    await p.fill("input[type=password]", "RobikaDev2026!");
    await p.getByRole("button", { name: "MASUK" }).click();
    await p.waitForURL("**/game**", { timeout: 90000 });

    // lobi -> Enter -> intro skip -> dunia
    await p.waitForFunction(
      () => {
        const g = window.__ROBIKA_GAME;
        return g && g.scene.scenes.some((s) => s.scene.key === "TitleScene" && s.sys.settings.status === 5);
      },
      null,
      { timeout: 90000 }
    );
    for (let i = 0; i < 10; i++) {
      await p.evaluate(() =>
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", bubbles: true }))
      );
      const started = await p
        .waitForFunction(
          () => {
            const g = window.__ROBIKA_GAME;
            return g && g.scene.scenes.some((s) => s.scene.key === "HubScene" && s.sys.settings.status === 5);
          },
          null,
          { timeout: 5000 }
        )
        .then(() => true)
        .catch(() => false);
      if (started) break;
    }
    await p.waitForTimeout(1500);
    const skip = p.getByText(/Lewati|Skip/);
    if (await skip.isVisible().catch(() => false)) await skip.click();

    const hubReady = () =>
      p.waitForFunction(
        () => {
          const g = window.__ROBIKA_GAME;
          const h = g && g.scene.getScene("HubScene");
          return h && h.player && h.interactions && h.interactions.items;
        },
        null,
        { timeout: 60000 }
      );
    await hubReady();
    results.boot = "OK";

    const go = (tx, ty) =>
      p.evaluate(([x, y]) => {
        window.__ROBIKA_GAME.scene.getScene("HubScene").player.setPosition(x * 32 + 16, y * 32 + 16);
      }, [tx, ty]);
    const act = () =>
      p.evaluate(() => window.__ROBIKA_GAME.scene.getScene("HubScene").interactions.tryInteract());
    const state = () =>
      p.evaluate(() => {
        const h = window.__ROBIKA_GAME.scene.getScene("HubScene");
        return {
          world: h.worldId,
          hp: h.playerHp,
          flags: Object.keys(h.flags),
        };
      });

    // relik rahasia
    await go(27, 15);
    await p.waitForTimeout(800);
    await act();
    await p.waitForTimeout(1500);
    const s1 = await state();
    results.relic = s1.flags.includes("relic_secret") ? "OK" : "FAIL";

    // pintu basis
    await go(14, 18);
    await p.waitForTimeout(800);
    await act();
    await p.waitForFunction(
      () => {
        const h = window.__ROBIKA_GAME?.scene.getScene("HubScene");
        return h && h.worldId === "base" && h.player && h.player.x > 0;
      },
      null,
      { timeout: 60000 }
    );
    results.doorBase = "OK";

    // altar pulihkan
    await p.evaluate(() => {
      const h = window.__ROBIKA_GAME.scene.getScene("HubScene");
      h.playerHp = 15;
    });
    await go(7, 2);
    await p.waitForTimeout(800);
    await act();
    await p.waitForTimeout(1500);
    const s3 = await state();
    results.shrine = s3.hp === 50 ? "OK" : "FAIL hp=" + s3.hp;

    // portal akademi
    await go(5, 3);
    await p.waitForTimeout(800);
    await act();
    await p.waitForURL("**/academy**", { timeout: 30000 });
    results.academyPortal = "OK";
  } catch (e) {
    results.FATAL = e.message.slice(0, 140);
    try {
      await p.screenshot({ path: "/tmp/opencode/qa-features-fatal.png" });
    } catch {}
  }
  results.errors = errs.slice(0, 3);
  console.log(JSON.stringify(results, null, 1));
  await b.close();
})();
