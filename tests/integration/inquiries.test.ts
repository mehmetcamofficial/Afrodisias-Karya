import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs, listInquiries, setInquiryStatus } from "../../db/postgres/cms-repository";
import { createDriver, resetSchema, TEST_URL } from "./pg-driver";

vi.mock("server-only", () => ({}));
const holder: { db?: ReturnType<typeof createDriver> } = {};
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: () => holder.db }));
const { POST } = await import("../../app/api/contact/route");

const run = TEST_URL ? describe : describe.skip;
let pool: pg.Pool;
const send = (ip: string) => POST(new Request("http://localhost/api/contact", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip },
  body: JSON.stringify({ name: "Ayşe", email: "ayse@example.test", topic: "product", message: "Bilgi almak istiyorum.", consent: true, website: "" }),
}));

run("Contact inquiries against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); holder.db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("stores consented messages and rate-limits per hashed IP (3 per 10 minutes)", async () => {
    expect((await Promise.all([send("198.51.100.1"), send("198.51.100.1"), send("198.51.100.1")])).every((r) => r.status === 201 || r.status === 429)).toBe(true);
    expect((await send("198.51.100.1")).status).toBe(429);
    expect((await send("198.51.100.2")).status).toBe(201);
    const rows = await pool.query("SELECT ip_hash FROM contact_inquiries");
    expect(rows.rows.every((row) => !String(row.ip_hash).includes("198.51"))).toBe(true);
  });

  it("status change writes an immutable audit row; unknown id is not_found", async () => {
    await send("198.51.100.3");
    const [inquiry] = await listInquiries(holder.db!);
    expect(inquiry.status).toBe("new");
    await setInquiryStatus(holder.db!, inquiry.id, "answered", "editor@example.test", 5000);
    expect((await listInquiries(holder.db!))[0].status).toBe("answered");
    expect((await listAuditLogs(holder.db!, { entityId: inquiry.id }))[0]).toMatchObject({ action: "inquiry.status", actorEmail: "editor@example.test" });
    await expect(setInquiryStatus(holder.db!, "00000000-0000-0000-0000-000000000000", "spam", "x@example.test", 1)).rejects.toMatchObject({ code: "not_found" });
  });

  it("the database itself rejects a message without consent", async () => {
    await expect(pool.query("INSERT INTO contact_inquiries(id,name,email,topic,message,consent,created_at) VALUES ('a','A','a@b.c','other','hello',false,1)")).rejects.toThrow();
  });
});

run("Admin users and audit filters against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); holder.db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("grants, changes and disables roles with audit rows; a DB owner row cannot be overwritten", async () => {
    const { findAdminRole, listAdminUsers, upsertAdminUser } = await import("../../db/postgres/cms-repository");
    await upsertAdminUser(holder.db!, "Editor@Example.test", "editor", false, "owner@example.test", 1);
    expect(await findAdminRole(holder.db!, "editor@example.test")).toBe("editor");
    await upsertAdminUser(holder.db!, "editor@example.test", "viewer", true, "owner@example.test", 2);
    expect(await findAdminRole(holder.db!, "editor@example.test")).toBeNull();
    expect((await listAdminUsers(holder.db!))[0]).toMatchObject({ email: "editor@example.test", role: "viewer", disabled: true });
    await pool.query("INSERT INTO admin_users(email, role, created_by, created_at) VALUES ('boss@example.test','owner','seed',1)");
    await expect(upsertAdminUser(holder.db!, "boss@example.test", "viewer", false, "owner@example.test", 3)).rejects.toMatchObject({ code: "protected" });
    const logs = await listAuditLogs(holder.db!, { entityType: "admin_user" });
    expect(logs.map((l) => l.action)).toEqual(["user.role", "user.role"]);
    expect(await listAuditLogs(holder.db!, { actionPrefix: "product." })).toEqual([]);
    expect((await listAuditLogs(holder.db!, { before: logs[0].id })).map((l) => l.id)).toEqual([logs[1].id]);
  });
});
