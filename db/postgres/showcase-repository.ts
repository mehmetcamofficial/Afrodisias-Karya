import type { CollectionInput, ExperienceInput } from "../../lib/showcase-validation";
import { CmsError } from "./cms-repository";
import type { SqlDriver } from "./repository";

/**
 * CMS collections and experience sections (migration 0005).
 * Same guarantees as the product/blog CMS: every write is ONE statement with an
 * audit row, optimistic locking on `version`, and publishing is a separate,
 * human-only transition. Archived rows are never shown publicly.
 */
export type ShowcaseStatus = "draft" | "published" | "archived";
type Cover = { url: string; alt: string; credit: string; license: string };
type CollectionText = { title: string; intro: string; seoTitle: string; seoDescription: string };
export type CmsCollection = {
  id: string; slugTr: string; slugEn: string | null; status: ShowcaseStatus; position: number; cover: Cover | null;
  version: number; updatedAt: number; tr: CollectionText; en: CollectionText; productIds: string[];
};
export type ExperienceMedia =
  | { type: "image"; url: string; alt: string; credit: string; license: string; kind: string }
  | { type: "video"; url: string; poster: string; alt: string; credit: string; license: string; captionsUrl: string };
type ExperienceText = { title: string; lead: string; bodyMd: string };
export type CmsExperienceSection = {
  id: string; kind: ExperienceInput["kind"]; status: ShowcaseStatus; position: number; media: ExperienceMedia[];
  relatedProductIds: string[]; relatedCollectionIds: string[]; version: number; updatedAt: number; tr: ExperienceText; en: ExperienceText;
};

const emptyCollectionText: CollectionText = { title: "", intro: "", seoTitle: "", seoDescription: "" };
const emptyExperienceText: ExperienceText = { title: "", lead: "", bodyMd: "" };

const audit = (entity: string, action: string, actor: string, now: string) => `,
  aud AS (
    INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
    SELECT ${actor}, '${action}', '${entity}', changed.id, to_jsonb(changed.*), ${now} FROM changed RETURNING 1)
  SELECT changed.id, changed.version, changed.status FROM changed`;

async function explain(db: SqlDriver, table: "collections" | "experience_sections", id: string, expectedVersion: number, allowed: ShowcaseStatus[]): Promise<never> {
  const row = (await db.query<{ version: number; status: ShowcaseStatus }>(`SELECT version, status FROM ${table} WHERE id = $1`, [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Kayıt bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", `Kayıt başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  if (!allowed.includes(row.status)) throw new CmsError("invalid_state", `Bu işlem "${row.status}" durumundaki kayda uygulanamaz`);
  throw new CmsError("invalid_state", "İşlem koşulları sağlanmadı");
}

const uniqueViolation = (error: unknown, message: string) => {
  if (String((error as { code?: string }).code) === "23505") throw new CmsError("conflict", message);
  if (String((error as { code?: string }).code) === "23503") throw new CmsError("invalid_state", "Bağlanan ürün bulunamadı");
  throw error;
};

// ---------------------------------------------------------------- collections

const COLLECTION_SELECT = `
  SELECT c.id, c.slug_tr AS "slugTr", c.slug_en AS "slugEn", c.status, c.position, NULLIF(c.cover, '{}'::jsonb) AS cover, c.version,
         c.updated_at::float8 AS "updatedAt",
         coalesce((SELECT jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'intro', t.intro, 'seoTitle', t.seo_title, 'seoDescription', t.seo_description))
                     FROM collection_translations t WHERE t.collection_id = c.id), '{}'::jsonb) AS tx,
         coalesce((SELECT array_agg(cp.product_id ORDER BY cp.position, cp.product_id) FROM collection_products cp WHERE cp.collection_id = c.id), '{}') AS "productIds"
    FROM collections c`;
type CollectionRow = Omit<CmsCollection, "tr" | "en"> & { tx: Record<string, CollectionText> };
const hydrateCollection = ({ tx, ...row }: CollectionRow): CmsCollection => ({ ...row, tr: { ...emptyCollectionText, ...tx.tr }, en: { ...emptyCollectionText, ...tx.en } });

export async function listCollections(db: SqlDriver, opts: { includeArchived?: boolean; publishedOnly?: boolean } = {}) {
  const where = opts.publishedOnly ? "WHERE c.status = 'published'" : opts.includeArchived ? "" : "WHERE c.status <> 'archived'";
  return (await db.query<CollectionRow>(`${COLLECTION_SELECT} ${where} ORDER BY c.position, c.id`)).rows.map(hydrateCollection);
}

export async function getCollection(db: SqlDriver, id: string) {
  const row = (await db.query<CollectionRow>(`${COLLECTION_SELECT} WHERE c.id = $1`, [id])).rows[0];
  return row ? hydrateCollection(row) : null;
}

export async function getPublishedCollectionBySlug(db: SqlDriver, locale: "tr" | "en", slug: string) {
  const row = (await db.query<CollectionRow>(`${COLLECTION_SELECT} WHERE c.status = 'published' AND ${locale === "tr" ? "c.slug_tr" : "c.slug_en"} = $1`, [slug])).rows[0];
  return row ? hydrateCollection(row) : null;
}

const collectionTranslations = (input: CollectionInput) => JSON.stringify({ tr: input.tr, en: input.en });
const COLLECTION_TR = (param: string) => `,
  tr AS (
    INSERT INTO collection_translations(collection_id, locale, title, intro, seo_title, seo_description)
    SELECT changed.id, x.key, x.value->>'title', coalesce(x.value->>'intro',''), coalesce(x.value->>'seoTitle',''), coalesce(x.value->>'seoDescription','')
      FROM changed, jsonb_each(${param}::jsonb) AS x WHERE coalesce(x.value->>'title','') <> ''
    ON CONFLICT (collection_id, locale) DO UPDATE SET title = excluded.title, intro = excluded.intro, seo_title = excluded.seo_title, seo_description = excluded.seo_description
    RETURNING 1),
  tr_gone AS (
    DELETE FROM collection_translations t USING changed
     WHERE t.collection_id = changed.id AND t.locale = 'en' AND coalesce(${param}::jsonb->'en'->>'title','') = ''
    RETURNING 1)`;

export async function createCollection(db: SqlDriver, input: CollectionInput & { id: string }, actor: string, now: number) {
  try {
    const result = await db.query<{ id: string; version: number; status: string }>(
      `WITH changed AS (
         INSERT INTO collections(id, slug_tr, slug_en, position, cover, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', 1, $6, $6) RETURNING *)${COLLECTION_TR("$8")}${audit("collection", "collection.create", "$7", "$6")}`,
      [input.id, input.slugTr, input.slugEn, input.position, JSON.stringify(input.cover ?? {}), now, actor, collectionTranslations(input)],
    );
    return result.rows[0];
  } catch (error) { return uniqueViolation(error, "Kimlik veya slug kullanımda"); }
}

/** Editing a published collection takes it back to draft: changes are never live without a new publish. */
export async function updateCollection(db: SqlDriver, id: string, expectedVersion: number, input: CollectionInput, actor: string, now: number) {
  try {
    const result = await db.query<{ id: string; version: number; status: string }>(
      `WITH changed AS (
         UPDATE collections SET slug_tr = $2, slug_en = $3, position = $4, cover = $5::jsonb, status = 'draft', version = version + 1, updated_at = $6
          WHERE id = $1 AND version = $9 AND status IN ('draft','published') RETURNING *)${COLLECTION_TR("$8")}${audit("collection", "collection.update", "$7", "$6")}`,
      [id, input.slugTr, input.slugEn, input.position, JSON.stringify(input.cover ?? {}), now, actor, collectionTranslations(input), expectedVersion],
    );
    return result.rows[0] ?? explain(db, "collections", id, expectedVersion, ["draft", "published"]);
  } catch (error) { if (error instanceof CmsError) throw error; return uniqueViolation(error, "Slug kullanımda"); }
}

/**
 * Replaces the ordered product list atomically (and bumps the version).
 * All CTEs share one snapshot, so only dropped products are deleted and the rest
 * are upserted (deleting and re-inserting the same key in one statement would conflict).
 */
export async function setCollectionProducts(db: SqlDriver, id: string, expectedVersion: number, productIds: string[], actor: string, now: number) {
  try {
    const result = await db.query<{ id: string; version: number; status: string }>(
      `WITH changed AS (
         UPDATE collections SET version = version + 1, updated_at = $3, status = CASE WHEN status = 'published' THEN 'draft' ELSE status END
          WHERE id = $1 AND version = $2 AND status IN ('draft','published') RETURNING *),
       gone AS (DELETE FROM collection_products cp USING changed WHERE cp.collection_id = changed.id AND NOT (cp.product_id = ANY($4::text[])) RETURNING 1),
       added AS (
         INSERT INTO collection_products(collection_id, product_id, position)
         SELECT changed.id, p.id, p.ord - 1 FROM changed, unnest($4::text[]) WITH ORDINALITY AS p(id, ord)
         ON CONFLICT (collection_id, product_id) DO UPDATE SET position = excluded.position
         RETURNING 1)${audit("collection", "collection.products", "$5", "$3")}`,
      [id, expectedVersion, now, productIds, actor],
    );
    return result.rows[0] ?? explain(db, "collections", id, expectedVersion, ["draft", "published"]);
  } catch (error) { if (error instanceof CmsError) throw error; return uniqueViolation(error, "Ürün listesi geçersiz"); }
}

type Transition = { from: ShowcaseStatus[]; to: ShowcaseStatus; decision?: "published" };
export const SHOWCASE_TRANSITIONS: Record<"publish" | "unpublish" | "archive" | "restore", Transition> = {
  publish: { from: ["draft"], to: "published", decision: "published" },
  unpublish: { from: ["published"], to: "draft" },
  archive: { from: ["draft"], to: "archived" },
  restore: { from: ["archived"], to: "draft" },
};

async function transition(db: SqlDriver, table: "collections" | "experience_sections", entity: "collection" | "experience_section", id: string, expectedVersion: number, action: keyof typeof SHOWCASE_TRANSITIONS, actor: string, now: number) {
  const t = SHOWCASE_TRANSITIONS[action];
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE ${table} SET status = $3, version = version + 1, updated_at = $5,
              archived_at = CASE WHEN $3 = 'archived' THEN $5 WHEN $3 = 'draft' THEN NULL ELSE archived_at END
        WHERE id = $1 AND version = $2 AND status = ANY($4::text[]) RETURNING *),
     appr AS (
       INSERT INTO publication_approvals(entity_type, entity_id, version, decision, actor_email, note, created_at)
       SELECT '${entity}', changed.id, changed.version, $6, $7, '', $5 FROM changed WHERE $6::text IS NOT NULL RETURNING 1)${audit(entity, `${entity === "collection" ? "collection" : "experience"}.${action}`, "$7", "$5")}`,
    [id, expectedVersion, t.to, t.from, now, t.decision ?? null, actor],
  );
  return result.rows[0] ?? explain(db, table, id, expectedVersion, t.from);
}

export const transitionCollection = (db: SqlDriver, id: string, v: number, action: keyof typeof SHOWCASE_TRANSITIONS, actor: string, now: number) =>
  transition(db, "collections", "collection", id, v, action, actor, now);

// ---------------------------------------------------------- experience sections

const EXPERIENCE_SELECT = `
  SELECT s.id, s.kind, s.status, s.position, s.media, s.related_product_ids AS "relatedProductIds", s.related_collection_ids AS "relatedCollectionIds",
         s.version, s.updated_at::float8 AS "updatedAt",
         coalesce((SELECT jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'lead', t.lead, 'bodyMd', t.body_md))
                     FROM experience_translations t WHERE t.section_id = s.id), '{}'::jsonb) AS tx
    FROM experience_sections s`;
type ExperienceRow = Omit<CmsExperienceSection, "tr" | "en"> & { tx: Record<string, ExperienceText> };
const hydrateExperience = ({ tx, ...row }: ExperienceRow): CmsExperienceSection => ({ ...row, tr: { ...emptyExperienceText, ...tx.tr }, en: { ...emptyExperienceText, ...tx.en } });

export async function listExperienceSections(db: SqlDriver, opts: { includeArchived?: boolean; publishedOnly?: boolean } = {}) {
  const where = opts.publishedOnly ? "WHERE s.status = 'published'" : opts.includeArchived ? "" : "WHERE s.status <> 'archived'";
  return (await db.query<ExperienceRow>(`${EXPERIENCE_SELECT} ${where} ORDER BY s.position, s.id`)).rows.map(hydrateExperience);
}

export async function getExperienceSection(db: SqlDriver, id: string) {
  const row = (await db.query<ExperienceRow>(`${EXPERIENCE_SELECT} WHERE s.id = $1`, [id])).rows[0];
  return row ? hydrateExperience(row) : null;
}

const experienceTranslations = (input: ExperienceInput) => JSON.stringify({ tr: input.tr, en: input.en });
const EXPERIENCE_TR = (param: string) => `,
  tr AS (
    INSERT INTO experience_translations(section_id, locale, title, lead, body_md)
    SELECT changed.id, x.key, x.value->>'title', coalesce(x.value->>'lead',''), coalesce(x.value->>'bodyMd','')
      FROM changed, jsonb_each(${param}::jsonb) AS x WHERE coalesce(x.value->>'title','') <> ''
    ON CONFLICT (section_id, locale) DO UPDATE SET title = excluded.title, lead = excluded.lead, body_md = excluded.body_md
    RETURNING 1),
  tr_gone AS (
    DELETE FROM experience_translations t USING changed
     WHERE t.section_id = changed.id AND t.locale = 'en' AND coalesce(${param}::jsonb->'en'->>'title','') = ''
    RETURNING 1)`;

export async function createExperienceSection(db: SqlDriver, input: ExperienceInput & { id: string }, actor: string, now: number) {
  try {
    const result = await db.query<{ id: string; version: number; status: string }>(
      `WITH changed AS (
         INSERT INTO experience_sections(id, kind, position, media, related_product_ids, related_collection_ids, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::text[], $6::text[], 'draft', 1, $7, $7) RETURNING *)${EXPERIENCE_TR("$9")}${audit("experience_section", "experience.create", "$8", "$7")}`,
      [input.id, input.kind, input.position, JSON.stringify(input.media), input.relatedProductIds, input.relatedCollectionIds, now, actor, experienceTranslations(input)],
    );
    return result.rows[0];
  } catch (error) { return uniqueViolation(error, "Kimlik kullanımda"); }
}

export async function updateExperienceSection(db: SqlDriver, id: string, expectedVersion: number, input: ExperienceInput, actor: string, now: number) {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE experience_sections SET kind = $2, position = $3, media = $4::jsonb, related_product_ids = $5::text[], related_collection_ids = $6::text[],
              status = 'draft', version = version + 1, updated_at = $7
        WHERE id = $1 AND version = $10 AND status IN ('draft','published') RETURNING *)${EXPERIENCE_TR("$9")}${audit("experience_section", "experience.update", "$8", "$7")}`,
    [id, input.kind, input.position, JSON.stringify(input.media), input.relatedProductIds, input.relatedCollectionIds, now, actor, experienceTranslations(input), expectedVersion],
  );
  return result.rows[0] ?? explain(db, "experience_sections", id, expectedVersion, ["draft", "published"]);
}

export const transitionExperienceSection = (db: SqlDriver, id: string, v: number, action: keyof typeof SHOWCASE_TRANSITIONS, actor: string, now: number) =>
  transition(db, "experience_sections", "experience_section", id, v, action, actor, now);
