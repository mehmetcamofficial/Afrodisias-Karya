import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const widths = [375, 768, 1024, 1440];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "off" },
  projects: widths.map((width) => ({
    name: `w${width}`,
    use: { ...devices["Desktop Chrome"], viewport: { width, height: width < 800 ? 812 : 900 }, isMobile: false },
  })),
  // Reuses a running dev server; starts one otherwise (skipped for remote targets).
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "pnpm dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
