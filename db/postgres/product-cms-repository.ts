/**
 * Commercial price approval and product media (migration 0008).
 *
 * Same rules as cms-repository: every write is ONE statement that also appends
 * to audit_logs, so the change and its audit commit together (Neon HTTP safe).
 * Published products are read-only here too: unpublish first.
 */
import type { SqlDriver } from "./repository";
import { CmsError } from "./cms-repository";
import type { Currency } from "../../lib/products";
import type { MediaTruth } from "../../lib/media-validation";

export type PriceApproval = { currency: Currency; amountMinor: number; approvedBy: string; approvedAt: number };
export type ProductMedia = {
  id: string; url: string; truth: MediaTruth; kind: string; mime: string; bytes: number; width: number | null; height: number | null;
  altTr: string; altEn: string; credit: string; license: string; approvedBy: string | null; approvedAt: number | null; position: number;
};

const EDITABLE = ["draft", "in_review", "approved"];
const PRICE_COLUMN: Record<Currency, string> = { TRY: "price_kurus", EUR: "price_eur_cents", USD: "price_usd_cents" };

async function productState(db: SqlDriver, id: string) {
  return (await db.query<{ version: number; status: string; TRY: number | null; EUR: number | null; USD: number | null }>(
    `SELECT version, status, price_kurus AS "TRY", price_eur_cents AS "EUR", price_usd_cents AS "USD" FROM products WHERE id = $1`, [id])).rows[0];
}

/**
 * Approves the CURRENT price of one currency for one product version. The
 * caller states the amount they saw; if it differs from the stored price (or the
 * product changed), nothing is approved. Separate from the content workflow.
 */
export async function approveProductPrice(db: SqlDriver, id: string, expectedVersion: number, currency: Currency, amountMinor: number, actor: string, now: number) {
  const column = PRICE_COLUMN[currency];
  const result = await db.query<{ id: string }>(
    `WITH target AS (
       SELECT id FROM products WHERE id = $1 AND version = $2 AND status = ANY($7::text[]) AND ${column} = $4
     ), up AS (
       INSERT INTO product_price_approvals(product_id, currency, amount_minor, approved_by, approved_at)
       SELECT id, $3, $4, $5, $6 FROM target
       ON CONFLICT (product_id, currency) DO UPDATE SET amount_minor = excluded.amount_minor,
         approved_by = excluded.approved_by, approved_at = excluded.approved_at
       RETURNING product_id
     ), aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $5, 'price.approve', 'product', product_id, jsonb_build_object('currency', $3::text, 'amountMinor', $4::int, 'version', $2::int), $6 FROM up
       RETURNING 1)
     SELECT product_id AS id FROM up`,
    [id, expectedVersion, currency, amountMinor, actor, now, EDITABLE],
  );
  if (result.rows[0]) return { id, currency, amountMinor };
  const row = await productState(db, id);
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", `Ürün başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  if (!EDITABLE.includes(row.status)) throw new CmsError("invalid_state", "Yayındaki veya arşivdeki ürünün fiyatı onaylanamaz");
  if (row[currency] === null) throw new CmsError("invalid_state", `${currency} fiyatı girilmemiş; onaylanacak tutar yok`);
  throw new CmsError("conflict", `Onaylanan tutar güncel ${currency} fiyatıyla eşleşmiyor; sayfayı yenileyin`);
}

/** Withdraws a price approval (e.g. a mistake). Not allowed on a published product. */
export async function revokeProductPrice(db: SqlDriver, id: string, currency: Currency, actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH gone AS (
       DELETE FROM product_price_approvals a USING products p
        WHERE a.product_id = $1 AND a.currency = $2 AND p.id = a.product_id AND p.status = ANY($5::text[])
       RETURNING a.product_id, a.amount_minor
     ), aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $3, 'price.revoke', 'product', product_id, jsonb_build_object('currency', $2::text, 'amountMinor', amount_minor, 'reason', 'manual'), $4 FROM gone
       RETURNING 1)
     SELECT product_id AS id FROM gone`,
    [id, currency, actor, now, EDITABLE],
  );
  if (result.rows[0]) return { id, currency };
  const row = await productState(db, id);
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (!EDITABLE.includes(row.status)) throw new CmsError("invalid_state", "Yayındaki ürünün fiyat onayı kaldırılamaz; önce yayından kaldırın");
  throw new CmsError("not_found", `${currency} için kayıtlı fiyat onayı yok`);
}

export type NewMedia = {
  id: string; productId: string; truth: MediaTruth; mime: string; bytes: number; width: number | null; height: number | null;
  altTr: string; altEn: string; credit: string; license: string;
  /** Uploaded bytes (stored in media_blobs) or an existing public repo path. */
  data?: Buffer; sha256?: string; url?: string;
};

/** Adds an image to a product: upload (bytes in PostgreSQL) or a repo path. Never approved on creation. */
export async function addProductMedia(db: SqlDriver, media: NewMedia, actor: string, now: number) {
  const url = media.data ? `/media/${media.id}` : media.url!;
  const result = await db.query<{ id: string }>(
    `WITH target AS (SELECT id FROM products WHERE id = $2 AND status = ANY($16::text[])),
     asset AS (
       INSERT INTO media_assets(id, url, kind, mime, bytes, width, height, alt_tr, alt_en, truth, credit, license, created_by, created_at)
       SELECT $1, $3, 'image', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 FROM target
       RETURNING id),
     blob AS (
       INSERT INTO media_blobs(media_id, data, sha256) SELECT id, decode($15::text, 'base64'), $17 FROM asset WHERE $15::text IS NOT NULL
       RETURNING 1),
     link AS (
       INSERT INTO product_media(product_id, media_id, position)
       SELECT $2, id, coalesce((SELECT max(position) + 1 FROM product_media WHERE product_id = $2), 0) FROM asset
       RETURNING media_id),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $13, 'media.add', 'product', $2, jsonb_build_object('mediaId', media_id, 'truth', $10::text, 'url', $3::text, 'bytes', $5::int), $14 FROM link
       RETURNING 1)
     SELECT media_id AS id FROM link`,
    [media.id, media.productId, url, media.mime, media.bytes, media.width, media.height, media.altTr, media.altEn,
      media.truth, media.credit, media.license, actor, now, media.data ? media.data.toString("base64") : null, EDITABLE, media.sha256 ?? null],
  );
  if (result.rows[0]) return { id: media.id, url };
  const row = await productState(db, media.productId);
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  throw new CmsError("invalid_state", "Yayındaki veya arşivdeki ürüne görsel eklenemez");
}

/**
 * Approves (or withdraws approval of) an image as a TRUE depiction. Only real
 * photos — or editorial images, which only count for subscriptions/experiences —
 * can be approved; concept and range images never.
 */
export async function setMediaApproval(db: SqlDriver, mediaId: string, approve: boolean, actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH changed AS (
       UPDATE media_assets SET approved_by = CASE WHEN $2 THEN $3 END, approved_at = CASE WHEN $2 THEN $4::bigint END
        WHERE id = $1 AND truth IN ('photo','editorial') AND (approved_at IS NULL) = $2
          AND NOT EXISTS (SELECT 1 FROM product_media pm JOIN products p ON p.id = pm.product_id WHERE pm.media_id = $1 AND p.status = 'published')
       RETURNING id, truth),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $3, CASE WHEN $2 THEN 'media.approve' ELSE 'media.revoke' END, 'media', id, jsonb_build_object('truth', truth), $4 FROM changed
       RETURNING 1)
     SELECT id FROM changed`,
    [mediaId, approve, actor, now],
  );
  if (result.rows[0]) return { id: mediaId, approved: approve };
  const row = (await db.query<{ truth: string; approved: boolean; live: boolean }>(
    `SELECT truth, approved_at IS NOT NULL AS approved,
            EXISTS (SELECT 1 FROM product_media pm JOIN products p ON p.id = pm.product_id WHERE pm.media_id = m.id AND p.status = 'published') AS live
       FROM media_assets m WHERE id = $1`, [mediaId])).rows[0];
  if (!row) throw new CmsError("not_found", "Görsel bulunamadı");
  if (!["photo", "editorial"].includes(row.truth)) throw new CmsError("invalid_state", "Konsept veya seri görseli gerçek ürün fotoğrafı olarak onaylanamaz");
  if (row.live) throw new CmsError("invalid_state", "Yayındaki bir ürünün görsel onayı değiştirilemez; önce yayından kaldırın");
  throw new CmsError("conflict", approve ? "Görsel zaten onaylı" : "Görsel zaten onaysız");
}

/** Removes an image from a product (the asset and its audit history are kept). */
export async function unlinkProductMedia(db: SqlDriver, productId: string, mediaId: string, actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH gone AS (
       DELETE FROM product_media pm USING products p
        WHERE pm.product_id = $1 AND pm.media_id = $2 AND p.id = pm.product_id AND p.status = ANY($5::text[])
       RETURNING pm.media_id),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $3, 'media.unlink', 'product', $1, jsonb_build_object('mediaId', media_id), $4 FROM gone
       RETURNING 1)
     SELECT media_id AS id FROM gone`,
    [productId, mediaId, actor, now, EDITABLE],
  );
  if (result.rows[0]) return { id: mediaId };
  const row = await productState(db, productId);
  if (!row) throw new CmsError("not_found", "Ürün bulunamadı");
  if (!EDITABLE.includes(row.status)) throw new CmsError("invalid_state", "Yayındaki veya arşivdeki üründen görsel kaldırılamaz");
  throw new CmsError("not_found", "Görsel bu ürüne bağlı değil");
}

/** Bytes of an uploaded image and whether anyone may see it (linked to a published product). */
export async function getMediaBlob(db: SqlDriver, mediaId: string) {
  // base64 keeps the bytes identical over both node-postgres and the Neon HTTP driver.
  const row = (await db.query<{ mime: string; data: string; sha256: string; isPublic: boolean }>(
    `SELECT m.mime, encode(b.data, 'base64') AS data, b.sha256,
            EXISTS (SELECT 1 FROM product_media pm JOIN products p ON p.id = pm.product_id WHERE pm.media_id = m.id AND p.status = 'published') AS "isPublic"
       FROM media_assets m JOIN media_blobs b ON b.media_id = m.id WHERE m.id = $1`, [mediaId])).rows[0];
  return row ? { mime: row.mime, data: Buffer.from(row.data, "base64"), sha256: row.sha256, isPublic: row.isPublic } : null;
}
