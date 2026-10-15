import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const port = Number(process.env.PLAYWRIGHT_PORT || 38173);
export default defineConfig({
  testDir: "./tests",
  globalTeardown: "./scripts/fullstack-test-teardown.cjs",
  testMatch: "**/*.spec.mjs",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/fullstack-test-server.cjs",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15000 },
    timeout: 120000,
  },
});
