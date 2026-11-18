import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as media from "../../db/postgres/product-cms-repository";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../db/postgres/cms-repository")>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
}));
vi.mock("../../db/postgres/product-cms-repository", () => ({
  approveProductPrice: vi.fn(async () => ({ id: "x", currency: "TRY", amountMinor: 89000 })),
  revokeProductPrice: vi.fn(async () => ({ id: "x", currency: "TRY" })),
  addProductMedia: vi.fn(async () => ({ id: "m-1", url: "/media/m-1" })),
  setMediaApproval: vi.fn(async () => ({ id: "m-1", approved: true })),
  unlinkProductMedia: vi.fn(async () => ({ id: "m-1" })),
}));

const { POST: PRICES } = await import("../../app/api/admin/cms/products/[id]/prices/route");
const { POST: ADD_MEDIA } = await import("../../app/api/admin/cms/products/[id]/media/route");
const { DELETE: UNLINK } = await import("../../app/api/admin/cms/products/[id]/media/[mediaId]/route");
const { POST: APPROVE_MEDIA } = await import("../../app/api/admin/cms/media/[mediaId]/approval/route");

const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const json = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: "glass-500", mediaId: "m-1" }) };

/** A minimal valid PNG header of the given size (bytes after IHDR are irrelevant to sniffing). */
const png = (w: number, h: number) => {
  const b = new Uint8Array(new ArrayBuffer(64));
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w); new DataView(b.buffer).setUint32(20, h);
  return b;
};
const upload = (bytes: Uint8Array<ArrayBuffer>, fields: Record<string, string>, type = "image/png") => {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], "p.png", { type }));
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("http://localhost/api", { method: "POST", body: form });
};

describe("Faz 13C: price approval and media API authorization", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("anonymous → 401, editor/viewer → 403 for commercial price approval; nothing reaches the database", async () => {
    as(null);
    expect((await PRICES(json({ action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 }), params)).status).toBe(401);
    for (const who of ["editor@example.test", "viewer@example.test"]) {
      as(who);
      expect((await PRICES(json({ action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 }), params)).status, who).toBe(403);
      expect((await PRICES(json({ action: "revoke", currency: "TRY" }), params)).status, who).toBe(403);
    }
    expect(media.approveProductPrice).not.toHaveBeenCalled();
    expect(media.revokeProductPrice).not.toHaveBeenCalled();
  });

  it("owner approves the exact stated amount, with identity and time", async () => {
    as("owner@example.test");
    expect((await PRICES(json({ action: "approve", currency: "EUR", amountMinor: 3150, expectedVersion: 4 }), params)).status).toBe(200);
    expect(media.approveProductPrice).toHaveBeenCalledWith({}, "glass-500", 4, "EUR", 3150, "owner@example.test", expect.any(Number));
    expect((await PRICES(json({ action: "approve", currency: "GBP", amountMinor: 1, expectedVersion: 1 }), params)).status).toBe(400);
    expect((await PRICES(json({ action: "approve", currency: "TRY", amountMinor: 0, expectedVersion: 1 }), params)).status).toBe(400);
  });

  it("editors may add and remove media but never approve a photo; viewers may do neither", async () => {
    as("viewer@example.test");
    expect((await ADD_MEDIA(json({ url: "/products/concepts/tin-3l.webp", truth: "concept", altTr: "Teneke konsepti" }), params)).status).toBe(403);
    expect((await UNLINK(new Request("http://localhost/api", { method: "DELETE" }), params)).status).toBe(403);
    as("editor@example.test");
    expect((await ADD_MEDIA(json({ url: "/products/concepts/tin-3l.webp", truth: "concept", altTr: "Teneke konsepti" }), params)).status).toBe(201);
    expect((await APPROVE_MEDIA(json({ approve: true }), params)).status).toBe(403);
    expect(media.setMediaApproval).not.toHaveBeenCalled();
    as("owner@example.test");
    expect((await APPROVE_MEDIA(json({ approve: true }), params)).status).toBe(200);
    expect(media.setMediaApproval).toHaveBeenCalledWith({}, "m-1", true, "owner@example.test", expect.any(Number));
  });

  it("a linked repo path can never be declared a real photo, and paths are restricted", async () => {
    as("owner@example.test");
    expect((await ADD_MEDIA(json({ url: "/products/concepts/tin-3l.webp", truth: "photo", altTr: "Teneke" }), params)).status).toBe(422);
    for (const url of ["https://evil.example/x.webp", "/../etc/passwd.png", "/x.svg", "javascript:alert(1)"]) {
      expect((await ADD_MEDIA(json({ url, truth: "concept", altTr: "Görsel" }), params)).status, url).toBe(400);
    }
    expect(media.addProductMedia).not.toHaveBeenCalled();
  });

  it("uploads are validated by their bytes: type mismatch, non-images and small 'photos' are refused", async () => {
    as("editor@example.test");
    expect((await ADD_MEDIA(upload(png(1600, 1200), { truth: "photo", altTr: "Ürün fotoğrafı" }), params)).status).toBe(201);
    expect(media.addProductMedia).toHaveBeenCalledWith({}, expect.objectContaining({ truth: "photo", mime: "image/png", width: 1600, height: 1200, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }), "editor@example.test", expect.any(Number));
    vi.mocked(media.addProductMedia).mockClear();
    expect((await ADD_MEDIA(upload(png(640, 480), { truth: "photo", altTr: "Küçük fotoğraf" }), params)).status).toBe(422); // under 800 px
    expect((await ADD_MEDIA(upload(png(1600, 1200), { truth: "photo", altTr: "Uyuşmaz" }, "image/jpeg"), params)).status).toBe(422);
    expect((await ADD_MEDIA(upload(new TextEncoder().encode("<svg onload=alert(1)>"), { truth: "concept", altTr: "Svg" }, "image/svg+xml"), params)).status).toBe(422);
    expect((await ADD_MEDIA(upload(png(1600, 1200), { truth: "photo", altTr: "" }), params)).status).toBe(400); // alt text required
    expect(media.addProductMedia).not.toHaveBeenCalled();
  });
});
