import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CmsError, createCmsProduct, getCmsProduct, listAuditLogs, transitionCmsProduct, updateCmsProduct } from "../../db/postgres/cms-repository";
import { addProductMedia, approveProductPrice, getMediaBlob, revokeProductPrice, setMediaApproval, unlinkProductMedia } from "../../db/postgres/product-cms-repository";
import { createPendingOrder, listProducts } from "../../db/postgres/repository";
import type { ProductInput } from "../../lib/cms-validation";
import { attachMedia, createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const owner = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;

const input = (over: Partial<ProductInput> = {}): ProductInput & { id: string } => ({
  id: "p13c", sku: "AD-13C-500", category: "glass", size: "500 ml", priceKurus: 99000, currency: "TRY", stock: 3, tags: [],
  priceEurCents: null, priceUsdCents: null, packaging: "glass_bottle", netVolumeMl: 500, netWeightG: null, sizeFamily: null, shipsTo: ["TR"],
  tr: { name: "Test 13C", description: "Açıklama", seoTitle: "", seoDescription: "", origin: "", ingredients: "", usage: "", storage: "" },
  en: { name: "Test 13C EN", description: "Description", seoTitle: "", seoDescription: "", origin: "", ingredients: "", usage: "", storage: "" },
  ...over,
} as ProductInput & { id: string });
const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? `${error.code}: ${error.message}` : String(error); } };
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000006400000049c", "hex");
const toApproved = async (id: string, version = 1) => {
  await transitionCmsProduct(db, id, version, "submit", owner, "", 2000);
  await transitionCmsProduct(db, id, version + 1, "approve", owner, "", 2100);
  return version + 2;
};

run("Faz 13C product CMS against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("seed prices are not approved: the 13 drafts have no approval rows", async () => {
    expect((await pool.query("SELECT count(*)::int AS n FROM product_price_approvals")).rows[0].n).toBe(0);
    expect((await getCmsProduct(db, "glass-500"))?.publishBlockers).toContain("price_try_approval");
  });

  it("approval stores who, when, currency and amount — only for the exact current price", async () => {
    await createCmsProduct(db, input({ priceEurCents: 3150 }), owner, 1000);
    expect(await codeOf(approveProductPrice(db, "p13c", 1, "TRY", 98000, owner, 1500))).toMatch(/^conflict: .*eşleşmiyor/);
    expect(await codeOf(approveProductPrice(db, "p13c", 9, "TRY", 99000, owner, 1500))).toMatch(/^version_mismatch/);
    expect(await codeOf(approveProductPrice(db, "p13c", 1, "USD", 3400, owner, 1500))).toMatch(/USD fiyatı girilmemiş/);
    await approveProductPrice(db, "p13c", 1, "TRY", 99000, owner, 1600);
    await approveProductPrice(db, "p13c", 1, "EUR", 3150, owner, 1700);
    expect((await getCmsProduct(db, "p13c"))?.priceApprovals).toEqual([
      { currency: "EUR", amountMinor: 3150, approvedBy: owner, approvedAt: 1700 },
      { currency: "TRY", amountMinor: 99000, approvedBy: owner, approvedAt: 1600 },
    ]);
    const audit = await listAuditLogs(db, { entityId: "p13c" });
    expect(audit.filter((a) => a.action === "price.approve").map((a) => a.detail)).toEqual([
      { currency: "EUR", amountMinor: 3150, version: 1 }, { currency: "TRY", amountMinor: 99000, version: 1 },
    ]);
  });

  it("changing a price revokes ONLY that currency's approval and records it", async () => {
    await createCmsProduct(db, input({ priceEurCents: 3150 }), owner, 1000);
    await approveProductPrice(db, "p13c", 1, "TRY", 99000, owner, 1100);
    await approveProductPrice(db, "p13c", 1, "EUR", 3150, owner, 1100);
    await updateCmsProduct(db, "p13c", 1, input({ priceEurCents: 3300 }), owner, 2000); // EUR changed, TRY same
    expect((await getCmsProduct(db, "p13c"))?.priceApprovals.map((a) => a.currency)).toEqual(["TRY"]);
    const revoked = (await listAuditLogs(db, { entityId: "p13c" })).find((a) => a.action === "price.revoke");
    expect(revoked).toMatchObject({ actorEmail: "system", detail: { currency: "EUR", amountMinor: 3150, reason: "price_changed" } });
    // Even raw SQL cannot keep a stale approval alive.
    await pool.query("UPDATE products SET price_kurus = 100000 WHERE id = 'p13c'");
    expect((await getCmsProduct(db, "p13c"))?.priceApprovals).toEqual([]);
  });

  it("an unapproved price blocks publication; an unapproved EUR price blocks it too", async () => {
    await createCmsProduct(db, input({ priceEurCents: 3150 }), owner, 1000);
    await attachMedia(pool, "p13c", "photo");
    const v = await toApproved("p13c");
    expect(await codeOf(transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3000))).toMatch(/TL fiyatının ticari onayı, EUR fiyatının ticari onayı/);
    await approveProductPrice(db, "p13c", v, "TRY", 99000, owner, 3100);
    expect(await codeOf(transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3200))).toMatch(/EUR fiyatının ticari onayı/);
    await approveProductPrice(db, "p13c", v, "EUR", 3150, owner, 3300);
    expect(await codeOf(transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3400))).toBe("ok");
    const [row] = await listProducts(db);
    expect(row).toMatchObject({ id: "p13c", priceKurus: 99000, priceEurCents: 3150, priceUsdCents: null });
    // Published: prices and photo approvals are frozen.
    expect(await codeOf(revokeProductPrice(db, "p13c", "TRY", owner, 3500))).toMatch(/invalid_state/);
    expect(await codeOf(setMediaApproval(db, "m-p13c-photo", false, owner, 3500))).toMatch(/invalid_state/);
  });

  it("the storefront and orders never see an unapproved price", async () => {
    await createCmsProduct(db, input(), owner, 1000);
    await attachMedia(pool, "p13c", "photo");
    await approveProductPrice(db, "p13c", 1, "TRY", 99000, owner, 1100);
    const v = await toApproved("p13c");
    await transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3000);
    // Simulate an approval disappearing behind the CMS's back: the public price drops to 0 (not orderable).
    await pool.query("DELETE FROM product_price_approvals WHERE product_id = 'p13c'");
    expect((await listProducts(db))[0]).toMatchObject({ id: "p13c", priceKurus: 0 });
  });

  it("only an APPROVED real photo satisfies publication; concept/range can never be approved", async () => {
    await createCmsProduct(db, input(), owner, 1000);
    await approveProductPrice(db, "p13c", 1, "TRY", 99000, owner, 1100);
    const photo = await addProductMedia(db, { id: "m-00000000-0000-4000-8000-000000000001", productId: "p13c", truth: "photo", mime: "image/png", bytes: png.length,
      width: 1600, height: 1180, altTr: "Ürün", altEn: "Product", credit: "", license: "", data: png, sha256: "a".repeat(64) }, owner, 1200);
    expect(photo.url).toBe("/media/m-00000000-0000-4000-8000-000000000001");
    const concept = await addProductMedia(db, { id: "m-concept", productId: "p13c", truth: "concept", mime: "image/webp", bytes: 1, width: null, height: null,
      altTr: "Konsept", altEn: "", credit: "", license: "", url: "/products/concepts/tin-3l.webp" }, owner, 1200);
    expect(await codeOf(setMediaApproval(db, concept.id, true, owner, 1300))).toMatch(/Konsept veya seri görseli/);
    await expect(pool.query("UPDATE media_assets SET approved_at = 1, approved_by = 'x' WHERE id = 'm-concept'")).rejects.toThrow(/media_assets_approval_truth/);
    const v = await toApproved("p13c");
    expect(await codeOf(transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3000))).toMatch(/onaylı gerçek ürün fotoğrafı/); // uploaded, not approved
    // Approving changes media only, not the product version.
    await setMediaApproval(db, photo.id, true, owner, 3100);
    expect(await codeOf(transitionCmsProduct(db, "p13c", v, "publish", owner, "", 3200))).toBe("ok");
    const media = (await getCmsProduct(db, "p13c"))!.media;
    expect(media.map((m) => [m.truth, Boolean(m.approvedAt)])).toEqual([["photo", true], ["concept", false]]);
    expect((await listAuditLogs(db, { entityId: photo.id }))[0]).toMatchObject({ action: "media.approve", actorEmail: owner });
  });

  it("uploaded bytes round-trip exactly; drafts' images are not public", async () => {
    await createCmsProduct(db, input(), owner, 1000);
    const id = "m-00000000-0000-4000-8000-000000000002";
    await addProductMedia(db, { id, productId: "p13c", truth: "photo", mime: "image/png", bytes: png.length, width: 1600, height: 1180,
      altTr: "Ürün", altEn: "", credit: "", license: "", data: png, sha256: "b".repeat(64) }, owner, 1100);
    const blob = await getMediaBlob(db, id);
    expect(blob?.data.equals(png)).toBe(true);
    expect(blob).toMatchObject({ mime: "image/png", isPublic: false });
    await expect(pool.query("INSERT INTO media_blobs(media_id, data, sha256) VALUES ($1, $2, $3)", [id, Buffer.alloc(4194305), "c".repeat(64)])).rejects.toThrow();
  });

  it("media cannot be added to or removed from a published or archived product", async () => {
    await createCmsProduct(db, input(), owner, 1000);
    await transitionCmsProduct(db, "p13c", 1, "archive", owner, "", 2000);
    expect(await codeOf(addProductMedia(db, { id: "m-x", productId: "p13c", truth: "concept", mime: "image/webp", bytes: 1, width: null, height: null,
      altTr: "Konsept", altEn: "", credit: "", license: "", url: "/x.webp" }, owner, 2100))).toMatch(/invalid_state/);
    await transitionCmsProduct(db, "p13c", 2, "restore", owner, "", 2200);
    await attachMedia(pool, "p13c", "concept");
    expect(await codeOf(unlinkProductMedia(db, "p13c", "m-p13c-concept", owner, 2300))).toBe("ok");
    expect((await getCmsProduct(db, "p13c"))?.media).toEqual([]);
  });

  it("TR/EN content round-trips and orders remain TRY", async () => {
    await createCmsProduct(db, input({
      tr: { name: "Ad", description: "Açıklama", seoTitle: "", seoDescription: "", origin: "Ataeymir", ingredients: "", usage: "Salata", storage: "" },
      en: { name: "Name", description: "Description", seoTitle: "", seoDescription: "", origin: "Ataeymir", ingredients: "", usage: "Salads", storage: "" },
    }), owner, 1000);
    expect(await getCmsProduct(db, "p13c")).toMatchObject({ tr: { origin: "Ataeymir", usage: "Salata" }, en: { name: "Name", usage: "Salads" } });
    await createPendingOrder(db, { id: "o13c", customerName: "A", email: "a@b.co", phone: "1", address: "x", itemsJson: "[]", totalKurus: 1, createdAt: 1 });
    expect((await pool.query("SELECT currency FROM orders WHERE id = 'o13c'")).rows[0].currency).toBe("TRY");
  });

  it("migration 0008 is idempotent and its rollback is safe: up → up → down → up; rollback refuses to drop approvals", async () => {
    const up = readFileSync("db/postgres/0008_product_cms.sql", "utf8");
    const down = readFileSync("db/postgres/0008_product_cms.down.sql", "utf8");
    const shape = async () => (await pool.query(`SELECT string_agg(table_name||'.'||column_name, ',' ORDER BY table_name, column_name) AS c FROM information_schema.columns WHERE table_schema='public'`)).rows[0].c as string;
    const after = await shape();
    await pool.query(up);
    expect(await shape()).toBe(after);
    await pool.query(down);
    expect(await shape()).not.toMatch(/product_price_approvals|media_blobs|media_assets\.approved_at/);
    expect((await pool.query("SELECT count(*)::int AS n FROM products WHERE status = 'draft'")).rows[0].n).toBe(13);
    await pool.query(up);
    expect(await shape()).toBe(after);
    await createCmsProduct(db, input(), owner, 1000);
    await approveProductPrice(db, "p13c", 1, "TRY", 99000, owner, 1100);
    const client = await pool.connect();
    try { await expect(client.query(down)).rejects.toThrow(/0008 rollback stopped: price approvals exist/); }
    finally { await client.query("ROLLBACK").catch(() => undefined); client.release(); }
    expect((await pool.query("SELECT count(*)::int AS n FROM product_price_approvals")).rows[0].n).toBe(1);
  });
});
