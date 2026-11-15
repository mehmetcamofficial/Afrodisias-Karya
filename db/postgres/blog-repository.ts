import type { BlogInput } from "../../lib/blog-validation";
import { CmsError } from "./cms-repository";
import type { SqlDriver } from "./repository";

/**
 * Blog CMS. Same guarantees as the product CMS: each write is ONE statement
 * (row change + version snapshot + audit), optimistic locking on `version`,
 * published posts are read-only, and nothing publishes without an explicit
 * human action. Scheduled posts become visible only when publish_at passes
 * (checked at read time — no background job publishes anything).
 */
export type BlogStatus = "draft" | "in_review" | "approved" | "scheduled" | "published" | "archived";
type Media = { url: string; alt: string; credit: string; license: string; kind: string };
type Tr = { title: string; excerpt: string; bodyMd: string; seoTitle: string; seoDescription: string };
export type CmsBlogPost = {
  id: string; slug: string; category: string; author: string; status: BlogStatus; featured: boolean; tags: string[];
  template: "article" | "recipe"; recipe: BlogInput["recipe"]; relatedProductIds: string[]; cover: Media | null; gallery: Media[];
  videoUrl: string; origin: "cms" | "code-import"; publishAt: number | null; version: number; createdAt: number; updatedAt: number; tr: Tr; en: Tr;
};
export type BlogVersionRow = { version: number; actorEmail: string; createdAt: number; status: string };

const emptyTr = { title: "", excerpt: "", bodyMd: "", seoTitle: "", seoDescription: "" };
const SELECT = `
  SELECT p.id, p.slug, p.category, p.author, p.status, p.featured, p.tags, p.template, p.recipe,
         p.related_product_ids AS "relatedProductIds", NULLIF(p.cover, '{}'::jsonb) AS cover, p.gallery,
         p.video_url AS "videoUrl", p.origin, p.publish_at::float8 AS "publishAt", p.version,
         p.created_at::float8 AS "createdAt", p.updated_at::float8 AS "updatedAt",
         coalesce((SELECT jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'excerpt', t.excerpt, 'bodyMd', t.body_md,
           'seoTitle', t.seo_title, 'seoDescription', t.seo_description)) FROM blog_translations t WHERE t.post_id = p.id), '{}'::jsonb) AS tx
    FROM blog_posts p`;

type Row = Omit<CmsBlogPost, "tr" | "en"> & { tx: Record<string, Tr> };
const hydrate = (row: Row): CmsBlogPost => {
  const { tx, ...rest } = row;
  return { ...rest, tr: { ...emptyTr, ...tx.tr }, en: { ...emptyTr, ...tx.en } };
};

export async function listBlogPosts(db: SqlDriver, opts: { includeArchived?: boolean } = {}) {
  const result = await db.query<Row>(`${SELECT} ${opts.includeArchived ? "" : "WHERE p.status <> 'archived'"} ORDER BY p.updated_at DESC`);
  return result.rows.map(hydrate);
}

export async function getBlogPost(db: SqlDriver, id: string) {
  const row = (await db.query<Row>(`${SELECT} WHERE p.id = $1`, [id])).rows[0];
  return row ? hydrate(row) : null;
}

/** Public read: published, or scheduled whose time has come. */
export async function listVisibleBlogPosts(db: SqlDriver, now: number) {
  const result = await db.query<Row>(`${SELECT} WHERE p.status = 'published' OR (p.status = 'scheduled' AND p.publish_at <= $1) ORDER BY coalesce(p.publish_at, p.updated_at) DESC`, [now]);
  return result.rows.map(hydrate);
}

export async function getBlogPostBySlug(db: SqlDriver, slug: string) {
  const row = (await db.query<Row>(`${SELECT} WHERE p.slug = $1`, [slug])).rows[0];
  return row ? hydrate(row) : null;
}

export async function listBlogVersions(db: SqlDriver, id: string): Promise<BlogVersionRow[]> {
  return (await db.query<BlogVersionRow>(
    `SELECT version, actor_email AS "actorEmail", created_at::float8 AS "createdAt", snapshot->>'status' AS status
       FROM blog_versions WHERE post_id = $1 ORDER BY version DESC LIMIT 50`, [id])).rows;
}

const translationsJson = (input: BlogInput) => JSON.stringify({ tr: input.tr, en: input.en });

/** translations + version snapshot + audit, chained after a `changed` CTE. */
function tail(action: string, actorParam: string, nowParam: string, translationsParam?: string) {
  const tr = translationsParam ? `,
  tr AS (
    INSERT INTO blog_translations(post_id, locale, title, excerpt, body_md, seo_title, seo_description)
    SELECT changed.id, x.key, coalesce(x.value->>'title',''), coalesce(x.value->>'excerpt',''), coalesce(x.value->>'bodyMd',''),
           coalesce(x.value->>'seoTitle',''), coalesce(x.value->>'seoDescription','')
      FROM changed, jsonb_each(${translationsParam}::jsonb) AS x
     WHERE x.key = 'tr' OR coalesce(x.value->>'title','') <> ''
    ON CONFLICT (post_id, locale) DO UPDATE SET title = excluded.title, excerpt = excluded.excerpt, body_md = excluded.body_md,
      seo_title = excluded.seo_title, seo_description = excluded.seo_description
    RETURNING 1)` : "";
  const translations = translationsParam ? `${translationsParam}::jsonb`
    : `(SELECT coalesce(jsonb_object_agg(t.locale, to_jsonb(t.*) - 'post_id' - 'locale'), '{}'::jsonb) FROM blog_translations t WHERE t.post_id = changed.id)`;
  return `${tr},
  ver AS (
    INSERT INTO blog_versions(post_id, version, snapshot, actor_email, created_at)
    SELECT changed.id, changed.version, to_jsonb(changed.*) || jsonb_build_object('translations', ${translations}), ${actorParam}, ${nowParam} FROM changed
    RETURNING 1),
  aud AS (
    INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
    SELECT ${actorParam}, '${action}', 'blog_post', changed.id, jsonb_build_object('version', changed.version, 'status', changed.status, 'slug', changed.slug), ${nowParam} FROM changed
    RETURNING 1)
  SELECT changed.id, changed.version, changed.status FROM changed`;
}

const fields = (input: BlogInput) => [input.slug, input.category, input.author, input.featured, input.tags, input.template,
  JSON.stringify(input.recipe), input.relatedProductIds, JSON.stringify(input.cover ?? {}), JSON.stringify(input.gallery), input.videoUrl];

export async function createBlogPost(db: SqlDriver, input: BlogInput & { id: string }, actor: string, now: number, origin: "cms" | "code-import" = "cms") {
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       INSERT INTO blog_posts(id, slug, category, author, featured, tags, template, recipe, related_product_ids, cover, gallery, video_url,
                              status, version, created_at, updated_at, origin)
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8::jsonb, $9::text[], $10::jsonb, $11::jsonb, $12, 'draft', 1, $13, $13, $16)
       ON CONFLICT DO NOTHING
       RETURNING *)${tail("blog.create", "$14", "$13", "$15")}`,
    [input.id, ...fields(input), now, actor, translationsJson(input), origin],
  );
  if (!result.rows[0]) throw new CmsError("conflict", `"${input.id}" kimliği veya "${input.slug}" slug'ı kullanımda`);
  return result.rows[0];
}

const EDITABLE: BlogStatus[] = ["draft", "in_review", "approved", "scheduled"];

async function explain(db: SqlDriver, id: string, expectedVersion: number, allowed: BlogStatus[]): Promise<never> {
  const row = (await db.query<{ version: number; status: BlogStatus }>("SELECT version, status FROM blog_posts WHERE id = $1", [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Yazı bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", `Yazı başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  if (!allowed.includes(row.status)) throw new CmsError("invalid_state", `Bu işlem "${row.status}" durumundaki yazıya uygulanamaz`);
  throw new CmsError("invalid_state", "İşlem koşulları sağlanmadı");
}

/** Editing a reviewed/scheduled post sends it back to draft (and cancels the schedule). Published posts are read-only. */
export async function updateBlogPost(db: SqlDriver, id: string, expectedVersion: number, input: BlogInput, actor: string, now: number) {
  try {
    const result = await db.query<{ id: string; version: number; status: string }>(
      `WITH changed AS (
         UPDATE blog_posts SET slug = $2, category = $3, author = $4, featured = $5, tags = $6::text[], template = $7, recipe = $8::jsonb,
                related_product_ids = $9::text[], cover = $10::jsonb, gallery = $11::jsonb, video_url = $12,
                status = 'draft', publish_at = NULL, version = version + 1, updated_at = $13
          WHERE id = $1 AND version = $16 AND status = ANY($17::text[])
         RETURNING *)${tail("blog.update", "$14", "$13", "$15")}`,
      [id, ...fields(input), now, actor, translationsJson(input), expectedVersion, EDITABLE],
    );
    return result.rows[0] ?? explain(db, id, expectedVersion, EDITABLE);
  } catch (error) {
    if (error instanceof CmsError) throw error;
    if (String((error as { code?: string }).code) === "23505") throw new CmsError("conflict", `"${input.slug}" slug'ı kullanımda`);
    throw error;
  }
}

type Transition = { from: BlogStatus[]; to: BlogStatus; decision?: "requested" | "approved" | "rejected" | "published" };
export const BLOG_TRANSITIONS: Record<"submit" | "approve" | "reject" | "schedule" | "publish" | "unpublish" | "archive" | "restore", Transition> = {
  submit: { from: ["draft"], to: "in_review", decision: "requested" },
  approve: { from: ["in_review"], to: "approved", decision: "approved" },
  reject: { from: ["in_review", "approved"], to: "draft", decision: "rejected" },
  schedule: { from: ["approved"], to: "scheduled", decision: "approved" },
  publish: { from: ["approved", "scheduled"], to: "published", decision: "published" },
  unpublish: { from: ["published", "scheduled"], to: "draft" },
  archive: { from: ["draft", "in_review", "approved"], to: "archived" },
  restore: { from: ["archived"], to: "draft" },
};

export async function transitionBlogPost(db: SqlDriver, id: string, expectedVersion: number, action: keyof typeof BLOG_TRANSITIONS, actor: string, note: string, now: number, publishAt?: number) {
  const t = BLOG_TRANSITIONS[action];
  if (action === "schedule" && (!publishAt || publishAt <= now)) throw new CmsError("invalid_state", "Zamanlama gelecekte bir tarih olmalı");
  const result = await db.query<{ id: string; version: number; status: string }>(
    `WITH changed AS (
       UPDATE blog_posts SET status = $3, version = version + 1, updated_at = $5,
              publish_at = CASE WHEN $3 = 'scheduled' THEN $9::bigint WHEN $3 = 'published' THEN coalesce(LEAST(publish_at, $5), $5) WHEN $3 IN ('draft','archived') THEN NULL ELSE publish_at END,
              archived_at = CASE WHEN $3 = 'archived' THEN $5 WHEN $3 = 'draft' THEN NULL ELSE archived_at END
        WHERE id = $1 AND version = $2 AND status = ANY($4::text[])
       RETURNING *),
     appr AS (
       INSERT INTO publication_approvals(entity_type, entity_id, version, decision, actor_email, note, created_at)
       SELECT 'blog_post', changed.id, changed.version, $6, $7, $8, $5 FROM changed WHERE $6::text IS NOT NULL
       RETURNING 1)${tail(`blog.${action}`, "$7", "$5")}`,
    [id, expectedVersion, t.to, t.from, now, t.decision ?? null, actor, note, publishAt ?? null],
  );
  return result.rows[0] ?? explain(db, id, expectedVersion, t.from);
}

/** Permanent delete: archived posts that were never published. Audit keeps the final snapshot. */
export async function deleteBlogPost(db: SqlDriver, id: string, expectedVersion: number, actor: string, now: number) {
  const result = await db.query<{ id: string }>(
    `WITH target AS (
       SELECT p.* FROM blog_posts p WHERE p.id = $1 AND p.version = $2 AND p.status = 'archived'
          AND NOT EXISTS (SELECT 1 FROM publication_approvals a WHERE a.entity_type = 'blog_post' AND a.entity_id = p.id AND a.decision = 'published')),
     aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $3, 'blog.delete', 'blog_post', target.id, to_jsonb(target.*), $4 FROM target RETURNING 1),
     gone AS (DELETE FROM blog_posts WHERE id IN (SELECT id FROM target) RETURNING id)
     SELECT id FROM gone`,
    [id, expectedVersion, actor, now],
  );
  if (result.rows[0]) return result.rows[0];
  const row = (await db.query<{ version: number; status: string }>("SELECT version, status FROM blog_posts WHERE id = $1", [id])).rows[0];
  if (!row) throw new CmsError("not_found", "Yazı bulunamadı");
  if (row.version !== expectedVersion) throw new CmsError("version_mismatch", "Yazı başka bir oturumda değişti; sayfayı yenileyin");
  if (row.status !== "archived") throw new CmsError("invalid_state", "Yalnızca arşivdeki yazı silinebilir");
  throw new CmsError("protected", "Daha önce yayımlanmış yazı kalıcı silinemez; arşivde kalır");
}
