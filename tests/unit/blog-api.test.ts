import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as blog from "../../db/postgres/blog-repository";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
const gate = vi.hoisted(() => ({ publishing: false }));
vi.mock("../../lib/admin-environment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/admin-environment")>();
  return { ...actual, adminEnvironment: () => ({ ...actual.adminEnvironment(), publishing: gate.publishing }) };
});
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
}));
vi.mock("../../db/postgres/blog-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listBlogPosts: vi.fn(async () => []),
  createBlogPost: vi.fn(async () => ({ id: "x", version: 1, status: "draft" })),
  getBlogPost: vi.fn(async () => ({ tr: { bodyMd: "Temiz metin" }, en: { bodyMd: "" } })),
  transitionBlogPost: vi.fn(async () => ({ id: "x", version: 2, status: "published" })),
  deleteBlogPost: vi.fn(async () => ({ id: "x" })),
}));

const { GET, POST: CREATE } = await import("../../app/api/admin/cms/blog/route");
const { POST: ACTION } = await import("../../app/api/admin/cms/blog/[id]/actions/route");
const { POST: IMPORT } = await import("../../app/api/admin/cms/blog/import/route");

const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const json = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: "yeni-yazi" }) };
const post = { slug: "yeni-yazi", category: "Zeytinyağı Rehberi", author: "Altın Dal", tr: { title: "Yeni yazı" } };

describe("Blog CMS API authorization and guards", () => {
  beforeEach(() => { gate.publishing = false; vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("anonymous 401; viewer reads but cannot write", async () => {
    as(null);
    expect((await GET(new Request("http://localhost/api"))).status).toBe(401);
    expect((await CREATE(json(post))).status).toBe(401);
    as("viewer@example.test");
    expect((await GET(new Request("http://localhost/api"))).status).toBe(200);
    expect((await CREATE(json(post))).status).toBe(403);
    expect(blog.createBlogPost).not.toHaveBeenCalled();
  });

  it("editor creates drafts but cannot approve, schedule, publish, restore or delete", async () => {
    as("editor@example.test");
    expect((await CREATE(json(post))).status).toBe(201);
    for (const action of ["approve", "reject", "publish", "unpublish", "restore"]) {
      expect((await ACTION(json({ action, expectedVersion: 1, confirmation: "YAYINLA:yeni-yazi" }), params)).status, action).toBe(403);
    }
    expect((await ACTION(json({ action: "schedule", expectedVersion: 1, confirmation: "YAYINLA:yeni-yazi", publishAt: Date.now() + 1e6 }), params)).status).toBe(403);
    expect((await ACTION(json({ action: "delete", expectedVersion: 1, confirmation: "SIL:yeni-yazi" }), params)).status).toBe(403);
    expect(blog.transitionBlogPost).not.toHaveBeenCalled();
  });

  it("rejects reserved slugs and invalid media credits", async () => {
    as("owner@example.test");
    expect((await CREATE(json({ ...post, slug: "tarifler" }))).status).toBe(409);
    expect((await CREATE(json({ ...post, cover: { url: "https://example.com/a.jpg", alt: "Görsel" } }))).status).toBe(400);
    expect((await CREATE(json({ ...post, cover: { url: "javascript:alert(1)", alt: "x" } }))).status).toBe(400);
  });

  it("publishing is gated by environment and typed confirmation, and blocked by unresolved review notes", async () => {
    as("owner@example.test");
    expect((await ACTION(json({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:yeni-yazi" }), params)).status).toBe(403);
    gate.publishing = true;
    expect((await ACTION(json({ action: "publish", expectedVersion: 1, confirmation: "evet" }), params)).status).toBe(400);
    vi.mocked(blog.getBlogPost).mockResolvedValueOnce({ tr: { bodyMd: "> Yayın öncesi doğrulanacaklar: ..." }, en: { bodyMd: "" } } as never);
    expect((await ACTION(json({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:yeni-yazi" }), params)).status).toBe(422);
    expect((await ACTION(json({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:yeni-yazi" }), params)).status).toBe(200);
  });

  it("import accepts only code drafts", async () => {
    as("editor@example.test");
    expect((await IMPORT(json({ slug: "zeytinyagli-kereviz" }))).status).toBe(201);
    expect(vi.mocked(blog.createBlogPost).mock.calls[0][4]).toBe("code-import");
    expect((await IMPORT(json({ slug: "yok-boyle-yazi" }))).status).toBe(404);
  });
});
