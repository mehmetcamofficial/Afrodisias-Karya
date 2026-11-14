import { defineConfig } from "vitest/config";

// Integration tests run against a real, disposable PostgreSQL given by
// DATABASE_URL_TEST (local or CI service container). Never point this at
// Neon Preview or Production: the suite drops and recreates the schema.
export default defineConfig({
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", fileParallelism: false, testTimeout: 20_000 },
});
