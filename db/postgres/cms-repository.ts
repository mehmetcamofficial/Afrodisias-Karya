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
import { BLOCKER_LABELS, type PublishBlocker } from "../../lib/publish-blockers";
import type { PriceApproval, ProductMedia } from "./product-cms-repository";
export { BLOCKER_LABELS, type PublishBlocker };

export type ProductStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type Translation = { name: string; description: string; seoTitle: string; seoDescription: string;
  origin: string; ingredients: string; usage: string; storage: string };
export type CmsProduct = {
  id: string; sku: string | null; category: string; size: string; priceKurus: number; currency: string;
  priceEurCents: number | null; priceUsdCents: number | null; packaging: string | null;
  netVolumeMl: number | null; netWeightG: number | null; sizeFamily: string | null; shipsTo: string[];
  stock: number; tags: string[]; status: ProductStatus; active: boolean; version: number;
  archivedAt: number | null; updatedAt: number; tr: Translation; en: Translation; publishBlockers: PublishBlocker[];
  /** 0008: commercial approvals (who approved which amount, when) and the product's images. */
  priceApprovals: PriceApproval[]; media: ProductMedia[];
};

export type AuditRow = { id: number; actorEmail: string; action: string; entityType: string; entityId: string; detail: Record<string, unknown>; createdAt: number };
export type RevisionRow = { version: number; actorEmail: string; createdAt: number; snapshot: Record<string, unknown> };

export class CmsError extends Error {
  constructor(public code: "not_found" | "conflict" | "version_mismatch" | "invalid_state" | "protected", message: string) { super(message); }
}

const PRODUCT_SELECT = `
  SELECT p.id, p.sku, p.type AS category, p.size, p.price_kurus AS "priceKurus", p.currency, p.stock,
         p.price_eur_cents AS "priceEurCents", p.price_usd_cents AS "priceUsdCents", p.packaging,
         p.net_volume_ml AS "netVolumeMl", p.net_weight_g AS "netWeightG", p.size_family AS "sizeFamily", p.ships_to AS "shipsTo",
         p.tags, p.status, p.active, p.version, p.archived_at::float8 AS "archivedAt", p.updated_at::float8 AS "updatedAt",
         product_publish_blockers(p) AS "publishBlockers",
         (SELECT coalesce(jsonb_agg(jsonb_build_object('currency', a.currency, 'amountMinor', a.amount_minor, 'approvedBy', a.approved_by, 'approvedAt', a.approved_at) ORDER BY a.currency), '[]'::jsonb)
            FROM product_price_approvals a WHERE a.product_id = p.id) AS "priceApprovals",
         (SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'url', m.url, 'truth', m.truth, 'kind', m.kind, 'mime', m.mime, 'bytes', m.bytes,
                   'width', m.width, 'height', m.height, 'altTr', m.alt_tr, 'altEn', m.alt_en, 'credit', m.credit, 'license', m.license,
                   'approvedBy', m.approved_by, 'approvedAt', m.approved_at, 'position', pm.position) ORDER BY pm.position, m.id), '[]'::jsonb)
            FROM product_media pm JOIN media_assets m ON m.id = pm.media_id WHERE pm.product_id = p.id) AS media,
         jsonb_build_object('name', coalesce(tr.name, p.name), 'description', coalesce(tr.description, p.note),
           'seoTitle', coalesce(tr.seo_title, ''), 'seoDescription', coalesce(tr.seo_description, ''),
           'origin', coalesce(tr.origin, ''), 'ingredients', coalesce(tr.ingredients, ''), 'usage', coalesce(tr.usage, ''), 'storage', coalesce(tr.storage, '')) AS tr,
         jsonb_build_object('name', coalesce(en.name, ''), 'description', coalesce(en.description, ''),
           'seoTitle', coalesce(en.seo_title, ''), 'seoDescription', coalesce(en.seo_description, ''),
           'origin', coalesce(en.origin, ''), 'ingredients', coalesce(en.ingredients, ''), 'usage', coalesce(en.usage, ''), 'storage', coalesce(en.storage, '')) AS en
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
    INSERT INTO product_translations(product_id, locale, name, description, seo_title, seo_description, origin, ingredients, usage, storage)
    SELECT changed.id, x.key, x.value->>'name', coalesce(x.value->>'description',''), coalesce(x.value->>'seoTitle',''), coalesce(x.value->>'seoDescription',''),
           coalesce(x.value->>'origin',''), coalesce(x.value->>'ingredients',''), coalesce(x.value->>'usage',''), coalesce(x.value->>'storage','')
      FROM changed, jsonb_each(${translationsParam}::jsonb) AS x
     WHERE coalesce(x.value->>'name','') <> '' OR x.key = 'tr'
    ON CONFLICT (product_id, locale) DO UPDATE SET name = excluded.name, description = excluded.description,
      seo_title = excluded.seo_title, seo_description = excluded.seo_description,
      origin = excluded.origin, ingredients = excluded.ingredients, usage = excluded.usage, storage = excluded.storage
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

/** 0007 commerce columns, in this fixed parameter order after the base ones. */
const commerceParams = (input: ProductInput) => [
  input.priceEurCents ?? null, input.priceUsdCents ?? null, input.packaging ?? null, input.netVolumeMl ?? null,
  input.netWeightG ?? null, input.sizeFamily ?? null, input.shipsTo ?? ["TR"],
];

export async function createCmsProduct(db: SqlDriver, input: ProductInput & { id: string }, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       INSERT INTO products(id, name, type, size, note, price_kurus, stock, active, updated_at, sku, status, currency, tags, version, created_at,
                            price_eur_cents, price_usd_cents, packaging, net_volume_ml, net_weight_g, size_family, ships_to)
       VALUES ($1, $2, $3, $4, left($5, 400), $6, $7, false, $8, $9, 'draft', 'TRY', $10::text[], 1, $8,
               $13, $14, $15, $16, $17, $18, $19::text[])
       ON CONFLICT (id) DO NOTHING
       RETURNING *)${writeTail("$11", "$8", "product.create", "$12")}`,
    [input.id, input.tr.name, input.category, input.size, input.tr.description, input.priceKurus, input.stock, now,
      input.sku ?? null, input.tags, actor, translationsJson(input), ...commerceParams(input)],
  );
  if (!result.rows[0]) throw new CmsError("conflict", `"${input.id}" kimliğiyle bir ürün zaten var`);
  return result.rows[0];
}

/** Explains why a guarded write matched no row. Read-only. */
async function explain(db: SqlDriver, id: string, expectedVersion: number, allowed: ProductStatus[], publishing = false): Promise<never> {
  const row = (await db.query<{ version: number; status: ProductStatus; blockers: PublishBlocker[] }>(
    "SELECT version, status, product_publish_blockers(p) AS blockers FROM products p WHERE id = $1", [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", `Ürün başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  if (!allowed.includes(row.status)) throw new CmsError("invalid_state", `Bu işlem "${row.status}" durumundaki ürüne uygulanamaz`);
  if (publishing && row.blockers.length) throw new CmsError("invalid_state", `Yayımlanamaz; eksik: ${row.blockers.map((b) => BLOCKER_LABELS[b] ?? b).join(", ")}`);
  throw new CmsError("invalid_state", "İşlem koşulları sağlanmadı");
}

/** The 0007 trigger is the last line of defence; surface its refusal as a workflow error, never a 500. */
function guardError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (/publish_requires_approved|publish_blocked/.test(message)) throw new CmsError("invalid_state", "Yayın politikası: yalnızca eksiksiz ve onaylı (approved) ürün yayımlanabilir");
  throw error;
}

const EDITABLE: ProductStatus[] = ["draft", "in_review", "approved"];

/** Published products are read-only: unpublish first. Editing a reviewed product sends it back to draft. */
export async function updateCmsProduct(db: SqlDriver, id: string, expectedVersion: number, input: ProductInput, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE products SET name = $2, type = $3, size = $4, note = left($5, 400), price_kurus = $6, stock = $7,
              sku = $8, tags = $9::text[], version = version + 1, updated_at = $10, status = 'draft',
              price_eur_cents = $15, price_usd_cents = $16, packaging = $17, net_volume_ml = $18, net_weight_g = $19,
              size_family = $20, ships_to = $21::text[]
        WHERE id = $1 AND version = $11 AND status = ANY($12::text[])
       RETURNING *)${writeTail("$13", "$10", "product.update", "$14")}`,
    [id, input.tr.name, input.category, input.size, input.tr.description, input.priceKurus, input.stock,
      input.sku ?? null, input.tags, now, expectedVersion, EDITABLE, actor, translationsJson(input), ...commerceParams(input)],
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
          AND ($3 <> 'published' OR cardinality(product_publish_blockers(products)) = 0)
       RETURNING *),
     appr AS (
       INSERT INTO publication_approvals(entity_type, entity_id, version, decision, actor_email, note, created_at)
       SELECT 'product', changed.id, changed.version, $6, $7, $8, $5 FROM changed WHERE $6::text IS NOT NULL
       RETURNING 1)${writeTail("$7", "$5", `product.${action}`)}`,
    [id, expectedVersion, t.to, t.from, now, t.decision ?? null, actor, note],
  ).catch(guardError);
  return result.rows[0] ?? explain(db, id, expectedVersion, t.from, t.to === "published");
}

/** Copies content into a new draft. Stock starts at 0 and SKU empty: both must be verified. */
export async function duplicateCmsProduct(db: SqlDriver, sourceId: string, newId: string, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       INSERT INTO products(id, name, type, size, note, price_kurus, stock, active, updated_at, sku, status, currency, tags, version, created_at,
                            price_eur_cents, price_usd_cents, packaging, net_volume_ml, net_weight_g, size_family, ships_to)
       SELECT $2, name || ' (kopya)', type, size, note, price_kurus, 0, false, $3, NULL, 'draft', currency, tags, 1, $3,
              price_eur_cents, price_usd_cents, packaging, net_volume_ml, net_weight_g, size_family, ships_to
         FROM products WHERE id = $1
       ON CONFLICT (id) DO NOTHING
       RETURNING *),
     copied AS (
       INSERT INTO product_translations(product_id, locale, name, description, seo_title, seo_description, origin, ingredients, usage, storage)
       SELECT changed.id, t.locale, CASE WHEN t.locale = 'tr' THEN t.name || ' (kopya)' ELSE t.name END, t.description, t.seo_title, t.seo_description,
              t.origin, t.ingredients, t.usage, t.storage
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

export async function listAuditLogs(db: SqlDriver, opts: { entityId?: string; entityType?: string; actionPrefix?: string; before?: number; limit?: number } = {}): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const where: string[] = [];
  const params: unknown[] = [limit];
  const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replace("?", `$${params.length}`)); };
  if (opts.entityId) add("entity_id = ?", opts.entityId);
  if (opts.entityType) add("entity_type = ?", opts.entityType);
  if (opts.actionPrefix) add("action LIKE ? || '%'", opts.actionPrefix);
  if (opts.before) add("id < ?", opts.before);
  const result = await db.query<AuditRow>(
    `SELECT id::float8 AS id, actor_email AS "actorEmail", action, entity_type AS "entityType", entity_id AS "entityId", detail, created_at::float8 AS "createdAt"
       FROM audit_logs ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT $1`,
    params,
  );
  return result.rows;
}

export type AdminUserRow = { email: string; role: "owner" | "editor" | "viewer"; disabled: boolean; createdBy: string; createdAt: number };

export async function listAdminUsers(db: SqlDriver): Promise<AdminUserRow[]> {
  return (await db.query<AdminUserRow>(
    `SELECT email, role, disabled, created_by AS "createdBy", created_at::float8 AS "createdAt" FROM admin_users ORDER BY email`)).rows;
}

/** Grant/change/disable an editor or viewer, with an audit row, in one statement. Owners come only from ADMIN_EMAILS. */
export async function upsertAdminUser(db: SqlDriver, email: string, role: "editor" | "viewer", disabled: boolean, actor: string, now: number) {
  const result = await db.query<{ email: string }>(
    `WITH changed AS (
       INSERT INTO admin_users(email, role, disabled, created_by, created_at) VALUES (lower($1), $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET role = excluded.role, disabled = excluded.disabled
       WHERE admin_users.role <> 'owner'
       RETURNING *),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $4, 'user.role', 'admin_user', changed.email, jsonb_build_object('role', changed.role, 'disabled', changed.disabled), $5 FROM changed RETURNING 1)
     SELECT email FROM changed`,
    [email.trim(), role, disabled, actor, now],
  );
  if (!result.rows[0]) throw new CmsError("protected", "Sahip (owner) hesapları buradan değiştirilemez");
  return result.rows[0];
}

/** Role for a non-bootstrap admin, or null. */
export async function findAdminRole(db: SqlDriver, email: string): Promise<"owner" | "editor" | "viewer" | null> {
  const result = await db.query<{ role: "owner" | "editor" | "viewer" }>(
    "SELECT role FROM admin_users WHERE email = $1 AND disabled = false", [email.trim().toLowerCase()],
  );
  return result.rows[0]?.role ?? null;
}

export type InquiryRow = { id: string; name: string; email: string; topic: string; message: string; status: string; createdAt: number };
export const INQUIRY_STATUSES = ["new", "in_progress", "answered", "spam", "closed"] as const;

export async function listInquiries(db: SqlDriver, limit = 100): Promise<InquiryRow[]> {
  const result = await db.query<InquiryRow>(
    `SELECT id, name, email, topic, message, status, created_at::float8 AS "createdAt"
       FROM contact_inquiries ORDER BY created_at DESC LIMIT $1`, [Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows;
}

/** Status change + audit row in one statement. */
export async function setInquiryStatus(db: SqlDriver, id: string, status: (typeof INQUIRY_STATUSES)[number], actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH changed AS (UPDATE contact_inquiries SET status = $2 WHERE id = $1 RETURNING id, status),
       aud AS (INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
               SELECT $3, 'inquiry.status', 'contact_inquiry', changed.id, jsonb_build_object('status', changed.status), $4 FROM changed RETURNING 1)
     SELECT changed.id FROM changed`,
    [id, status, actor, now],
  );
  if (!result.rows[0]) throw new CmsError("not_found", "Talep bulunamadı");
  return result.rows[0];
}

/** AI usage is recorded in the append-only audit log (no prompt text, only task/model/token counts). */
export async function countAiUsageSince(db: SqlDriver, since: number) {
  const result = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'ai.draft' AND created_at > $1`, [since]);
  return result.rows[0]?.n ?? 0;
}

export async function recordAiUsage(db: SqlDriver, actor: string, detail: { task: string; model: string; inputTokens: number; outputTokens: number }, now: number) {
  await db.query(
    `INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at) VALUES ($1, 'ai.draft', 'ai', $2, $3::jsonb, $4)`,
    [actor, detail.task, JSON.stringify(detail), now],
  );
}
