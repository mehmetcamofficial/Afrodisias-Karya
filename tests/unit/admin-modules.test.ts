import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as repo from "../../db/postgres/cms-repository";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
  listAdminUsers: vi.fn(async () => []),
  upsertAdminUser: vi.fn(async () => ({ email: "x" })),
  listAuditLogs: vi.fn(async () => []),
}));

const users = await import("../../app/api/admin/cms/users/route");
const audit = await import("../../app/api/admin/cms/audit/route");
const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("users & roles API", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test,second-owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("only owners can list or change roles", async () => {
    as(null); expect((await users.GET()).status).toBe(401);
    as("editor@example.test"); expect((await users.GET()).status).toBe(403);
    expect((await users.POST(post({ email: "new@example.test", role: "editor" }))).status).toBe(403);
    as("viewer@example.test"); expect((await users.POST(post({ email: "viewer@example.test", role: "editor" }))).status).toBe(403);
    expect(repo.upsertAdminUser).not.toHaveBeenCalled();
    as("owner@example.test"); expect((await users.GET()).status).toBe(200);
  });

  it("cannot create owners, touch ADMIN_EMAILS owners or change own account", async () => {
    as("owner@example.test");
    expect((await users.POST(post({ email: "x@example.test", role: "owner" }))).status).toBe(400);
    expect((await users.POST(post({ email: "second-owner@example.test", role: "viewer" }))).status).toBe(409);
    expect((await users.POST(post({ email: "OWNER@example.test", role: "viewer" }))).status).toBe(409);
    expect((await users.POST(post({ email: "new@example.test", role: "editor" }))).status).toBe(200);
    expect(vi.mocked(repo.upsertAdminUser).mock.calls[0].slice(1, 5)).toEqual(["new@example.test", "editor", false, "owner@example.test"]);
  });
});

describe("audit API", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());
  it("viewer can read; filters are sanitised", async () => {
    as(null); expect((await audit.GET(new Request("http://localhost/api"))).status).toBe(401);
    as("viewer@example.test");
    expect((await audit.GET(new Request("http://localhost/api?type=blog_post&action=x';drop&before=12"))).status).toBe(200);
    expect(vi.mocked(repo.listAuditLogs).mock.calls[0][1]).toMatchObject({ entityType: "blog_post", actionPrefix: undefined, before: 12 });
  });
});
