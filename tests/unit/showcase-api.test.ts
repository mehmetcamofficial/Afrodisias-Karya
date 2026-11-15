import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as repo from "../../db/postgres/showcase-repository";
import { collectionInputSchema, experienceInputSchema, UNVERIFIED_CLAIM } from "../../lib/showcase-validation";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
const gate = vi.hoisted(() => ({ publishing: false }));
vi.mock("../../lib/admin-environment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/admin-environment")>();
  return { ...actual, adminEnvironment: () => ({ ...actual.adminEnvironment(), publishing: gate.publishing }) };
});
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
  listAuditLogs: vi.fn(async () => []),
}));
vi.mock("../../db/postgres/showcase-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listCollections: vi.fn(async () => []),
  createCollection: vi.fn(async () => ({ id: "c", version: 1, status: "draft" })),
  getCollection: vi.fn(async () => ({ tr: { title: "Hediye", intro: "Sade metin" }, en: { title: "", intro: "" } })),
  setCollectionProducts: vi.fn(async () => ({ id: "c", version: 2, status: "draft" })),
  transitionCollection: vi.fn(async () => ({ id: "c", version: 2, status: "published" })),
  createExperienceSection: vi.fn(async () => ({ id: "s", version: 1, status: "draft" })),
  getExperienceSection: vi.fn(async () => ({ tr: { title: "Hasat", lead: "", bodyMd: "Organik sertifikalı ödüllü yağ" }, en: { title: "", lead: "", bodyMd: "" } })),
  transitionExperienceSection: vi.fn(async () => ({ id: "s", version: 2, status: "published" })),
}));

const collections = await import("../../app/api/admin/cms/collections/route");
const collectionActions = await import("../../app/api/admin/cms/collections/[id]/actions/route");
const collectionProducts = await import("../../app/api/admin/cms/collections/[id]/products/route");
const experience = await import("../../app/api/admin/cms/experience/route");
const experienceActions = await import("../../app/api/admin/cms/experience/[id]/actions/route");

const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const req = (body: unknown, method = "POST") => new Request("http://localhost/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const p = (id: string) => ({ params: Promise.resolve({ id }) });
const col = { slugTr: "hediye-seckisi", tr: { title: "Hediye seçkisi" } };
const sec = { kind: "harvest", tr: { title: "Hasat" } };

describe("collections & experience API — authorization and privilege escalation", () => {
  beforeEach(() => { gate.publishing = false; vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("anonymous callers get 401 on every read and write", async () => {
    as(null);
    expect((await collections.GET(new Request("http://localhost/api"))).status).toBe(401);
    expect((await collections.POST(req(col))).status).toBe(401);
    expect((await collectionProducts.PUT(req({ expectedVersion: 1, productIds: [] }, "PUT"), p("c"))).status).toBe(401);
    expect((await experience.POST(req(sec))).status).toBe(401);
    expect((await experienceActions.POST(req({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:s" }), p("s"))).status).toBe(401);
    expect(repo.createCollection).not.toHaveBeenCalled();
  });

  it("viewer reads only; editor writes drafts but cannot publish, unpublish or restore", async () => {
    as("viewer@example.test");
    expect((await collections.GET(new Request("http://localhost/api"))).status).toBe(200);
    expect((await collections.POST(req(col))).status).toBe(403);
    as("editor@example.test");
    expect((await collections.POST(req(col))).status).toBe(201);
    expect((await collectionProducts.PUT(req({ expectedVersion: 1, productIds: ["glass-500", "tin-5l"] }, "PUT"), p("c"))).status).toBe(200);
    for (const action of ["publish", "unpublish", "restore"]) {
      expect((await collectionActions.POST(req({ action, expectedVersion: 1, confirmation: "YAYINLA:c" }), p("c"))).status, action).toBe(403);
    }
    expect((await collectionActions.POST(req({ action: "archive", expectedVersion: 1 }), p("c"))).status).toBe(200);
    expect(repo.transitionCollection).toHaveBeenCalledTimes(1);
  });

  it("owner publishing needs the Preview gate and the exact typed confirmation", async () => {
    as("owner@example.test");
    expect((await collectionActions.POST(req({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:c" }), p("c"))).status).toBe(403);
    gate.publishing = true;
    expect((await collectionActions.POST(req({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:other" }), p("c"))).status).toBe(400);
    expect((await collectionActions.POST(req({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:c" }), p("c"))).status).toBe(200);
  });

  it("refuses to publish unverified certification/award/organic claims", async () => {
    as("owner@example.test"); gate.publishing = true;
    const response = await experienceActions.POST(req({ action: "publish", expectedVersion: 1, confirmation: "YAYINLA:s" }), p("s"));
    expect(response.status).toBe(422);
    expect(repo.transitionExperienceSection).not.toHaveBeenCalled();
  });

  it("rejects invalid data before touching the database (400)", async () => {
    as("owner@example.test");
    for (const bad of [
      { ...col, slugTr: "Büyük Harf" },
      { ...col, tr: { title: "" } },
      { ...col, slugEn: "gift-edit" }, // EN slug without EN title
      { ...col, cover: { url: "javascript:alert(1)", alt: "x" } },
      { ...col, cover: { url: "https://example.com/a.jpg", alt: "x" } }, // external without credit/license
    ]) expect((await collections.POST(req(bad))).status, JSON.stringify(bad)).toBe(400);
    expect((await collectionProducts.PUT(req({ expectedVersion: 1, productIds: ["a-1", "a-1"] }, "PUT"), p("c"))).status).toBe(400);
    expect((await experience.POST(req({ ...sec, kind: "casino" }))).status).toBe(400);
    expect((await experience.POST(req({ ...sec, media: [{ type: "video", url: "/v.mp4", alt: "x" }] }))).status).toBe(400); // video without poster
    expect((await experience.POST(req({ ...sec, media: [{ type: "image", url: "//evil.example/x.png", alt: "x" }] }))).status).toBe(400); // protocol-relative
    expect(repo.createCollection).not.toHaveBeenCalled();
    expect(repo.createExperienceSection).not.toHaveBeenCalled();
  });
});

describe("validation helpers", () => {
  it("claim detector is Unicode-aware and ignores harmless words", () => {
    expect(UNVERIFIED_CLAIM.test("Ödüllü yağ")).toBe(true);
    expect(UNVERIFIED_CLAIM.test("organik tarım")).toBe(true);
    expect(UNVERIFIED_CLAIM.test("Coğrafi işaretli ürün")).toBe(true);
    expect(UNVERIFIED_CLAIM.test("[KAYNAK GEREKLİ] notu")).toBe(true);
    expect(UNVERIFIED_CLAIM.test("Ekim sonunda elle hasat edilir.")).toBe(false);
  });
  it("schemas accept a complete TR/EN record with video poster", () => {
    expect(collectionInputSchema.safeParse({ ...col, slugEn: "gift-edit", en: { title: "Gift edit" } }).success).toBe(true);
    expect(experienceInputSchema.safeParse({ ...sec, media: [{ type: "video", url: "/v.mp4", poster: "/p.webp", alt: "Hasat" }] }).success).toBe(true);
  });
});
