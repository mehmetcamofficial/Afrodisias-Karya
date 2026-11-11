import { defineConfig } from "vitest/config";

// Standalone config: unit tests cover pure modules and must not boot the
// Cloudflare/vinext plugins from vite.config.ts.
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
