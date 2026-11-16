import { readFileSync } from "node:fs";
import pg from "pg";
import type { SqlDriver } from "../../db/postgres/repository";

export const TEST_URL = process.env.DATABASE_URL_TEST;

/** node-postgres adapter matching the app's SqlDriver contract. */
export function createDriver(pool: pg.Pool): SqlDriver {
  return {
    async query<T extends Record<string, unknown>>(sql: string, params: readonly unknown[] = []) {
      const result = await pool.query(sql, [...params]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}

const MIGRATIONS = ["0001_initial.sql", "preview_draft_catalog_seed.sql", "0002_publish_audit.sql", "0003_cms.sql", "0004_blog_cms.sql", "0005_collections_experience.sql", "0007_catalog_commerce.sql", "0008_product_cms.sql"];

/** Rebuilds a clean schema. Refuses anything that does not look like a throwaway test DB. */
export async function resetSchema(pool: pg.Pool) {
  if (!TEST_URL || !/(localhost|127\.0\.0\.1|postgres:5432)/.test(TEST_URL) || /neon\.tech/.test(TEST_URL)) {
    throw new Error("Refusing to reset a non-local database");
  }
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  for (const file of MIGRATIONS) await pool.query(readFileSync(`db/postgres/${file}`, "utf8"));
}

/**
 * Links a test image of the given truth to a product. Real photos / editorial images are
 * owner-approved by default (0008); pass approved=false to leave them pending.
 */
export async function attachMedia(pool: pg.Pool, productId: string, truth: "photo" | "range" | "editorial" | "concept", id = `m-${productId}-${truth}`, approved = truth === "photo" || truth === "editorial") {
  await pool.query(
    `INSERT INTO media_assets(id, url, kind, mime, bytes, truth, created_by, created_at, approved_by, approved_at)
     VALUES ($1, $2, 'image', 'image/webp', 1000, $3, 'test', 0, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [id, `/test/${id}.webp`, truth, approved ? "owner@example.test" : null, approved ? 1 : null]);
  await pool.query("INSERT INTO product_media(product_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [productId, id]);
}

/** Commercially approves the product's current TRY price (and EUR/USD when set), as an owner would. */
export async function approveCurrentPrices(pool: pg.Pool, productId: string) {
  await pool.query(
    `INSERT INTO product_price_approvals(product_id, currency, amount_minor, approved_by, approved_at)
     SELECT id, c.cur, c.amount, 'owner@example.test', 1 FROM products,
            LATERAL (VALUES ('TRY', price_kurus), ('EUR', price_eur_cents), ('USD', price_usd_cents)) AS c(cur, amount)
      WHERE id = $1 AND c.amount IS NOT NULL
     ON CONFLICT (product_id, currency) DO UPDATE SET amount_minor = excluded.amount_minor`, [productId]);
}
