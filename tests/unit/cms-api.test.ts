import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as repo from "../../db/postgres/cms-repository";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../db/postgres/cms-repository")>();
  return {
    ...actual,
    findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
    listCmsProducts: vi.fn(async () => []),
    createCmsProduct: vi.fn(async () => ({ id: "x", version: 1, status: "draft" })),
    transitionCmsProduct: vi.fn(async () => ({ id: "x", version: 2, status: "published" })),
    deleteCmsProduct: vi.fn(async () => ({ id: "x" })),
  };
});

const { GET, POST: CREATE } = await import("../../app/api/admin/cms/products/route");
const { POST: ACTION } = await import("../../app/api/admin/cms/products/[id]/actions/route");

const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const json = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: "tin-5l" }) };
const product = { id: "new-oil", category: "glass", size: "250 ml", priceKurus: 55000, stock: 0, tr: { name: "Yeni" } };

describe("CMS API authorization", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("anonymous → 401 on read and write", async () => {
    as(null);
    expect((await GET(new Request("http://localhost/api"))).status).toBe(401);
    expect((await CREATE(json(product))).status).toBe(401);
    expect(repo.createCmsProduct).not.toHaveBeenCalled();
  });

  it("signed-in stranger → 403", async () => {
    as("stranger@example.test");
    expect((await GET(new Request("http://localhost/api"))).status).toBe(403);
  });

  it("viewer can read but not write", async () => {
    as("viewer@example.test");
    expect((await GET(new Request("http://localhost/api"))).status).toBe(200);
    expect((await CREATE(json(product))).status).toBe(403);
  });

  it("editor can create but cannot approve, publish or delete", async () => {
    as("editor@example.test");
    expect((await CREATE(json(product))).status).toBe(201);
    for (const action of ["approve", "publish", "delete", "restore"]) {
      expect((await ACTION(json({ action, expectedVersion: 1, confirmation: "YAYINLA:tin-5l" }), params)).status, action).toBe(403);
    }
    expect(repo.transitionCmsProduct).not.toHaveBeenCalled();
  });

  it("invalid product input → 400 before any database call", async () => {
    as("owner@example.test");
    expect((await CREATE(json({ ...product, priceKurus: -1 }))).status).toBe(400);
    expect(repo.createCmsProduct).not.toHaveBeenCalled();
  });

  it("publishing is closed outside Preview-with-flag, even for owners", async () => {
    as("owner@example.test");
    expect((await ACTION(json({ action: "publish", expectedVersion: 3, confirmation: "YAYINLA:tin-5l" }), params)).status).toBe(403);
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PREVIEW_CATALOG_PUBLISH_ENABLED", "true");
    // Preview auth goes through Clerk; this branch only checks the environment gate wiring.
    expect((await ACTION(json({ action: "publish", expectedVersion: 3, confirmation: "YAYINLA:tin-5l" }), params)).status).toBe(401);
    expect(repo.transitionCmsProduct).not.toHaveBeenCalled();
  });

  it("delete requires the exact typed confirmation", async () => {
    as("owner@example.test");
    expect((await ACTION(json({ action: "delete", expectedVersion: 4, confirmation: "sil" }), params)).status).toBe(400);
    expect(repo.deleteCmsProduct).not.toHaveBeenCalled();
    expect((await ACTION(json({ action: "delete", expectedVersion: 4, confirmation: "SIL:tin-5l" }), params)).status).toBe(200);
  });

  it("Production rejects every CMS call (fail closed)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    as("owner@example.test");
    expect((await GET(new Request("http://localhost/api"))).status).toBe(401);
  });

  it("database failures return 503 without leaking details", async () => {
    as("owner@example.test");
    vi.mocked(repo.listCmsProducts).mockRejectedValueOnce(new Error("password authentication failed for user secret"));
    const response = await GET(new Request("http://localhost/api"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
