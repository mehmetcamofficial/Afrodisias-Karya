import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CmsError, listAuditLogs } from "../../db/postgres/cms-repository";
import {
  archiveCost, createAccount, createCategory, createCost, createCounterparty, createEntry, getEntry, listAccounts, listCounterparties, listEntries,
  orderBalances, unitCosts, updateAccount, voidEntry, type ResolvedEntry,
} from "../../db/postgres/finance-repository";
import { convertMinor, parseRate, profitAndLoss } from "../../lib/money";
import { createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const actor = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;
const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? error.code : String(error); } };

const base = { fxRate: "1.000000", fxSource: "base", fxDate: "2026-11-01", baseCurrency: "TRY" as const };
const entry = (over: Partial<ResolvedEntry>): ResolvedEntry => ({
  id: crypto.randomUUID(), kind: "income", occurredOn: "2026-11-01", accountId: "kasa", categoryId: "satis", counterpartyId: null, orderId: null,
  currency: "TRY", amountMinor: 10000, description: "", externalRef: "", idempotencyKey: `key-${crypto.randomUUID()}`, ...base, baseAmountMinor: over.amountMinor ?? 10000, ...over,
});

run("Finance ledger against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    await resetSchema(pool);
    await createAccount(db, { id: "kasa", name: "Kasa", kind: "cash", currency: "TRY" }, actor, 1);
    await createAccount(db, { id: "eur-banka", name: "EUR Banka", kind: "bank", currency: "EUR" }, actor, 1);
    await createCategory(db, { id: "satis", name: "Satış", direction: "income" }, actor, 1);
    await createCategory(db, { id: "ambalaj", name: "Ambalaj", direction: "expense" }, actor, 1);
    await createCounterparty(db, { id: "musteri-a", kind: "customer", name: "Müşteri A", taxId: "", email: "", phone: "", notes: "" }, actor, 1);
  });

  it("posts entries with audit; the same idempotency key replays instead of duplicating", async () => {
    const key = "idem-0001-abc";
    const first = await createEntry(db, entry({ idempotencyKey: key, counterpartyId: "musteri-a" }), actor, 10);
    const replay = await createEntry(db, entry({ idempotencyKey: key, counterpartyId: "musteri-a" }), actor, 11);
    expect(replay).toEqual({ id: first.id, version: 1, replayed: true });
    expect(await listEntries(db)).toHaveLength(1);
    expect(await codeOf(createEntry(db, entry({ idempotencyKey: key, amountMinor: 99 }), actor, 12))).toBe("conflict"); // key reused for different data
    expect((await listAuditLogs(db, { entityType: "finance_entry" })).map((a) => a.action)).toEqual(["finance.entry.income"]);
  });

  it("the same bank/POS reference cannot be collected twice (double-collection guard), even concurrently", async () => {
    const results = await Promise.allSettled([1, 2, 3].map(() => createEntry(db, entry({ kind: "collection", categoryId: null, externalRef: "POS-778899" }), actor, 20)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason.code === "conflict")).toBe(true);
    expect(await listEntries(db, { kinds: ["collection"] })).toHaveLength(1);
  });

  it("enforces account currency, category direction and archived accounts in the same statement", async () => {
    expect(await codeOf(createEntry(db, entry({ currency: "EUR" }), actor, 1))).toBe("invalid_state"); // TRY account, EUR entry
    expect(await codeOf(createEntry(db, entry({ categoryId: "ambalaj" }), actor, 1))).toBe("invalid_state"); // expense category on income
    await updateAccount(db, "kasa", 1, { name: "Kasa", archived: true }, actor, 2);
    expect(await codeOf(createEntry(db, entry({}), actor, 3))).toBe("invalid_state");
    expect(await codeOf(updateAccount(db, "kasa", 1, { name: "x", archived: false }, actor, 4))).toBe("version_mismatch");
  });

  it("stores FX rate, source, date and the converted base amount; DB rejects inconsistent base rows", async () => {
    const rate = parseRate("35.25")!;
    const id = (await createEntry(db, entry({ kind: "expense", categoryId: "ambalaj", accountId: "eur-banka", currency: "EUR", amountMinor: 12345,
      fxRate: "35.250000", fxSource: "TCMB döviz satış", fxDate: "2026-10-31", baseAmountMinor: convertMinor(12345, rate) }), actor, 30)).id;
    expect(await getEntry(db, id)).toMatchObject({ currency: "EUR", amountMinor: 12345, fxRate: "35.2500000000", fxSource: "TCMB döviz satış", fxDate: "2026-10-31", baseAmountMinor: 435161 });
    await expect(pool.query("INSERT INTO finance_entries(id, company_id, kind, occurred_on, account_id, currency, amount_minor, fx_rate, fx_source, fx_date, base_currency, base_amount_minor, idempotency_key, created_by, created_at) VALUES ('x','altindal','payment','2026-11-01','kasa','TRY',100,2,'x','2026-11-01','TRY',200,'raw-key-001','t',1)")).rejects.toThrow();
  });

  it("void = reversal entry + flag in one statement; P&L nets to zero; ledger rows are immutable and undeletable", async () => {
    const { id } = await createEntry(db, entry({ kind: "expense", categoryId: "ambalaj", amountMinor: 5000 }), actor, 40);
    await createEntry(db, entry({ amountMinor: 20000 }), actor, 41);
    await voidEntry(db, id, 1, "Yanlış tutar girildi", actor, 42);
    expect(await codeOf(voidEntry(db, id, 2, "tekrar iptal", actor, 43))).toBe("invalid_state");
    const rows = await listEntries(db);
    expect(rows).toHaveLength(3);
    const reversal = rows.find((r) => r.reversalOf === id)!;
    expect(await codeOf(voidEntry(db, reversal.id, 1, "ters kaydı iptal", actor, 44))).toBe("invalid_state");
    const pl = profitAndLoss(rows.map((r) => ({ kind: r.kind, baseAmountMinor: r.baseAmountMinor, isReversal: r.reversalOf !== null, categoryId: r.categoryId, categoryName: r.categoryName })));
    expect(pl).toMatchObject({ incomeMinor: 20000, expenseMinor: 0, netMinor: 20000 });
    await expect(pool.query("UPDATE finance_entries SET amount_minor = 1 WHERE id = $1", [id])).rejects.toThrow(/immutable/);
    await expect(pool.query("DELETE FROM finance_entries WHERE id = $1", [id])).rejects.toThrow(/append-only/);
    expect((await listAccounts(db)).find((a) => a.id === "kasa")?.balanceMinor).toBe(20000);
  });

  it("links collections to orders and computes outstanding balances; cari receivable", async () => {
    await pool.query("INSERT INTO orders(id, customer_name, email, phone, address, items_json, total_kurus, created_at) VALUES ('ord-1','Test','t@example.test','0','x','[]',150000,1)");
    await createEntry(db, entry({ kind: "income", amountMinor: 150000, counterpartyId: "musteri-a" }), actor, 50);
    await createEntry(db, entry({ kind: "collection", categoryId: null, orderId: "ord-1", amountMinor: 100000, counterpartyId: "musteri-a" }), actor, 51);
    expect(await codeOf(createEntry(db, entry({ kind: "collection", categoryId: null, orderId: "no-such-order" }), actor, 52))).toBe("invalid_state");
    expect((await orderBalances(db))[0]).toMatchObject({ id: "ord-1", totalMinor: 150000, collectedMinor: 100000, outstandingMinor: 50000 });
    expect((await listCounterparties(db))[0]).toMatchObject({ id: "musteri-a", receivableMinor: 50000, payableMinor: 0 });
  });

  it("product cost components roll up to a unit cost in base currency; archive removes them", async () => {
    const c1 = await createCost(db, { id: "c1", productId: "glass-500", component: "bottle", label: "Cam şişe", currency: "TRY", amountMinor: 2500, effectiveFrom: "2026-01-01", ...base, baseAmountMinor: 2500 }, actor, 60);
    await createCost(db, { id: "c2", productId: "glass-500", component: "label", label: "Etiket", currency: "EUR", amountMinor: 10, effectiveFrom: "2026-01-01", fxRate: "35.000000", fxSource: "TCMB", fxDate: "2026-01-01", baseCurrency: "TRY", baseAmountMinor: 350 }, actor, 61);
    await createCost(db, { id: "c3", productId: "glass-500", component: "oil", label: "Gelecek fiyat", currency: "TRY", amountMinor: 9999, effectiveFrom: "2099-01-01", ...base, baseAmountMinor: 9999 }, actor, 62);
    expect((await unitCosts(db, undefined, "2026-11-15")).find((u) => u.productId === "glass-500")).toMatchObject({ unitCostMinor: 2850, components: 2 });
    await archiveCost(db, c1.id, 1, actor, 63);
    expect((await unitCosts(db, undefined, "2026-11-15")).find((u) => u.productId === "glass-500")?.unitCostMinor).toBe(350);
  });

  it("every query is scoped by company (multi-company boundary)", async () => {
    await pool.query("INSERT INTO companies(id, name, base_currency, created_at) VALUES ('baska', 'Başka Şirket', 'EUR', 1)");
    await createEntry(db, entry({}), actor, 70);
    expect(await listEntries(db, {}, "baska")).toEqual([]);
    expect(await codeOf(createEntry(db, entry({}), actor, 71, "baska"))).toBe("invalid_state"); // account belongs to altindal
  });
});
