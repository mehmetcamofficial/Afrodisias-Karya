import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCmsProduct, findAdminRole, listAuditLogs, upsertAdminUser } from "../../db/postgres/cms-repository";
import { approveProductPrice, setMediaApproval } from "../../db/postgres/product-cms-repository";
import type { ProductInput } from "../../lib/cms-validation";
import { attachMedia, createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;

/** Faz 13C closure: the role table itself cannot be used to escalate, and approvals are attributed. */
run("Admin roles and approval attribution against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("unknown, look-alike and disabled accounts have no role", async () => {
    await upsertAdminUser(db, "editor@example.test", "editor", false, "owner@example.test", 1);
    await upsertAdminUser(db, "gone@example.test", "viewer", true, "owner@example.test", 2);
    expect(await findAdminRole(db, "stranger@example.test")).toBeNull();
    expect(await findAdminRole(db, "editor@example.test.evil.io")).toBeNull();
    expect(await findAdminRole(db, "gone@example.test")).toBeNull(); // disabled
    expect(await findAdminRole(db, "  EDITOR@example.test ")).toBe("editor"); // normalised, same account
  });

  it("an 'owner' row can never be overwritten or demoted through the CMS, and role changes are audited", async () => {
    await pool.query("INSERT INTO admin_users(email, role, created_by, created_at) VALUES ('boss@example.test', 'owner', 'bootstrap', 0)");
    await expect(upsertAdminUser(db, "boss@example.test", "viewer", true, "editor@example.test", 5)).rejects.toThrow(/owner/);
    expect((await pool.query("SELECT role, disabled FROM admin_users WHERE email = 'boss@example.test'")).rows[0]).toEqual({ role: "owner", disabled: false });
    await upsertAdminUser(db, "new@example.test", "editor", false, "owner@example.test", 6);
    expect((await listAuditLogs(db, { entityId: "new@example.test" }))[0]).toMatchObject({ action: "user.role", actorEmail: "owner@example.test", detail: { role: "editor", disabled: false } });
    await expect(pool.query("INSERT INTO admin_users(email, role, created_by, created_at) VALUES ('MiXeD@example.test', 'editor', 'x', 0)")).rejects.toThrow(/check/i);
  });

  it("price and photo approvals record the approving identity in the append-only audit", async () => {
    await createCmsProduct(db, {
      id: "roles-p", sku: "AD-ROLES-1", category: "glass", size: "500 ml", priceKurus: 99000, currency: "TRY", stock: 1, tags: [],
      priceEurCents: null, priceUsdCents: null, packaging: "glass_bottle", netVolumeMl: 500, netWeightG: null, sizeFamily: null, shipsTo: ["TR"],
      tr: { name: "Rol", description: "Açıklama", seoTitle: "", seoDescription: "", origin: "", ingredients: "", usage: "", storage: "" }, en: {},
    } as ProductInput & { id: string }, "owner@example.test", 1);
    await approveProductPrice(db, "roles-p", 1, "TRY", 99000, "owner@example.test", 2);
    await attachMedia(pool, "roles-p", "photo", "m-roles", false);
    await setMediaApproval(db, "m-roles", true, "owner@example.test", 3);
    const actions = (await pool.query("SELECT actor_email, action FROM audit_logs WHERE action IN ('price.approve','media.approve') ORDER BY id")).rows;
    expect(actions).toEqual([{ actor_email: "owner@example.test", action: "price.approve" }, { actor_email: "owner@example.test", action: "media.approve" }]);
    await expect(pool.query("UPDATE audit_logs SET actor_email = 'someone-else@example.test'")).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM audit_logs WHERE action = 'price.approve'")).rejects.toThrow(/append-only/);
  });
});
