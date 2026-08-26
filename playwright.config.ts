import { defineConfig, devices } from "@playwright/test";

/** §58 — matrix responsif: desktop / laptop / mobile landscape. */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  retries: 2,
  projects: [
    { name: "desktop-1920", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "laptop-1366", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "mobile-landscape", use: { ...devices["Pixel 5"], viewport: { width: 844, height: 390 } } },
  ],
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: "npm run dev -- -p 3100",
        port: 3100,
        timeout: 60_000,
        reuseExistingServer: false,
      },
});
