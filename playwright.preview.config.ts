import { defineConfig, devices } from "@playwright/test";

/** Read-only checks against a protected Vercel Preview (see .github/workflows/preview-css-probe.yml). */
const baseURL = process.env.PREVIEW_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined;
export default defineConfig({
  testDir: "./tests/preview",
  timeout: 90_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-preview" }]],
  use: { baseURL, extraHTTPHeaders, trace: "off" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-iphone", use: { ...devices["iPhone 13"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1024, height: 900 } } },
  ],
});
