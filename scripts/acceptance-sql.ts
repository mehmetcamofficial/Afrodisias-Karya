/**
 * CMS acceptance scenario rendered to plain SQL, for running on an ISOLATED
 * database branch (e.g. a Neon child branch) through a SQL console/MCP tool.
 *
 * It calls the real repository functions with a recording driver, so the SQL
 * executed is exactly what the app sends. Parameters are inlined as escaped
 * literals. Output: JSON { writes: string[], verify: string[] }.
 *
 *   pnpm exec tsx scripts/acceptance-sql.ts > acceptance.json
 *
 * Never point this at Production: every id is prefixed "acc-" and the writes
 * are meant for a disposable branch.
 */
import { createBlogPost, getBlogPost, transitionBlogPost, updateBlogPost } from "../db/postgres/blog-repository";
import { createCmsProduct, getCmsProduct, transitionCmsProduct, updateCmsProduct } from "../db/postgres/cms-repository";
import type { SqlDriver } from "../db/postgres/repository";
import {
  createCollection, createExperienceSection, getCollection, getExperienceSection, setCollectionProducts, transitionCollection, transitionExperienceSection,
} from "../db/postgres/showcase-repository";
import { blogInputSchema } from "../lib/blog-validation";
import { productInputSchema } from "../lib/cms-validation";
import { collectionInputSchema, experienceInputSchema } from "../lib/showcase-validation";

const literal = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("bad number"); return String(value); }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(",")}]::text[]`;
  return `'${String(value).replace(/'/g, "''")}'`;
};
const render = (sql: string, params: readonly unknown[]) =>
  // Replace highest index first so $1 never clobbers $10.
  params.map((_, i) => params.length - i).reduce((out, n) => out.replace(new RegExp(`\\$${n}(?!\\d)`, "g"), literal(params[n - 1])), sql);

const writes: string[] = [];
const verify: string[] = [];
let target = writes;
const recorder: SqlDriver = {
  async query<T extends Record<string, unknown>>(sql: string, params: readonly unknown[] = []) {
    target.push(render(sql, params).trim());
    // Writes need a "changed" row to continue; reads are only recorded.
    return target === writes ? { rows: [{ id: "acc", version: 1, status: "draft" } as unknown as T], rowCount: 1 } : { rows: [], rowCount: 0 };
  },
};

const actor = "acceptance@example.test";
const now = 1_900_000_000_000;
const product = { id: "acc-oil", ...productInputSchema.parse({ id: "acc-oil", category: "glass", size: "500 ml", priceKurus: 99000, stock: 3, tr: { name: "Kabul Testi Yağı", description: "Kabul testi açıklaması" } }) };
const post = { id: "acc-post", ...blogInputSchema.parse({ slug: "acc-post", category: "Zeytinyağı Rehberi", author: "Altın Dal", tr: { title: "Kabul testi yazısı", bodyMd: "## Başlık\n<script>alert(1)</script>" } }) };
const collection = { id: "acc-col", ...collectionInputSchema.parse({ slugTr: "acc-koleksiyon", slugEn: "acc-collection", tr: { title: "Kabul koleksiyonu" }, en: { title: "Acceptance collection" } }) };
const section = { id: "acc-exp", ...experienceInputSchema.parse({ kind: "harvest", tr: { title: "Kabul hasat bölümü", bodyMd: "Metin" }, en: { title: "Acceptance harvest" },
  media: [{ type: "video", url: "/media/acc.mp4", poster: "/hero-tetrapylon-grove.webp", alt: "Kabul videosu" }, { type: "image", url: "/hero-tetrapylon-grove.webp", alt: "Zeytinlik" }], relatedCollectionIds: ["acc-col"] }) };

await (async () => {
  // Product: create → update → archive → restore
  await createCmsProduct(recorder, product, actor, now);
  await updateCmsProduct(recorder, "acc-oil", 1, { ...product, stock: 5, tr: { ...product.tr, name: "Kabul Testi Yağı (güncel)" } }, actor, now + 1);
  await transitionCmsProduct(recorder, "acc-oil", 2, "archive", actor, "", now + 2);
  await transitionCmsProduct(recorder, "acc-oil", 3, "restore", actor, "", now + 3);
  // Blog: create → edit → submit → approve → publish
  await createBlogPost(recorder, post, actor, now + 10);
  await updateBlogPost(recorder, "acc-post", 1, { ...post, tr: { ...post.tr, excerpt: "Düzenlendi" } }, actor, now + 11);
  await transitionBlogPost(recorder, "acc-post", 2, "submit", actor, "", now + 12);
  await transitionBlogPost(recorder, "acc-post", 3, "approve", actor, "", now + 13);
  await transitionBlogPost(recorder, "acc-post", 4, "publish", actor, "", now + 14);
  // Collection: create → link products → reorder → publish
  await createCollection(recorder, collection, actor, now + 20);
  await setCollectionProducts(recorder, "acc-col", 1, ["acc-oil", "glass-500", "glass-750"], actor, now + 21);
  await setCollectionProducts(recorder, "acc-col", 2, ["glass-750", "acc-oil"], actor, now + 22);
  await transitionCollection(recorder, "acc-col", 3, "publish", actor, now + 23);
  // Experience: create with video (poster) + image → publish
  await createExperienceSection(recorder, section, actor, now + 30);
  await transitionExperienceSection(recorder, "acc-exp", 1, "publish", actor, now + 31);

  target = verify;
  await getCmsProduct(recorder, "acc-oil");
  await getBlogPost(recorder, "acc-post");
  await getCollection(recorder, "acc-col");
  await getExperienceSection(recorder, "acc-exp");
  verify.push("SELECT action, count(*)::int AS n FROM audit_logs WHERE entity_id LIKE 'acc-%' GROUP BY action ORDER BY action");
})();

process.stdout.write(JSON.stringify({ writes, verify }, null, 1));
