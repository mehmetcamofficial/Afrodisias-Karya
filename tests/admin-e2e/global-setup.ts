import { readFileSync } from "node:fs";
import pg from "pg";

const MIGRATIONS = ["0001_initial.sql", "preview_draft_catalog_seed.sql", "0002_publish_audit.sql", "0003_cms.sql", "0004_blog_cms.sql", "0005_collections_experience.sql", "0006_finance.sql"];

/** Fresh schema in the disposable local E2E database + role fixtures. Refuses non-local URLs. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_E2E ?? "postgres://test_admin:test_only_local@127.0.0.1:55432/altindal_e2e";
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\/[a-z0-9_]+$/.test(url)) throw new Error("Refusing to reset a non-local database");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    for (const file of MIGRATIONS) await pool.query(readFileSync(`db/postgres/${file}`, "utf8"));
    await pool.query(`INSERT INTO admin_users(email, role, created_by, created_at) VALUES
      ('accountant@e2e.test', 'accountant', 'e2e-setup', 1), ('editor@e2e.test', 'editor', 'e2e-setup', 1)`);
    // A clearly fake test order to link collections to (no real customer data).
    await pool.query(`INSERT INTO orders(id, customer_name, email, phone, address, items_json, total_kurus, created_at)
      VALUES ('E2E-ORDER-1', 'E2E Test Müşteri', 'customer@e2e.test', '0', 'Test', '[]', 150000, 1)`);
  } finally { await pool.end(); }
}
