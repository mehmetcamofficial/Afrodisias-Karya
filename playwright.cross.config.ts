import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-browser check of the PRODUCTION stylesheet (issue #6). Requires `pnpm exec next build` and the
 * built CSS chunks copied to .prod-css/ (see the CI job "cross-browser-css"). Pages come from the
 * fixture dev server; their dev styles are replaced by the production CSS, so WebKit/Firefox parse the
 * exact minified output Vercel serves.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
export default defineConfig({
  testDir: "./tests/cross-browser",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-cross" }]],
  use: { baseURL, trace: "off" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-iphone", use: { ...devices["iPhone 13"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1024, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "pnpm dev", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 180_000, env: { E2E_CATALOG_FIXTURE: "1" } },
});
