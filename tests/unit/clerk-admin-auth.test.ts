import { auth, currentUser } from "@clerk/nextjs/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApiGuard } from "../../app/admin-auth";
import { getChatGPTUser } from "../../app/chatgpt-auth";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));
vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser: vi.fn() }));

const email = "admin@example.test";
const userId = "user_test";

describe("Preview admin authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("ADMIN_EMAILS", email);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 without a Clerk session and ignores legacy header-based identity", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    expect((await adminApiGuard())?.status).toBe(401);
    expect(getChatGPTUser).not.toHaveBeenCalled();
    expect(currentUser).not.toHaveBeenCalled();
  });

  it.each([
    { address: "someone@example.test", status: "verified", expected: 403 },
    { address: email, status: "unverified", expected: 403 },
    { address: email, status: "verified", expected: null },
  ])("uses a verified primary email ($status, $expected)", async ({ address, status, expected }) => {
    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(currentUser).mockResolvedValue({
      id: userId,
      primaryEmailAddress: { emailAddress: address, verification: { status } },
    } as Awaited<ReturnType<typeof currentUser>>);
    const response = await adminApiGuard();
    expect(response?.status ?? null).toBe(expected);
  });

  it("returns 401 when Preview keys are missing", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "");
    expect((await adminApiGuard())?.status).toBe(401);
    expect(auth).not.toHaveBeenCalled();
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });
});
