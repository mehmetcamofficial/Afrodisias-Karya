import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkAdmin } from "../../app/admin-auth";
import { publishReviewedProduct } from "../../db/postgres/repository";
import { POST } from "../../app/api/admin/products/publish/route";

vi.mock("../../app/admin-auth", () => ({ checkAdmin: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/repository", () => ({ publishReviewedProduct: vi.fn() }));

const request = (data: unknown) => new Request("https://preview.example.test/api/admin/products/publish", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

const reviewed = {
  id: "glass-250", expectedPriceKurus: 55000, approvedStock: 3,
  confirmation: "YAYINLA:glass-250",
};

describe("Preview-only catalog publication API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "");
    vi.mocked(checkAdmin).mockResolvedValue({
      status: "admin", role: "owner", user: { userId: "user_clerk_fixture", email: "admin@example.test", fullName: null, displayName: "Admin" },
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects publishing by default without touching storage", async () => {
    expect((await POST(request(reviewed))).status).toBe(403);
    expect(publishReviewedProduct).not.toHaveBeenCalled();
  });

  it("rejects publishing outside Preview even if feature flag is enabled", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    expect((await POST(request(reviewed))).status).toBe(403);
    expect(publishReviewedProduct).not.toHaveBeenCalled();
  });

  it("rejects anonymous requests before checking the publish gate", async () => {
    vi.mocked(checkAdmin).mockResolvedValue({ status: "anonymous" });
    expect((await POST(request(reviewed))).status).toBe(401);
  });

  it("rejects an invalid explicit confirmation", async () => {
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    expect((await POST(request({ ...reviewed, confirmation: "yes" }))).status).toBe(400);
    expect(publishReviewedProduct).not.toHaveBeenCalled();
  });

  it("rejects stale reviewed product snapshots", async () => {
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    vi.mocked(publishReviewedProduct).mockResolvedValue(false);
    expect((await POST(request(reviewed))).status).toBe(409);
  });

  it("allows a verified, gated publish with exact price and positive reviewed stock", async () => {
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    vi.mocked(publishReviewedProduct).mockResolvedValue(true);
    expect((await POST(request(reviewed))).status).toBe(200);
    expect(publishReviewedProduct).toHaveBeenCalledWith(expect.anything(), {
      id: "glass-250", expectedPriceKurus: 55000, approvedStock: 3,
      actorUserId: "user_clerk_fixture", actorEmail: "admin@example.test",
    }, expect.any(Number));
  });
});

describe("legacy publish is owner-only", () => {
  it("rejects an editor even with every other condition met", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    vi.mocked(checkAdmin).mockResolvedValue({
      status: "admin", role: "editor", user: { userId: "user_editor", email: "editor@example.test", fullName: null, displayName: "Editor" },
    });
    const response = await POST(new Request("http://localhost/api/admin/products/publish", { method: "POST", body: "{}" }));
    expect(response.status).toBe(403);
    vi.unstubAllEnvs();
  });
});
