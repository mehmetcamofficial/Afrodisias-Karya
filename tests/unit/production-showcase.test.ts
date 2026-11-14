import { afterEach, describe, expect, it, vi } from "vitest";
import { isProductionShowcase } from "../../lib/showcase-mode";
import { POST as postOrder } from "../../app/api/orders/route";
import { requirePostgres } from "../../db/postgres/driver";
import { checkAdmin } from "../../app/admin-auth";

vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn() }));
vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

describe("Production presentation-only release", () => {
  it("defaults to commerce-capable Preview only, never accidentally staging as production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isProductionShowcase()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isProductionShowcase()).toBe(true);
  });

  it("blocks order creation before reading request or opening DB", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.mocked(requirePostgres).mockClear();
    const response = await postOrder(new Request("https://example.test/api/orders", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(requirePostgres).not.toHaveBeenCalled();
  });

  it("fails closed Production admin identity without trusting development headers", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await checkAdmin()).toEqual({ status: "anonymous" });
  });
});
