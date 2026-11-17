import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAdminRole, upsertAdminUser } from "../../db/postgres/cms-repository";
import { approveProductPrice } from "../../db/postgres/product-cms-repository";

/**
 * Faz 13C closure: privilege escalation and session manipulation against the
 * Preview (Clerk) admin path. Complements preview-admin-routes.test.ts, which
 * proves every admin handler refuses a verified Clerk user without a role.
 */
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (original) => ({
  ...(await original<typeof import("../../db/postgres/cms-repository")>()),
  findAdminRole: vi.fn(async () => null),
  upsertAdminUser: vi.fn(async () => ({ email: "x" })),
}));
vi.mock("../../db/postgres/product-cms-repository", () => ({
  approveProductPrice: vi.fn(async () => ({ ok: true })),
  revokeProductPrice: vi.fn(), addProductMedia: vi.fn(), setMediaApproval: vi.fn(), unlinkProductMedia: vi.fn(),
}));

const { POST: PRICES } = await import("../../app/api/admin/cms/products/[id]/prices/route");
const { POST: USERS } = await import("../../app/api/admin/cms/users/route");
const { GET: ADMIN_PRODUCTS } = await import("../../app/api/admin/products/route");

const approve = () => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 }) });
const ctx = { params: Promise.resolve({ id: "glass-500" }) };

function session(email: string | null, opts: { verified?: boolean; id?: string } = {}) {
  vi.mocked(auth).mockResolvedValue({ userId: email ? "user_1" : null } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(currentUser).mockResolvedValue(email ? {
    id: opts.id ?? "user_1", fullName: null,
    primaryEmailAddress: { emailAddress: email, verification: { status: opts.verified === false ? "unverified" : "verified" } },
  } as Awaited<ReturnType<typeof currentUser>> : null);
}

describe("Preview admin: escalation and session manipulation are refused server-side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("ADMIN_EMAILS", "owner@example.test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("an allowlisted address with an UNVERIFIED Clerk email gets no admin role", async () => {
    session("owner@example.test", { verified: false });
    expect((await PRICES(approve(), ctx)).status).toBe(403);
    expect(approveProductPrice).not.toHaveBeenCalled();
    expect(findAdminRole).not.toHaveBeenCalled(); // refused before any role lookup
  });

  it("look-alike addresses never match the allowlist", async () => {
    for (const email of ["owner@example.test.evil.io", "owner+x@example.test", "xowner@example.test", "owner@example.tes"]) {
      session(email);
      expect((await PRICES(approve(), ctx)).status, email).toBe(403);
    }
    expect(approveProductPrice).not.toHaveBeenCalled();
  });

  it("spoofed identity headers are ignored on Vercel: no Clerk session → 401 even with an owner header", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "oai-authenticated-user-id": "u", "oai-authenticated-user-email": "owner@example.test" }) as Awaited<ReturnType<typeof headers>>);
    session(null);
    expect((await PRICES(approve(), ctx)).status).toBe(401);
    expect((await ADMIN_PRODUCTS()).status).toBe(401);
    // Also when a stranger IS signed in: the header cannot upgrade them.
    session("stranger@example.test");
    expect((await PRICES(approve(), ctx)).status).toBe(403);
    expect(approveProductPrice).not.toHaveBeenCalled();
  });

  it("Production Clerk keys (pk_live/sk_live) never activate the Preview admin", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_live_fixture");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_live_fixture");
    session("owner@example.test");
    expect((await PRICES(approve(), ctx)).status).toBe(401);
    expect(auth).not.toHaveBeenCalled();
  });

  it("Production rejects every admin call, even for an allowlisted, verified owner", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    session("owner@example.test");
    expect((await PRICES(approve(), ctx)).status).toBe(401);
    expect((await ADMIN_PRODUCTS()).status).toBe(401);
    expect(approveProductPrice).not.toHaveBeenCalled();
  });

  it("a database 'owner' row grants nothing; owners come only from ADMIN_EMAILS", async () => {
    vi.mocked(findAdminRole).mockResolvedValue("owner");
    session("db-owner@example.test");
    expect((await PRICES(approve(), ctx)).status).toBe(403);
  });

  it("an editor cannot escalate: no user management, and the API cannot mint owners", async () => {
    vi.mocked(findAdminRole).mockResolvedValue("editor");
    session("editor@example.test");
    const promote = (role: string) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "editor@example.test", role }) });
    expect((await USERS(promote("owner"))).status).toBe(403);
    expect((await PRICES(approve(), ctx)).status).toBe(403);
    // Even the real owner cannot create another owner through the API.
    session("owner@example.test");
    expect((await USERS(promote("owner"))).status).toBe(400);
    expect(upsertAdminUser).not.toHaveBeenCalled();
  });

  it("the verified, allowlisted owner is accepted and the approval is attributed to that identity", async () => {
    session("OWNER@example.test"); // e-mail case is not identity
    expect((await PRICES(approve(), ctx)).status).toBe(200);
    expect(approveProductPrice).toHaveBeenCalledWith({}, "glass-500", 1, "TRY", 89000, "owner@example.test", expect.any(Number));
  });
});
