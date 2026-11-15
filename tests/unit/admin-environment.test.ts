import { describe, expect, it } from "vitest";
import { adminEnvironment } from "../../lib/admin-environment";

describe("admin environment status", () => {
  it("Production never allows publishing and states commerce is closed", () => {
    const env = adminEnvironment({ VERCEL_ENV: "production", PREVIEW_CATALOG_PUBLISH_ENABLED: "true" });
    expect(env.publishing).toBe(false);
    expect(env.commerce).toMatch(/kapalı/);
  });
  it("Preview publishing requires the explicit flag", () => {
    expect(adminEnvironment({ VERCEL_ENV: "preview" }).publishing).toBe(false);
    expect(adminEnvironment({ VERCEL_ENV: "preview", PREVIEW_CATALOG_PUBLISH_ENABLED: "true" }).publishing).toBe(true);
  });
  it("local development never publishes", () => {
    expect(adminEnvironment({ PREVIEW_CATALOG_PUBLISH_ENABLED: "true" }).publishing).toBe(false);
  });
});
