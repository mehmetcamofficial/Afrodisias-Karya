import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CmsError, createCmsProduct, getCmsProduct, transitionCmsProduct, updateCmsProduct } from "../../db/postgres/cms-repository";
import { createPendingOrder, listProducts } from "../../db/postgres/repository";
import type { ProductInput } from "../../lib/cms-validation";
import { attachMedia, createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const actor = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;

const complete = (over: Partial<ProductInput> = {}): ProductInput & { id: string } => ({
  id: "fam-500", sku: "AD-TEST-500", category: "glass", size: "500 ml", priceKurus: 99000, currency: "TRY", stock: 4, tags: [],
  priceEurCents: null, priceUsdCents: null, packaging: "glass_bottle", netVolumeMl: 500, netWeightG: null, sizeFamily: "test-fam", shipsTo: ["TR"],
  tr: { name: "Test 500", description: "Açıklama", seoTitle: "", seoDescription: "", origin: "", ingredients: "", usage: "", storage: "" },
  en: {}, ...over,
} as ProductInput & { id: string });

const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? `${error.code}: ${error.message}` : String(error); } };
/** Runs a BEGIN…COMMIT script on a dedicated connection and always ends its transaction. */
const onOneConnection = async (sql: string) => {
  const client = await pool.connect();
  try { await client.query(sql); } finally { await client.query("ROLLBACK").catch(() => undefined); client.release(); }
};
const approve = async (id: string, from = 1) => {
  await transitionCmsProduct(db, id, from, "submit", actor, "", 2000);
  await transitionCmsProduct(db, id, from + 1, "approve", actor, "", 2100);
  return from + 2;
};

run("Faz 13B catalogue commerce against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("0007 leaves the 13 seeded drafts untouched: no price, SKU, packaging or stock is created", async () => {
    const rows = (await pool.query(`SELECT status, active, stock, sku, packaging, price_eur_cents, price_usd_cents, ships_to, size_family FROM products`)).rows;
    expect(rows).toHaveLength(13);
    for (const r of rows) expect(r).toEqual({ status: "draft", active: false, stock: 0, sku: null, packaging: null, price_eur_cents: null, price_usd_cents: null, ships_to: ["TR"], size_family: null });
    const blockers = (await pool.query("SELECT product_publish_blockers(p) AS b FROM products p WHERE id = 'glass-500'")).rows[0].b;
    expect(blockers).toEqual(["sku", "packaging", "stock", "content_tr", "photo"]);
  });

  it("publication requires SKU, packaging, TR content, stock and a real photo — and lists what is missing", async () => {
    await createCmsProduct(db, complete({ sku: null, packaging: null }), actor, 1000);
    const v = await approve("fam-500");
    expect(await codeOf(transitionCmsProduct(db, "fam-500", v, "publish", actor, "", 3000))).toMatch(/invalid_state: Yayımlanamaz; eksik: SKU, ambalaj tipi, onaylı ürün fotoğrafı/);
    expect((await getCmsProduct(db, "fam-500"))?.publishBlockers).toEqual(["sku", "packaging", "photo"]);
    expect(await listProducts(db)).toEqual([]);
  });

  it("a concept or range image never stands in for a product photo", async () => {
    await createCmsProduct(db, complete(), actor, 1000);
    await attachMedia(pool, "fam-500", "concept");
    await attachMedia(pool, "fam-500", "range");
    await attachMedia(pool, "fam-500", "editorial");
    const v = await approve("fam-500");
    expect(await codeOf(transitionCmsProduct(db, "fam-500", v, "publish", actor, "", 3000))).toMatch(/fotoğrafı/);
    await attachMedia(pool, "fam-500", "photo");
    expect(await codeOf(transitionCmsProduct(db, "fam-500", v, "publish", actor, "", 3000))).toBe("ok");
    expect((await listProducts(db)).map((r) => r.id)).toEqual(["fam-500"]);
  });

  it("an experience may use an editorial image; a bottle may not", async () => {
    await createCmsProduct(db, complete({ id: "exp", sku: "AD-EXP-1", category: "subscription", packaging: "experience", sizeFamily: null }), actor, 1000);
    await attachMedia(pool, "exp", "editorial");
    const v = await approve("exp");
    expect(await codeOf(transitionCmsProduct(db, "exp", v, "publish", actor, "", 3000))).toBe("ok");
  });

  it("the database trigger blocks draft → published and incomplete publication on ANY write path", async () => {
    await expect(pool.query("UPDATE products SET status='published', active=true WHERE id='glass-500'")).rejects.toThrow(/publish_requires_approved/);
    await expect(pool.query(`INSERT INTO products(id,name,price_kurus,stock,active,updated_at,status,sku,packaging)
      VALUES ('raw','Raw',100,1,true,0,'published','AD-RAW','tin')`)).rejects.toThrow(/publish_requires_approved/);
    await pool.query("UPDATE products SET status='in_review' WHERE id='glass-500'");
    await pool.query("UPDATE products SET status='approved' WHERE id='glass-500'");
    await expect(pool.query("UPDATE products SET status='published', active=true WHERE id='glass-500'")).rejects.toThrow(/publish_blocked: sku,packaging,stock,content_tr,photo/);
    expect((await pool.query("SELECT count(*)::int AS n FROM products WHERE status='published'")).rows[0].n).toBe(0);
  });

  it("editing a published product is refused; unpublishing and re-publishing re-runs the policy", async () => {
    await createCmsProduct(db, complete(), actor, 1000);
    await attachMedia(pool, "fam-500", "photo");
    let v = await approve("fam-500");
    await transitionCmsProduct(db, "fam-500", v, "publish", actor, "", 3000); v++;
    expect(await codeOf(updateCmsProduct(db, "fam-500", v, complete({ priceKurus: 1 }), actor, 4000))).toMatch(/invalid_state/);
    await transitionCmsProduct(db, "fam-500", v, "unpublish", actor, "", 5000); v++;
    expect(await codeOf(transitionCmsProduct(db, "fam-500", v, "publish", actor, "", 6000))).toMatch(/invalid_state/); // draft again
  });

  it("stores EUR/USD only when set, as entered — never derived — and exposes size_family/ships_to", async () => {
    await createCmsProduct(db, complete({ priceEurCents: 3150 }), actor, 1000);
    const p = await getCmsProduct(db, "fam-500");
    expect(p).toMatchObject({ priceKurus: 99000, priceEurCents: 3150, priceUsdCents: null, sizeFamily: "test-fam", shipsTo: ["TR"], packaging: "glass_bottle", netVolumeMl: 500 });
    await expect(pool.query("UPDATE products SET price_usd_cents = 0 WHERE id='fam-500'")).rejects.toThrow(/products_price_usd_positive/);
    await expect(pool.query("UPDATE products SET currency = 'EUR' WHERE id='fam-500'")).rejects.toThrow(/products_base_currency_try/);
    await expect(pool.query("UPDATE products SET ships_to = '{tr}' WHERE id='fam-500'")).rejects.toThrow(/products_ships_to_iso2/);
  });

  it("SKU is unique across products", async () => {
    await createCmsProduct(db, complete(), actor, 1000);
    await expect(createCmsProduct(db, complete({ id: "other" }), actor, 1000)).rejects.toThrow(/products_sku_unique/);
  });

  it("TR/EN content fields round-trip through the CMS", async () => {
    await createCmsProduct(db, complete({
      tr: { name: "Test 500", description: "Açıklama", seoTitle: "", seoDescription: "", origin: "Ataeymir", ingredients: "", usage: "Salata", storage: "Serin" },
      en: { name: "Test 500 EN", description: "Description", seoTitle: "", seoDescription: "", origin: "Ataeymir", ingredients: "", usage: "Salads", storage: "Cool" },
    }), actor, 1000);
    expect(await getCmsProduct(db, "fam-500")).toMatchObject({ tr: { origin: "Ataeymir", usage: "Salata", storage: "Serin", ingredients: "" }, en: { usage: "Salads" } });
  });

  it("orders are recorded as TRY; rows without the column read as TRY", async () => {
    await pool.query(`INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,status,payment_provider,created_at)
      VALUES ('old','A','a@b.co','1','x','[]',100,'payment_pending','iyzico',1)`);
    await createPendingOrder(db, { id: "new", customerName: "A", email: "a@b.co", phone: "1", address: "x", itemsJson: "[]", totalKurus: 200, createdAt: 2 });
    expect((await pool.query("SELECT id, currency FROM orders ORDER BY id")).rows).toEqual([{ id: "new", currency: "TRY" }, { id: "old", currency: "TRY" }]);
    await expect(pool.query("UPDATE orders SET currency='GBP'")).rejects.toThrow(/orders_currency_check/);
  });

  it("migration 0007 is idempotent and its rollback is safe: up → up → down → up", async () => {
    const up = readFileSync("db/postgres/0007_catalog_commerce.sql", "utf8");
    const down = readFileSync("db/postgres/0007_catalog_commerce.down.sql", "utf8");
    const columns = async () => (await pool.query(`SELECT string_agg(table_name||'.'||column_name, ',' ORDER BY table_name, column_name) AS c
      FROM information_schema.columns WHERE table_schema='public'`)).rows[0].c as string;
    const after = await columns();
    await pool.query(up);
    expect(await columns()).toBe(after);
    await pool.query(down);
    const before = await columns();
    expect(before).not.toMatch(/price_eur_cents|ships_to|orders\.currency|product_translations\.usage/);
    expect((await pool.query("SELECT count(*)::int AS n FROM products WHERE status='draft'")).rows[0].n).toBe(13); // no data lost
    expect((await pool.query("SELECT 1 FROM schema_migrations WHERE version='0007_catalog_commerce'")).rows).toHaveLength(0);
    await pool.query(up);
    expect(await columns()).toBe(after);
    expect((await pool.query("SELECT 1 FROM schema_migrations WHERE version='0007_catalog_commerce'")).rows).toHaveLength(1);
  });

  it("rollback refuses to discard 0007 data", async () => {
    await pool.query("UPDATE products SET price_eur_cents = 3200 WHERE id='glass-500'");
    await expect(onOneConnection(readFileSync("db/postgres/0007_catalog_commerce.down.sql", "utf8"))).rejects.toThrow(/rollback stopped/);
    expect((await pool.query("SELECT price_eur_cents FROM products WHERE id='glass-500'")).rows[0].price_eur_cents).toBe(3200);
  });

  it("0007 stops instead of guessing when a non-TRY base price exists", async () => {
    await pool.query(readFileSync("db/postgres/0007_catalog_commerce.down.sql", "utf8"));
    await pool.query("UPDATE products SET currency='EUR' WHERE id='glass-500'");
    await expect(onOneConnection(readFileSync("db/postgres/0007_catalog_commerce.sql", "utf8"))).rejects.toThrow(/0007 stopped/);
    expect((await pool.query("SELECT 1 FROM schema_migrations WHERE version='0007_catalog_commerce'")).rows).toHaveLength(0);
  });
});
