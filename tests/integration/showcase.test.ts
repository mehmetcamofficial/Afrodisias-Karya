import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CmsError, listAuditLogs } from "../../db/postgres/cms-repository";
import {
  createCollection, createExperienceSection, getCollection, getExperienceSection, getPublishedCollectionBySlug, listCollections,
  listExperienceSections, setCollectionProducts, transitionCollection, transitionExperienceSection, updateCollection, updateExperienceSection,
} from "../../db/postgres/showcase-repository";
import { collectionInputSchema, experienceInputSchema } from "../../lib/showcase-validation";
import { createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const actor = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;
const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? error.code : String(error); } };
const collection = (over: Record<string, unknown> = {}) => ({ id: "gift-edit", ...collectionInputSchema.parse({ slugTr: "hediye-seckisi", slugEn: "gift-edit", tr: { title: "Hediye seçkisi", intro: "Hediye için." }, en: { title: "Gift edit" }, ...over }) });
const section = (over: Record<string, unknown> = {}) => ({ id: "harvest-notes", ...experienceInputSchema.parse({
  kind: "harvest", tr: { title: "Hasat notları", lead: "Ekim sonu", bodyMd: "## Hasat\n<script>alert(1)</script>" },
  media: [{ type: "video", url: "/media/harvest.mp4", poster: "/hero-tetrapylon-grove.webp", alt: "Hasat videosu" }, { type: "image", url: "/hero-tetrapylon-grove.webp", alt: "Zeytinlik" }], ...over }) });

run("Collections and experience CMS against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("creates a draft collection with TR/EN, links and orders products, publishes, and re-reads everything", async () => {
    await createCollection(db, collection(), actor, 1000);
    expect(await getPublishedCollectionBySlug(db, "tr", "hediye-seckisi")).toBeNull(); // drafts are not public
    await setCollectionProducts(db, "gift-edit", 1, ["glass-750", "reserve-500", "aromatic-set"], actor, 1100);
    await setCollectionProducts(db, "gift-edit", 2, ["aromatic-set", "glass-750"], actor, 1200); // reorder + remove
    await transitionCollection(db, "gift-edit", 3, "publish", actor, 1300);
    const fresh = await getPublishedCollectionBySlug(db, "en", "gift-edit");
    expect(fresh).toMatchObject({ status: "published", version: 4, productIds: ["aromatic-set", "glass-750"], tr: { title: "Hediye seçkisi" }, en: { title: "Gift edit" } });
    expect((await listAuditLogs(db, { entityId: "gift-edit" })).map((a) => a.action)).toEqual(["collection.publish", "collection.products", "collection.products", "collection.create"]);
  });

  it("editing a published collection returns it to draft; stale versions and unknown products are rejected", async () => {
    await createCollection(db, collection(), actor, 1);
    await transitionCollection(db, "gift-edit", 1, "publish", actor, 2);
    await updateCollection(db, "gift-edit", 2, collection({ tr: { title: "Yeni başlık" } }), actor, 3);
    expect(await getCollection(db, "gift-edit")).toMatchObject({ status: "draft", version: 3, tr: { title: "Yeni başlık" }, en: { title: "Gift edit" } });
    expect(await codeOf(updateCollection(db, "gift-edit", 2, collection(), actor, 4))).toBe("version_mismatch");
    expect(await codeOf(setCollectionProducts(db, "gift-edit", 3, ["does-not-exist"], actor, 5))).toBe("invalid_state");
    expect((await getCollection(db, "gift-edit"))?.version).toBe(3); // failed statement left nothing behind
  });

  it("archive hides, restore returns to draft; archived cannot be published directly; slug conflicts surface", async () => {
    await createCollection(db, collection(), actor, 1);
    await transitionCollection(db, "gift-edit", 1, "archive", actor, 2);
    expect(await listCollections(db)).toEqual([]);
    expect(await codeOf(transitionCollection(db, "gift-edit", 2, "publish", actor, 3))).toBe("invalid_state");
    await transitionCollection(db, "gift-edit", 2, "restore", actor, 4);
    expect((await getCollection(db, "gift-edit"))?.status).toBe("draft");
    expect(await codeOf(createCollection(db, { ...collection(), id: "other" }, actor, 5))).toBe("conflict");
  });

  it("experience section: create with video+poster and image, update, publish, archive, restore — persisted after re-read", async () => {
    await createExperienceSection(db, section(), actor, 10);
    const created = await getExperienceSection(db, "harvest-notes");
    expect(created?.media[0]).toMatchObject({ type: "video", poster: "/hero-tetrapylon-grove.webp" });
    expect(created?.tr.bodyMd).toContain("<script>"); // stored verbatim as text; rendering escapes it
    await updateExperienceSection(db, "harvest-notes", 1, section({ en: { title: "Harvest notes" }, relatedProductIds: ["glass-500"] }), actor, 11);
    await transitionExperienceSection(db, "harvest-notes", 2, "publish", actor, 12);
    expect((await listExperienceSections(db, { publishedOnly: true })).map((s) => [s.id, s.en.title, s.relatedProductIds])).toEqual([["harvest-notes", "Harvest notes", ["glass-500"]]]);
    await transitionExperienceSection(db, "harvest-notes", 3, "unpublish", actor, 13);
    await transitionExperienceSection(db, "harvest-notes", 4, "archive", actor, 14);
    await transitionExperienceSection(db, "harvest-notes", 5, "restore", actor, 15);
    expect(await getExperienceSection(db, "harvest-notes")).toMatchObject({ status: "draft", version: 6 });
    const approvals = await pool.query("SELECT entity_type, decision FROM publication_approvals WHERE entity_id = 'harvest-notes'");
    expect(approvals.rows).toEqual([{ entity_type: "experience_section", decision: "published" }]);
  });

  it("database constraints reject invalid data even if validation were bypassed", async () => {
    await expect(pool.query("INSERT INTO collections(id, slug_tr, created_at, updated_at) VALUES ('Bad Id', 'x', 1, 1)")).rejects.toThrow();
    await expect(pool.query("INSERT INTO experience_sections(id, kind, created_at, updated_at) VALUES ('ok-id', 'casino', 1, 1)")).rejects.toThrow();
    await expect(pool.query("INSERT INTO collections(id, slug_tr, status, created_at, updated_at) VALUES ('ok-id', 'ok-slug', 'live', 1, 1)")).rejects.toThrow();
  });
});
