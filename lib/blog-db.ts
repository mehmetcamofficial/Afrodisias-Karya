import "server-only";
import { getBlogPostBySlug, listVisibleBlogPosts, type CmsBlogPost } from "../db/postgres/blog-repository";
import { requirePostgres } from "../db/postgres/driver";
import { isProductionShowcase } from "./showcase-mode";
import type { BlogCategory, BlogPost } from "./blog";

const dateTr = (ms: number) => new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

/** Maps a CMS post to the public BlogPost shape; recipe fields become body blocks. */
export function toBlogPost(post: CmsBlogPost): BlogPost {
  const when = post.publishAt ?? post.updatedAt;
  const recipe: string[] = [];
  if (post.template === "recipe") {
    const meta = [post.recipe.servings && `Porsiyon: ${post.recipe.servings}`, post.recipe.prepMinutes != null && `Hazırlık: ${post.recipe.prepMinutes} dk`, post.recipe.cookMinutes != null && `Pişirme: ${post.recipe.cookMinutes} dk`].filter(Boolean);
    if (meta.length) recipe.push(meta.join(" · "));
    if (post.recipe.ingredients.length) recipe.push("## Malzemeler", ...post.recipe.ingredients.map((item) => `- ${item}`));
    if (post.recipe.steps.length) recipe.push("## Hazırlanışı", ...post.recipe.steps);
  }
  return {
    slug: post.slug, title: post.tr.title, category: post.category as BlogCategory, excerpt: post.tr.excerpt, author: post.author,
    status: post.status === "published" || post.status === "scheduled" ? "published" : "draft",
    date: dateTr(when), isoDate: new Date(when).toISOString().slice(0, 10), featured: post.featured,
    cover: post.cover ? { src: post.cover.url, alt: post.cover.alt, credit: [post.cover.credit, post.cover.license].filter(Boolean).join(" · ") || undefined } : undefined,
    seoTitle: post.tr.seoTitle || undefined, seoDescription: post.tr.seoDescription || undefined,
    body: [...recipe, ...post.tr.bodyMd.split("\n").map((line) => line.trim()).filter(Boolean)],
    relatedProductIds: post.relatedProductIds,
    gallery: post.gallery.map((item) => ({ src: item.url, alt: item.alt, credit: [item.credit, item.license].filter(Boolean).join(" · ") || undefined })),
    video: post.videoUrl || undefined,
  };
}

/**
 * Public reads of CMS posts. Production showcase never reads CMS content
 * (its database is not migrated); any failure means "no CMS posts".
 */
export async function visibleCmsPosts(): Promise<BlogPost[]> {
  if (isProductionShowcase()) return [];
  try { return (await listVisibleBlogPosts(requirePostgres(), Date.now())).map(toBlogPost); } catch { return []; }
}

export async function cmsPostBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}): Promise<BlogPost | null> {
  if (isProductionShowcase() && !opts.includeUnpublished) return null;
  try {
    const post = await getBlogPostBySlug(requirePostgres(), slug);
    if (!post) return null;
    const visible = post.status === "published" || (post.status === "scheduled" && (post.publishAt ?? Infinity) <= Date.now());
    return visible || opts.includeUnpublished ? toBlogPost(post) : null;
  } catch { return null; }
}
