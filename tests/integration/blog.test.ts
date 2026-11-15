import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createBlogPost, deleteBlogPost, getBlogPost, getBlogPostBySlug, listBlogVersions, listVisibleBlogPosts, transitionBlogPost, updateBlogPost } from "../../db/postgres/blog-repository";
import { CmsError, listAuditLogs } from "../../db/postgres/cms-repository";
import { blogInputSchema, type BlogInput } from "../../lib/blog-validation";
import { createDriver, resetSchema, TEST_URL } from "./pg-driver";

const run = TEST_URL ? describe : describe.skip;
const actor = "owner@example.test";
let pool: pg.Pool;
let db: ReturnType<typeof createDriver>;
const input = (over: Record<string, unknown> = {}): BlogInput & { id: string } => ({ id: "test-post", ...blogInputSchema.parse({
  slug: "test-post", category: "Zeytinyağı Rehberi", author: "Altın Dal", tr: { title: "Test yazısı", excerpt: "Özet", bodyMd: "## Başlık\nParagraf" }, ...over }) });
const codeOf = async (promise: Promise<unknown>) => { try { await promise; return "ok"; } catch (error) { return error instanceof CmsError ? error.code : String(error); } };

run("Blog CMS against real PostgreSQL", () => {
  beforeAll(async () => { pool = new pg.Pool({ connectionString: TEST_URL }); db = createDriver(pool); });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await resetSchema(pool); });

  it("creates a draft with translations, version 1 and audit; nothing is publicly visible", async () => {
    await createBlogPost(db, input(), actor, 1000);
    expect(await getBlogPost(db, "test-post")).toMatchObject({ status: "draft", version: 1, tr: { title: "Test yazısı", bodyMd: "## Başlık\nParagraf" } });
    expect((await listBlogVersions(db, "test-post")).map((v) => v.version)).toEqual([1]);
    expect((await listAuditLogs(db, { entityId: "test-post" }))[0].action).toBe("blog.create");
    expect(await listVisibleBlogPosts(db, 10_000)).toEqual([]);
    expect(await codeOf(createBlogPost(db, input(), actor, 1001))).toBe("conflict");
  });

  it("full workflow: submit → approve → schedule; visible only after publish_at; edit cancels schedule", async () => {
    await createBlogPost(db, input(), actor, 1000);
    await transitionBlogPost(db, "test-post", 1, "submit", actor, "", 1100);
    await transitionBlogPost(db, "test-post", 2, "approve", actor, "", 1200);
    expect(await codeOf(transitionBlogPost(db, "test-post", 3, "schedule", actor, "", 1300, 1250))).toBe("invalid_state");
    await transitionBlogPost(db, "test-post", 3, "schedule", actor, "", 1300, 5000);
    expect(await listVisibleBlogPosts(db, 4999)).toEqual([]);
    expect((await listVisibleBlogPosts(db, 5000)).map((p) => p.slug)).toEqual(["test-post"]);
    await updateBlogPost(db, "test-post", 4, input({ tr: { title: "Yeni başlık" } }), actor, 1400);
    expect(await getBlogPost(db, "test-post")).toMatchObject({ status: "draft", publishAt: null, version: 5 });
    expect(await listVisibleBlogPosts(db, 9999)).toEqual([]);
  });

  it("published posts are read-only; stale versions are rejected", async () => {
    await createBlogPost(db, input(), actor, 1000);
    await transitionBlogPost(db, "test-post", 1, "submit", actor, "", 1);
    await transitionBlogPost(db, "test-post", 2, "approve", actor, "", 2);
    await transitionBlogPost(db, "test-post", 3, "publish", actor, "", 3);
    expect((await getBlogPostBySlug(db, "test-post"))?.status).toBe("published");
    expect(await codeOf(updateBlogPost(db, "test-post", 4, input(), actor, 4))).toBe("invalid_state");
    expect(await codeOf(transitionBlogPost(db, "test-post", 1, "unpublish", actor, "", 5))).toBe("version_mismatch");
  });

  it("delete: only archived, never-published posts; published history is protected", async () => {
    await createBlogPost(db, input(), actor, 1000);
    expect(await codeOf(deleteBlogPost(db, "test-post", 1, actor, 2))).toBe("invalid_state");
    await transitionBlogPost(db, "test-post", 1, "archive", actor, "", 3);
    await deleteBlogPost(db, "test-post", 2, actor, 4);
    expect(await getBlogPost(db, "test-post")).toBeNull();
    expect((await listAuditLogs(db, { entityId: "test-post" })).map((a) => a.action)).toContain("blog.delete");

    await createBlogPost(db, input(), actor, 5000);
    for (const [v, action] of [[1, "submit"], [2, "approve"], [3, "publish"], [4, "unpublish"], [5, "archive"]] as const) await transitionBlogPost(db, "test-post", v, action, actor, "", 5001);
    expect(await codeOf(deleteBlogPost(db, "test-post", 6, actor, 6000))).toBe("protected");
  });

  it("slug uniqueness surfaces as a conflict on update", async () => {
    await createBlogPost(db, input(), actor, 1);
    await createBlogPost(db, { ...input({ slug: "ikinci-yazi" }), id: "ikinci-yazi" }, actor, 2);
    expect(await codeOf(updateBlogPost(db, "ikinci-yazi", 1, input({ slug: "test-post" }), actor, 3))).toBe("conflict");
  });
});
