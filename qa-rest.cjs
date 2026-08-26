const { chromium } = require("@playwright/test");

(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto("http://localhost:3101/account/login", { waitUntil: "networkidle", timeout: 90000 });
  await p
    .waitForFunction(
      () => {
        const btn = document.querySelector("button");
        return !!btn && Object.keys(btn).some((k) => k.startsWith("__react"));
      },
      { timeout: 45000 }
    )
    .catch(() => {});
  await p.fill("input[type=email]", "dev@robika.game");
  await p.fill("input[type=password]", "RobikaDev2026!");
  await p.click("text=MASUK");
  await p.waitForURL("**/game**", { timeout: 90000 });
  await p.goto("http://localhost:3101/codelab", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const rest = await p.evaluate(async () => {
    const m = document.cookie.match(/sb-iqkhdxxbbjhgbxjviruu-auth-token=([^;]+)/);
    if (!m) return { err: "no-cookie", cookies: document.cookie.slice(0, 120) };
    const sess = JSON.parse(decodeURIComponent(m[1]));
    const res = await fetch("https://iqkhdxxbbjhgbxjviruu.supabase.co/rest/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxa2hkeHhiYmpoZ2J4anZpcnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzg2OTMsImV4cCI6MjEwMjcxNDY5M30.jy74vDga4FewPIIS_rFxmGPGj74CEXJdVWsIXQnD36o",
        Authorization: "Bearer " + sess.access_token,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ name: "QA-Direct-" + Date.now(), runtime: "javascript" }),
    });
    return { status: res.status, body: (await res.text()).slice(0, 200) };
  });
  console.log("REST:", JSON.stringify(rest));
  await b.close();
})();
