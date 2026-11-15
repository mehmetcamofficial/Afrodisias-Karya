import { defineConfig, devices } from "@playwright/test";

/**
 * Admin E2E against a real production build (`next start`) and a disposable local
 * PostgreSQL. Identity comes from the local hosting headers, which the app accepts
 * only outside Vercel. Never point DATABASE_URL_E2E at a remote database:
 * global-setup refuses anything but localhost.
 */
const port = 3100;
const dbUrl = process.env.DATABASE_URL_E2E ?? "postgres://test_admin:test_only_local@127.0.0.1:55432/altindal_e2e";

export default defineConfig({
  testDir: "tests/admin-e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./tests/admin-e2e/global-setup.ts",
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "off" },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } }, testMatch: /mobile\.spec\.ts/, dependencies: ["desktop-1440"] },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${port} -H 127.0.0.1`,
    url: `http://127.0.0.1:${port}/`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { DATABASE_URL: dbUrl, LOCAL_PG_DRIVER: "1", ADMIN_EMAILS: "owner@e2e.test", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
