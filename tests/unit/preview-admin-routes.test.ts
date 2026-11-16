import { auth, currentUser } from "@clerk/nextjs/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminForbidden } from "../../app/components/admin-forbidden";
import ProductAdmin from "../../app/admin/urunler/page";
import { requirePostgres } from "../../db/postgres/driver";
import { findAdminRole } from "../../db/postgres/cms-repository";
import { loadAdminSnapshot } from "../../lib/admin-data";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));
vi.mock("../../lib/admin-data", () => ({ loadAdminSnapshot: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({
  requirePostgres: vi.fn(() => ({ query: vi.fn(() => { throw new Error("Unexpected database query"); }) })),
}));
vi.mock("../../db/postgres/cms-repository", async (original) => ({
  ...(await original<typeof import("../../db/postgres/cms-repository")>()),
  findAdminRole: vi.fn(),
}));
vi.mock("../../app/components/admin-forbidden", () => ({ AdminForbidden: () => null }));

type Handler = (request: Request, context: { params: Promise<{ id: string; mediaId: string }> }) => Promise<Response>;
const modules = import.meta.glob([
  "../../app/api/admin/**/route.ts",
  "../../app/api/orders/route.ts",
  "../../app/api/products/route.ts",
], { eager: true }) as unknown as Record<string, Record<string, unknown>>;

const operations = Object.entries(modules).flatMap(([file, mod]) =>
  ["GET", "POST", "PATCH", "PUT", "DELETE"].flatMap((method) => {
    if (typeof mod[method] !== "function") return [];
    if (file.endsWith("/api/orders/route.ts") && method === "POST") return [];
    if (file.endsWith("/api/products/route.ts") && method === "GET") return [];
    return [{ file, method, handler: mod[method] as Handler }];
  }),
);

function session(email: string, verified = true, id = "clerk-test-user") {
  vi.mocked(auth).mockResolvedValue({ userId: "clerk-test-user" } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(currentUser).mockResolvedValue({
    id, primaryEmailAddress: { emailAddress: email, verification: { status: verified ? "verified" : "unverified" } },
  } as Awaited<ReturnType<typeof currentUser>>);
}

function request(method: string) {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify({ action: "archive", expectedVersion: 1 }),
  });
}

const context = () => ({ params: Promise.resolve({ id: "test-product", mediaId: "test-media" }) });

describe("Preview admin HTTP handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("ADMIN_EMAILS", "owner@example.test");
    vi.mocked(findAdminRole).mockResolvedValue(null);
    session("outside@example.test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("renders the server-side access denial before loading product data", async () => {
    expect((await ProductAdmin()).type).toBe(AdminForbidden);
    expect(loadAdminSnapshot).not.toHaveBeenCalled();
    expect(requirePostgres).toHaveBeenCalledTimes(1);
  });

  it.each(operations)("$method $file rejects a verified Clerk user without a role", async ({ handler, method }) => {
    expect((await handler(request(method), context())).status).toBe(403);
    expect(findAdminRole).toHaveBeenCalledWith(expect.anything(), "outside@example.test");
    expect(requirePostgres).toHaveBeenCalledTimes(1);
  });

  const ownerEndpoints = operations.filter(({ file, method }) =>
    method === "POST" && (file.endsWith("/prices/route.ts") || file.endsWith("/approval/route.ts")),
  );

  it.each(ownerEndpoints)("$file rejects CMS editors and viewers before approval", async ({ handler, method }) => {
    for (const role of ["editor", "viewer"] as const) {
      vi.mocked(findAdminRole).mockResolvedValue(role);
      expect((await handler(request(method), context())).status).toBe(403);
    }
    expect(requirePostgres).toHaveBeenCalledTimes(2);
  });

  it("rejects a database owner role and a Clerk identity mismatch", async () => {
    const operation = operations.find(({ file }) => file.endsWith("/api/admin/products/route.ts"))!;
    vi.mocked(findAdminRole).mockResolvedValue("owner");
    expect((await operation.handler(request("GET"), context())).status).toBe(403);
    session("owner@example.test", true, "different-clerk-user");
    expect((await operation.handler(request("GET"), context())).status).toBe(403);
    expect(findAdminRole).toHaveBeenCalledTimes(1);
  });
});
