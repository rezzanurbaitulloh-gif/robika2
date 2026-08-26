const { chromium } = require("@playwright/test");

(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 200)));
  p.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 180));
  });
  await p.goto("http://localhost:3101/account/login", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForFunction(
    () => {
      const btn = document.querySelector("button");
      return !!btn && Object.keys(btn).some((k) => k.startsWith("__react"));
    },
    { timeout: 60000 }
  ).catch(() => console.log("HYDRATION WAIT TIMEOUT"));
  console.log("hydrated, filling…");
  await p.fill("input[type=email]", "dev@robika.game");
  await p.fill("input[type=password]", "RobikaDev2026!");
  const [resp] = await Promise.all([
    p
      .waitForResponse(
        (r) => r.url().includes("/auth/") && r.request().method() === "POST",
        { timeout: 25000 }
      )
      .catch(() => null),
    p.getByRole("button", { name: "MASUK" }).click(),
  ]);
  console.log("auth resp:", resp ? resp.status() : "NONE");
  await p.waitForTimeout(4000);
  console.log("URL:", p.url());
  await b.close();
})();
