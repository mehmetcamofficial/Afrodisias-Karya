/**
 * Product CMS persistence (requires migration 0003_cms.sql).
 *
 * Every write is ONE SQL statement: data-modifying CTEs change the product,
 * write a full revision snapshot and append to audit_logs together. Either all
 * of it commits or none of it does, which also works over the Neon HTTP driver
 * (no multi-statement transactions needed). Optimistic locking on `version`
 * rejects stale edits.
 */
import type { SqlDriver } from "./repository";
import type { ProductInput } from "../../lib/cms-validation";

export type ProductStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type Translation = { name: string; description: string; seoTitle: string; seoDescription: string };
export type CmsProduct = {
  id: string; sku: string | null; category: string; size: string; priceKurus: number; currency: string;
  stock: number; tags: string[]; status: ProductStatus; active: boolean; version: number;
  archivedAt: number | null; updatedAt: number; tr: Translation; en: Translation;
};
export type AuditRow = { id: number; actorEmail: string; action: string; entityType: string; entityId: string; detail: Record<string, unknown>; createdAt: number };
export type RevisionRow = { version: number; actorEmail: string; createdAt: number; snapshot: Record<string, unknown> };

export class CmsError extends Error {
  constructor(public code: "not_found" | "conflict" | "version_mismatch" | "invalid_state" | "protected", message: string) { super(message); }
}

const PRODUCT_SELECT = `
  SELECT p.id, p.sku, p.type AS category, p.size, p.price_kurus AS "priceKurus", p.currency, p.stock,
         p.tags, p.status, p.active, p.version, p.archived_at::float8 AS "archivedAt", p.updated_at::float8 AS "updatedAt",
         jsonb_build_object('name', coalesce(tr.name, p.name), 'description', coalesce(tr.description, p.note),
           'seoTitle', coalesce(tr.seo_title, ''), 'seoDescription', coalesce(tr.seo_description, '')) AS tr,
         jsonb_build_object('name', coalesce(en.name, ''), 'description', coalesce(en.description, ''),
           'seoTitle', coalesce(en.seo_title, ''), 'seoDescription', coalesce(en.seo_description, '')) AS en
    FROM products p
    LEFT JOIN product_translations tr ON tr.product_id = p.id AND tr.locale = 'tr'
    LEFT JOIN product_translations en ON en.product_id = p.id AND en.locale = 'en'`;

function translationsJson(input: ProductInput) {
  return JSON.stringify({ tr: input.tr, en: input.en });
}

/** Shared tail: translations upsert, revision snapshot and audit row for the row in `changed`. */
function writeTail(actorParam: string, nowParam: string, action: string, translationsParam?: string) {
  const tr = translationsParam ? `,
  tr AS (
    INSERT INTO product_translations(product_id, locale, name, description, seo_title, seo_description)
    SELECT changed.id, x.key, x.value->>'name', coalesce(x.value->>'description',''), coalesce(x.value->>'seoTitle',''), coalesce(x.value->>'seoDescription','')
      FROM changed, jsonb_each(${translationsParam}::jsonb) AS x
     WHERE coalesce(x.value->>'name','') <> '' OR x.key = 'tr'
    ON CONFLICT (product_id, locale) DO UPDATE SET name = excluded.name, description = excluded.description,
      seo_title = excluded.seo_title, seo_description = excluded.seo_description
    RETURNING 1)` : "";
  const snapshot = translationsParam
    ? `to_jsonb(changed.*) || jsonb_build_object('translations', ${translationsParam}::jsonb)`
    : `to_jsonb(changed.*) || jsonb_build_object('translations', (SELECT coalesce(jsonb_object_agg(t.locale, to_jsonb(t.*) - 'product_id' - 'locale'), '{}'::jsonb) FROM product_translations t WHERE t.product_id = changed.id))`;
  return `${tr},
  rev AS (
    INSERT INTO product_revisions(product_id, version, snapshot, actor_email, created_at)
    SELECT changed.id, changed.version, ${snapshot}, ${actorParam}, ${nowParam} FROM changed
    RETURNING 1),
  aud AS (
    INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
    SELECT ${actorParam}, '${action}', 'product', changed.id,
           jsonb_build_object('version', changed.version, 'status', changed.status, 'priceKurus', changed.price_kurus, 'stock', changed.stock),
           ${nowParam} FROM changed
    RETURNING 1)
  SELECT changed.id, changed.version, changed.status FROM changed`;
}

export async function listCmsProducts(db: SqlDriver, opts: { includeArchived?: boolean } = {}): Promise<CmsProduct[]> {
  const where = opts.includeArchived ? "" : "WHERE p.status <> 'archived'";
  const result = await db.query<CmsProduct>(`${PRODUCT_SELECT} ${where} ORDER BY p.updated_at DESC, p.id`);
  return result.rows;
}

export async function getCmsProduct(db: SqlDriver, id: string): Promise<CmsProduct | null> {
  const result = await db.query<CmsProduct>(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function createCmsProduct(db: SqlDriver, input: ProductInput & { id: string }, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       INSERT INTO products(id, name, type, size, note, price_kurus, stock, active, updated_at, sku, status, currency, tags, version, created_at)
       VALUES ($1, $2, $3, $4, left($5, 400), $6, $7, false, $8, $9, 'draft', $10, $11::text[], 1, $8)
       ON CONFLICT (id) DO NOTHING
       RETURNING *)${writeTail("$12", "$8", "product.create", "$13")}`,
    [input.id, input.tr.name, input.category, input.size, input.tr.description, input.priceKurus, input.stock, now,
      input.sku ?? null, input.currency, input.tags, actor, translationsJson(input)],
  );
  if (!result.rows[0]) throw new CmsError("conflict", `"${input.id}" kimliğiyle bir ürün zaten var`);
  return result.rows[0];
}

/** Explains why a guarded write matched no row. Read-only. */
async function explain(db: SqlDriver, id: string, expectedVersion: number, allowed: ProductStatus[]): Promise<never> {
  const row = (await db.query<{ version: number; status: ProductStatus }>("SELECT version, status FROM products WHERE id = $1", [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", `Ürün başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  if (!allowed.includes(row.status)) throw new CmsError("invalid_state", `Bu işlem "${row.status}" durumundaki ürüne uygulanamaz`);
  throw new CmsError("invalid_state", "İşlem koşulları sağlanmadı (ör. yayımlamak için fiyat ve stok sıfırdan büyük olmalı)");
}

const EDITABLE: ProductStatus[] = ["draft", "in_review", "approved"];

/** Published products are read-only: unpublish first. Editing a reviewed product sends it back to draft. */
export async function updateCmsProduct(db: SqlDriver, id: string, expectedVersion: number, input: ProductInput, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE products SET name = $2, type = $3, size = $4, note = left($5, 400), price_kurus = $6, stock = $7,
              sku = $8, currency = $9, tags = $10::text[], version = version + 1, updated_at = $11, status = 'draft'
        WHERE id = $1 AND version = $12 AND status = ANY($13::text[])
       RETURNING *)${writeTail("$14", "$11", "product.update", "$15")}`,
    [id, input.tr.name, input.category, input.size, input.tr.description, input.priceKurus, input.stock,
      input.sku ?? null, input.currency, input.tags, now, expectedVersion, EDITABLE, actor, translationsJson(input)],
  );
  return result.rows[0] ?? explain(db, id, expectedVersion, EDITABLE);
}

type Transition = { from: ProductStatus[]; to: ProductStatus; decision?: "requested" | "approved" | "rejected" | "published" };
export const TRANSITIONS: Record<"submit" | "approve" | "reject" | "publish" | "unpublish" | "archive" | "restore", Transition> = {
  submit: { from: ["draft"], to: "in_review", decision: "requested" },
  approve: { from: ["in_review"], to: "approved", decision: "approved" },
  reject: { from: ["in_review"], to: "draft", decision: "rejected" },
  publish: { from: ["approved"], to: "published", decision: "published" },
  unpublish: { from: ["published"], to: "draft" },
  archive: { from: ["draft", "in_review", "approved"], to: "archived" },
  restore: { from: ["archived"], to: "draft" },
};

export async function transitionCmsProduct(db: SqlDriver, id: string, expectedVersion: number, action: keyof typeof TRANSITIONS, actor: string, note: string, now: number) {
  const t = TRANSITIONS[action];
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE products SET status = $3, active = ($3 = 'published'), version = version + 1, updated_at = $5,
              archived_at = CASE WHEN $3 = 'archived' THEN $5 WHEN $3 = 'draft' THEN NULL ELSE archived_at END
        WHERE id = $1 AND version = $2 AND status = ANY($4::text[])
          AND ($3 <> 'published' OR (stock > 0 AND price_kurus > 0))
       RETURNING *),
     appr AS (
       INSERT INTO publication_approvals(entity_type, entity_id, version, decision, actor_email, note, created_at)
       SELECT 'product', changed.id, changed.version, $6, $7, $8, $5 FROM changed WHERE $6::text IS NOT NULL
       RETURNING 1)${writeTail("$7", "$5", `product.${action}`)}`,
    [id, expectedVersion, t.to, t.from, now, t.decision ?? null, actor, note],
  );
  return result.rows[0] ?? explain(db, id, expectedVersion, t.from);
}

/** Copies content into a new draft. Stock starts at 0 and SKU empty: both must be verified. */
export async function duplicateCmsProduct(db: SqlDriver, sourceId: string, newId: string, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       INSERT INTO products(id, name, type, size, note, price_kurus, stock, active, updated_at, sku, status, currency, tags, version, created_at)
       SELECT $2, name || ' (kopya)', type, size, note, price_kurus, 0, false, $3, NULL, 'draft', currency, tags, 1, $3
         FROM products WHERE id = $1
       ON CONFLICT (id) DO NOTHING
       RETURNING *),
     copied AS (
       INSERT INTO product_translations(product_id, locale, name, description, seo_title, seo_description)
       SELECT changed.id, t.locale, CASE WHEN t.locale = 'tr' THEN t.name || ' (kopya)' ELSE t.name END, t.description, t.seo_title, t.seo_description
         FROM changed JOIN product_translations t ON t.product_id = $1
       RETURNING 1)${writeTail("$4", "$3", "product.duplicate")}`,
    [sourceId, newId, now, actor],
  );
  if (!result.rows[0]) {
    const exists = (await db.query("SELECT 1 FROM products WHERE id = $1", [sourceId])).rows.length > 0;
    throw exists ? new CmsError("conflict", `"${newId}" kimliği kullanımda`) : new CmsError("not_found", "Kaynak ürün bulunamadı");
  }
  return result.rows[0];
}

/**
 * Permanent delete: only archived products that never appeared in an order or
 * a publication audit. The audit row keeps the final snapshot.
 */
export async function deleteCmsProduct(db: SqlDriver, id: string, expectedVersion: number, actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH removed AS (
       DELETE FROM products p
        WHERE p.id = $1 AND p.version = $2 AND p.status = 'archived'
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.items_json::jsonb @> jsonb_build_array(jsonb_build_object('id', $1::text)))
          AND NOT EXISTS (SELECT 1 FROM product_publish_audit a WHERE a.product_id = $1)
       RETURNING *),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $3, 'product.delete', 'product', removed.id, jsonb_build_object('finalSnapshot', to_jsonb(removed.*)), $4 FROM removed
       RETURNING 1)
     SELECT removed.id FROM removed`,
    [id, expectedVersion, actor, now],
  );
  if (result.rows[0]) return result.rows[0];
  const row = (await db.query<{ version: number; status: ProductStatus }>("SELECT version, status FROM products WHERE id = $1", [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", "Ürün başka bir oturumda değişti; sayfayı yenileyin");
  if (row.status !== "archived") throw new CmsError("invalid_state", "Kalıcı silmeden önce ürünü arşivleyin");
  throw new CmsError("protected", "Bu ürün bir siparişte veya yayın kaydında geçtiği için silinemez; arşivde kalır");
}

export async function listProductRevisions(db: SqlDriver, id: string, limit = 20): Promise<RevisionRow[]> {
  const result = await db.query<RevisionRow>(
    `SELECT version, actor_email AS "actorEmail", created_at::float8 AS "createdAt", snapshot
       FROM product_revisions WHERE product_id = $1 ORDER BY version DESC LIMIT $2`,
    [id, Math.min(Math.max(limit, 1), 100)],
  );
  return result.rows;
}

export async function listAuditLogs(db: SqlDriver, opts: { entityId?: string; limit?: number } = {}): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const result = await db.query<AuditRow>(
    `SELECT id::float8 AS id, actor_email AS "actorEmail", action, entity_type AS "entityType", entity_id AS "entityId", detail, created_at::float8 AS "createdAt"
       FROM audit_logs ${opts.entityId ? "WHERE entity_id = $2" : ""} ORDER BY created_at DESC, id DESC LIMIT $1`,
    opts.entityId ? [limit, opts.entityId] : [limit],
  );
  return result.rows;
}

/** Role for a non-bootstrap admin, or null. */
export async function findAdminRole(db: SqlDriver, email: string): Promise<"owner" | "editor" | "viewer" | null> {
  const result = await db.query<{ role: "owner" | "editor" | "viewer" }>(
    "SELECT role FROM admin_users WHERE email = $1 AND disabled = false", [email.trim().toLowerCase()],
  );
  return result.rows[0]?.role ?? null;
}
