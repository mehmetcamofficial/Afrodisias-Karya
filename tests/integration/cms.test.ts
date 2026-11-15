import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CmsError, createCmsProduct, deleteCmsProduct, duplicateCmsProduct, getCmsProduct, listAuditLogs, listCmsProducts,
  listProductRevisions, transitionCmsProduct, updateCmsProduct } from "../../db/postgres/cms-repository";
import { listProducts, publishReviewedProduct } from "../../db/postgres/repository";
import type { ProductInput } from "../../lib/cms-validation";
import { createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const actor = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;

const input = (over: Partial<ProductInput> = {}): ProductInput & { id: string } => ({
  id: "test-oil", sku: "AD-TEST-1", category: "glass", size: "500 ml", priceKurus: 99000, currency: "TRY", stock: 5,
  tags: ["erken hasat"], tr: { name: "Test Yağı", description: "Açıklama", seoTitle: "", seoDescription: "" },
  en: { name: "Test Oil", description: "Description" }, ...over,
} as ProductInput & { id: string });

const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? error.code : String(error); } };

run("Product CMS against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("migration keeps the 13 seeded products as inactive drafts", async () => {
    const rows = await listCmsProducts(db);
    expect(rows).toHaveLength(13);
    expect(rows.every((row) => row.status === "draft" && !row.active)).toBe(true);
  });

  it("creates a draft with translations, revision 1 and an audit row in one statement", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    const product = await getCmsProduct(db, "test-oil");
    expect(product).toMatchObject({ status: "draft", active: false, version: 1, sku: "AD-TEST-1", tr: { name: "Test Yağı" }, en: { name: "Test Oil" } });
    expect((await listProductRevisions(db, "test-oil")).map((r) => r.version)).toEqual([1]);
    expect((await listAuditLogs(db, { entityId: "test-oil" }))[0]).toMatchObject({ action: "product.create", actorEmail: actor });
    expect(await codeOf(createCmsProduct(db, input(), actor, 1001))).toBe("conflict");
  });

  it("rejects stale edits (optimistic locking) and keeps history", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    await updateCmsProduct(db, "test-oil", 1, input({ priceKurus: 120000 }), actor, 2000);
    expect(await codeOf(updateCmsProduct(db, "test-oil", 1, input({ priceKurus: 1 }), actor, 3000))).toBe("version_mismatch");
    const product = await getCmsProduct(db, "test-oil");
    expect(product).toMatchObject({ version: 2, priceKurus: 120000 });
    expect((await listProductRevisions(db, "test-oil")).map((r) => r.version)).toEqual([2, 1]);
  });

  it("enforces the review workflow; publishing needs approval, price and stock", async () => {
    await createCmsProduct(db, input({ stock: 0 }), actor, 1000);
    expect(await codeOf(transitionCmsProduct(db, "test-oil", 1, "publish", actor, "", 2000))).toBe("invalid_state");
    await transitionCmsProduct(db, "test-oil", 1, "submit", actor, "", 2000);
    await transitionCmsProduct(db, "test-oil", 2, "approve", actor, "ok", 3000);
    expect(await codeOf(transitionCmsProduct(db, "test-oil", 3, "publish", actor, "", 4000))).toBe("invalid_state"); // stock 0
    expect((await getCmsProduct(db, "test-oil"))?.active).toBe(false);
    const approvals = (await pool.query("SELECT decision FROM publication_approvals WHERE entity_id = 'test-oil' ORDER BY id")).rows.map((r) => r.decision);
    expect(approvals).toEqual(["requested", "approved"]);
  });

  it("publishes an approved product with stock and makes it visible to the storefront", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    await transitionCmsProduct(db, "test-oil", 1, "submit", actor, "", 2000);
    await transitionCmsProduct(db, "test-oil", 2, "approve", actor, "", 3000);
    await transitionCmsProduct(db, "test-oil", 3, "publish", actor, "", 4000);
    expect(await getCmsProduct(db, "test-oil")).toMatchObject({ status: "published", active: true, version: 4 });
    expect((await listProducts(db)).map((row) => row.id)).toEqual(["test-oil"]);
    expect(await codeOf(updateCmsProduct(db, "test-oil", 4, input(), actor, 5000))).toBe("invalid_state"); // published is read-only
    await transitionCmsProduct(db, "test-oil", 4, "unpublish", actor, "", 6000);
    expect(await listProducts(db)).toEqual([]);
  });

  it("editing a reviewed product sends it back to draft", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    await transitionCmsProduct(db, "test-oil", 1, "submit", actor, "", 2000);
    await updateCmsProduct(db, "test-oil", 2, input({ size: "750 ml" }), actor, 3000);
    expect((await getCmsProduct(db, "test-oil"))?.status).toBe("draft");
  });

  it("duplicates content into a new draft with zero stock and no SKU", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    await duplicateCmsProduct(db, "test-oil", "test-oil-2", actor, 2000);
    expect(await getCmsProduct(db, "test-oil-2")).toMatchObject({ status: "draft", stock: 0, sku: null, tr: { name: "Test Yağı (kopya)" }, en: { name: "Test Oil" } });
    expect(await codeOf(duplicateCmsProduct(db, "test-oil", "test-oil-2", actor, 3000))).toBe("conflict");
  });

  it("archives, restores and only deletes archived, unreferenced products", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    expect(await codeOf(deleteCmsProduct(db, "test-oil", 1, actor, 1500))).toBe("invalid_state");
    await transitionCmsProduct(db, "test-oil", 1, "archive", actor, "", 2000);
    expect((await listCmsProducts(db)).some((row) => row.id === "test-oil")).toBe(false);
    await transitionCmsProduct(db, "test-oil", 2, "restore", actor, "", 3000);
    await transitionCmsProduct(db, "test-oil", 3, "archive", actor, "", 4000);
    await pool.query(`INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,status,payment_provider,created_at)
      VALUES ('o1','A','a@b.co','1','x','[{"id":"test-oil","qty":1}]',99000,'payment_pending','iyzico',1)`);
    expect(await codeOf(deleteCmsProduct(db, "test-oil", 4, actor, 5000))).toBe("protected");
    await pool.query("DELETE FROM orders");
    await deleteCmsProduct(db, "test-oil", 4, actor, 6000);
    expect(await getCmsProduct(db, "test-oil")).toBeNull();
    const audit = await listAuditLogs(db, { entityId: "test-oil" });
    expect(audit[0]).toMatchObject({ action: "product.delete" });
    expect(audit.map((row) => row.action)).toContain("product.create"); // audit survives the delete
  });

  it("a failing statement writes nothing: no orphan revision or audit row", async () => {
    await expect(createCmsProduct(db, input({ priceKurus: -5 } as Partial<ProductInput>), actor, 1000)).rejects.toThrow();
    expect((await pool.query("SELECT count(*)::int AS n FROM product_revisions")).rows[0].n).toBe(0);
    expect((await pool.query("SELECT count(*)::int AS n FROM audit_logs")).rows[0].n).toBe(0);
  });

  it("audit log is append-only", async () => {
    await createCmsProduct(db, input(), actor, 1000);
    await expect(pool.query("UPDATE audit_logs SET action = 'x'")).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM audit_logs")).rejects.toThrow(/append-only/);
  });

  it("legacy Preview publish keeps status consistent with active", async () => {
    expect(await publishReviewedProduct(db, { id: "glass-500", expectedPriceKurus: 89000, approvedStock: 3, actorUserId: "u", actorEmail: actor }, 1000)).toBe(true);
    expect(await getCmsProduct(db, "glass-500")).toMatchObject({ status: "published", active: true });
  });
});
