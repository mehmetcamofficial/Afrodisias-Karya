import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import { requirePostgres } from "../../db/postgres/driver";
import * as repo from "../../db/postgres/cms-repository";
import { contactConfig, whatsappLink } from "../../lib/contact-config";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn() }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => (email === "viewer@example.test" ? "viewer" : email === "editor@example.test" ? "editor" : null)),
  setInquiryStatus: vi.fn(async () => ({ id: "x" })),
}));

const { POST: CONTACT } = await import("../../app/api/contact/route");
const { PATCH: INQUIRY } = await import("../../app/api/admin/cms/inquiries/route");

const req = (body: unknown, method = "POST") => new Request("http://localhost/api", { method, headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify(body) });
const valid = { name: "Ayşe", email: "Ayse@Example.test", topic: "product", message: "Merhaba, bilgi almak istiyorum.", consent: true, website: "" };
const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);

describe("contact configuration", () => {
  it("hides channels that are unset or malformed instead of inventing them", () => {
    expect(contactConfig({})).toEqual({ whatsapp: null, email: null });
    expect(contactConfig({ NEXT_PUBLIC_WHATSAPP_NUMBER: "+90 555 000", NEXT_PUBLIC_CONTACT_EMAIL: "nope" })).toEqual({ whatsapp: null, email: null });
    expect(contactConfig({ NEXT_PUBLIC_WHATSAPP_NUMBER: "905550000000", NEXT_PUBLIC_CONTACT_EMAIL: "info@example.test" })).toEqual({ whatsapp: "905550000000", email: "info@example.test" });
  });
  it("builds a user-initiated wa.me link with encoded text", () => {
    expect(whatsappLink("905550000000", "Merhaba & selam")).toBe("https://wa.me/905550000000?text=Merhaba%20%26%20selam");
  });
});

describe("POST /api/contact", () => {
  const query = vi.fn();
  beforeEach(() => { query.mockReset(); vi.mocked(requirePostgres).mockReturnValue({ query } as never); });

  it("rejects missing consent and filled honeypot before touching the database", async () => {
    expect((await CONTACT(req({ ...valid, consent: false }))).status).toBe(400);
    expect((await CONTACT(req({ ...valid, website: "http://spam" }))).status).toBe(400);
    expect((await CONTACT(req({ ...valid, email: "x" }))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("stores a consented message with a hashed IP, never the raw IP", async () => {
    query.mockResolvedValue({ rows: [{ id: "1" }], rowCount: 1 });
    expect((await CONTACT(req(valid))).status).toBe(201);
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe("ayse@example.test");
    expect(JSON.stringify(params)).not.toContain("203.0.113.9");
    expect(params[5]).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns 429 when the per-IP window is full (insert yielded no row)", async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect((await CONTACT(req(valid))).status).toBe(429);
  });

  it("returns 503 and does not claim success when the database is unavailable", async () => {
    vi.mocked(requirePostgres).mockImplementation(() => { throw new Error("no db"); });
    const response = await CONTACT(req(valid));
    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: string }).error).toMatch(/kaydedilmedi/);
  });
});

describe("PATCH /api/admin/cms/inquiries RBAC", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); vi.mocked(requirePostgres).mockReturnValue({ query: vi.fn() } as never); });
  afterEach(() => vi.unstubAllEnvs());
  const body = { id: "3f1c2b8e-1d2a-4c3b-9a8e-123456789abc", status: "answered" };

  it("anonymous 401, viewer 403, editor 200", async () => {
    as(null); expect((await INQUIRY(req(body, "PATCH"))).status).toBe(401);
    as("viewer@example.test"); expect((await INQUIRY(req(body, "PATCH"))).status).toBe(403);
    expect(repo.setInquiryStatus).not.toHaveBeenCalled();
    as("editor@example.test"); expect((await INQUIRY(req(body, "PATCH"))).status).toBe(200);
  });
  it("rejects an unknown status with 400", async () => {
    as("owner@example.test");
    expect((await INQUIRY(req({ ...body, status: "deleted" }, "PATCH"))).status).toBe(400);
  });
});
