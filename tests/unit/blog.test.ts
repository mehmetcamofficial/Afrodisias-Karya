import { describe, expect, it } from "vitest";
import { blogCategories, blogPosts, categorySlugs, draftPosts, getAnyPost, getPost, publishedPosts, readMinutes, relatedPosts } from "../../lib/blog";
import { products } from "../../lib/products";

describe("journal publishing rules", () => {
  it("never exposes drafts through public helpers", () => {
    expect(draftPosts.length).toBeGreaterThanOrEqual(6);
    for (const draft of draftPosts) {
      expect(publishedPosts).not.toContain(draft);
      expect(getPost(draft.slug), draft.slug).toBeUndefined();
      expect(getAnyPost(draft.slug)).toBe(draft);
    }
  });

  it("drafts are publication-ready apart from editorial review", () => {
    for (const draft of draftPosts) {
      expect(draft.seoTitle, draft.slug).toBeTruthy();
      expect(draft.seoDescription!.length, draft.slug).toBeLessThanOrEqual(160);
      expect(draft.reviewNotes?.length, draft.slug).toBeGreaterThan(0);
      expect(draft.body.length, draft.slug).toBeGreaterThan(4);
    }
  });

  it("provides a richer public journal without exposing unreviewed drafts", () => {
    expect(publishedPosts.length).toBeGreaterThanOrEqual(8);
    expect(new Set(publishedPosts.map((post) => post.slug)).size).toBe(publishedPosts.length);
    expect(publishedPosts.some((post) => post.slug === "cam-sise-mi-teneke-mi")).toBe(true);
    expect(publishedPosts.some((post) => post.slug === "ege-kahvaltisinda-zeytinyagi")).toBe(true);
    expect(draftPosts.every((post) => !publishedPosts.includes(post))).toBe(true);
  });

  it("covers recipes, guides, harvest, production and brand stories", () => {
    const categories = new Set(blogPosts.map((post) => post.category));
    for (const category of ["Ege Mutfağından Tarifler", "Zeytinyağı Rehberi", "Hasat Günlükleri", "Üretim", "Marka Hikâyeleri"] as const) expect(categories.has(category), category).toBe(true);
    expect(new Set(blogCategories.map((category) => categorySlugs[category])).size).toBe(blogCategories.length);
  });

  it("has unique slugs and only references existing products", () => {
    expect(new Set(blogPosts.map((post) => post.slug)).size).toBe(blogPosts.length);
    const ids = new Set(products.map((product) => product.id));
    for (const post of blogPosts) for (const id of post.relatedProductIds) expect(ids.has(id), `${post.slug} → ${id}`).toBe(true);
  });

  it("computes reading time from the text", () => {
    expect(readMinutes({ title: "a", excerpt: "b", body: [] })).toBe(1);
    expect(readMinutes({ title: "", excerpt: "", body: [Array(1000).fill("kelime").join(" ")] })).toBe(5);
  });

  it("recommends only published related posts", () => {
    for (const post of publishedPosts) for (const related of relatedPosts(post)) expect(related.status).toBe("published");
  });
});
