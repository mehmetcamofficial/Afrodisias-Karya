import { defineConfig, devices } from "@playwright/test";

/**
 * Real Clerk (Development instance) authorization checks against the protected Vercel Preview.
 * Runs only in .github/workflows/clerk-preview-auth.yml, inside the `clerk-preview-tests` GitHub
 * environment that alone holds the Development test keys. Never Production keys (global-setup refuses).
 */
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
export default defineConfig({
  testDir: "./tests/clerk-preview",
  globalSetup: "./tests/clerk-preview/global-setup.ts",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PREVIEW_URL,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
