import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as repo from "../../db/postgres/finance-repository";
import { can } from "../../lib/cms-permissions";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer", "acc@example.test": "accountant" } as Record<string, string>)[email] ?? null),
}));
vi.mock("../../db/postgres/finance-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  baseCurrency: vi.fn(async () => "TRY"),
  listAccounts: vi.fn(async () => []),
  listEntries: vi.fn(async () => []),
  listAccountsForReport: vi.fn(async () => []),
  orderBalances: vi.fn(async () => []),
  createAccount: vi.fn(async () => ({ id: "kasa", version: 1 })),
  createEntry: vi.fn(async () => ({ id: "e1", version: 1, replayed: false })),
  voidEntry: vi.fn(async () => ({ id: "e1", version: 2 })),
}));

const entries = await import("../../app/api/admin/finance/entries/route");
const accounts = await import("../../app/api/admin/finance/accounts/route");
const voidRoute = await import("../../app/api/admin/finance/entries/[id]/void/route");
const reports = await import("../../app/api/admin/finance/reports/route");
const users = await import("../../app/api/admin/cms/users/route");

const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (q = "") => new Request(`http://localhost/api${q}`);
const income = { kind: "income", occurredOn: "2026-11-15", accountId: "kasa", categoryId: "satis", currency: "TRY", amountMinor: 12345, idempotencyKey: "ui-1234567890" };

describe("finance RBAC", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it("anonymous → 401 everywhere, before any validation", async () => {
    as(null);
    expect((await entries.GET(get())).status).toBe(401);
    expect((await entries.POST(post({ garbage: true }))).status).toBe(401);
    expect((await accounts.POST(post({}))).status).toBe(401);
    expect((await voidRoute.POST(post({}), { params: Promise.resolve({ id: "e1" }) })).status).toBe(401);
    expect((await reports.GET(get())).status).toBe(401);
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it("editor and viewer (CMS roles) cannot read or write finance", async () => {
    for (const email of ["editor@example.test", "viewer@example.test"]) {
      as(email);
      expect((await entries.GET(get())).status, email).toBe(403);
      expect((await entries.POST(post(income))).status, email).toBe(403);
      expect((await reports.GET(get())).status, email).toBe(403);
    }
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it("accountant reads and writes finance but cannot manage users or touch CMS (no privilege escalation)", async () => {
    as("acc@example.test");
    expect((await entries.GET(get())).status).toBe(200);
    expect((await entries.POST(post(income))).status).toBe(201);
    expect((await users.POST(post({ email: "acc@example.test", role: "editor" }))).status).toBe(403);
    expect(can("accountant", "cms.read")).toBe(false);
    expect(can("accountant", "product.publish")).toBe(false);
    expect(can("editor", "finance.read")).toBe(false);
  });

  it("owner can do everything; replay returns 200 with the original id", async () => {
    as("owner@example.test");
    vi.mocked(repo.createEntry).mockResolvedValueOnce({ id: "e1", version: 1, replayed: true });
    const response = await entries.POST(post(income));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "e1", replayed: true });
  });
});

describe("finance input validation (server-side)", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.clearAllMocks(); as("owner@example.test"); });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects floats, negatives, unknown currency, missing category and order on non-collections", async () => {
    for (const bad of [
      { ...income, amountMinor: 12.5 }, { ...income, amountMinor: -100 }, { ...income, amountMinor: 0 }, { ...income, currency: "GBP" },
      { ...income, categoryId: null }, { ...income, orderId: "ord-1" }, { ...income, idempotencyKey: "short" }, { ...income, occurredOn: "2026-13-45" },
      { ...income, externalRef: "<script>" },
    ]) expect((await entries.POST(post(bad))).status, JSON.stringify(bad)).toBe(400);
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it("foreign currency without rate/source/date is refused (422); with them, the base amount is computed server-side", async () => {
    expect((await entries.POST(post({ ...income, currency: "EUR" }))).status).toBe(422);
    const ok = await entries.POST(post({ ...income, currency: "EUR", amountMinor: 10000, rate: "35.25", rateSource: "TCMB döviz alış", rateDate: "2026-11-14" }));
    expect(ok.status).toBe(201);
    expect(vi.mocked(repo.createEntry).mock.calls[0][1]).toMatchObject({ currency: "EUR", amountMinor: 10000, fxRate: "35.250000", fxSource: "TCMB döviz alış", baseAmountMinor: 352500, baseCurrency: "TRY" });
  });

  it("void requires a reason", async () => {
    expect((await voidRoute.POST(post({ expectedVersion: 1, reason: "x" }), { params: Promise.resolve({ id: "e1" }) })).status).toBe(400);
    expect((await voidRoute.POST(post({ expectedVersion: 1, reason: "Yanlış hesap" }), { params: Promise.resolve({ id: "e1" }) })).status).toBe(200);
  });
});
