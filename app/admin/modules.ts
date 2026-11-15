import "server-only";
import { listBlogPosts, type CmsBlogPost } from "../../db/postgres/blog-repository";
import { listCmsProducts, type CmsProduct } from "../../db/postgres/cms-repository";
import { requirePostgres } from "../../db/postgres/driver";
import { blogPosts } from "../../lib/blog";
import { products } from "../../lib/products";
import { editorialCoverByCategory } from "../components/journal-card";

/** Server-side data for the read-only dashboard modules. Every source is real; nothing is invented. */
export type MediaItem = { src: string; alt: string; kind: string; usedBy: string; credit?: string; license?: string; external: boolean };

export async function loadCms(): Promise<{ products: CmsProduct[] | null; posts: CmsBlogPost[] | null }> {
  const db = (() => { try { return requirePostgres(); } catch { return null; } })();
  if (!db) return { products: null, posts: null };
  const [p, b] = await Promise.allSettled([listCmsProducts(db, { includeArchived: true }), listBlogPosts(db, { includeArchived: true })]);
  return { products: p.status === "fulfilled" ? p.value : null, posts: b.status === "fulfilled" ? b.value : null };
}

export function mediaLibrary(posts: CmsBlogPost[] | null): MediaItem[] {
  const items: MediaItem[] = [];
  for (const product of products) if (product.image) items.push({ src: product.image.src, alt: product.image.alt, kind: product.image.kind, usedBy: `Ürün: ${product.name}`, external: false });
  for (const [category, cover] of Object.entries(editorialCoverByCategory)) if (cover) items.push({ src: cover.src, alt: cover.alt, kind: "editorial", usedBy: `Günlük kapağı: ${category}`, credit: cover.credit, external: /^https:/.test(cover.src) });
  for (const post of blogPosts) if (post.cover) items.push({ src: post.cover.src, alt: post.cover.alt, kind: "editorial", usedBy: `Yazı (kod): ${post.title}`, credit: post.cover.credit, external: /^https:/.test(post.cover.src) });
  for (const post of posts ?? []) {
    if (post.cover) items.push({ src: post.cover.url, alt: post.cover.alt, kind: post.cover.kind, usedBy: `Yazı (CMS): ${post.tr.title}`, credit: post.cover.credit, license: post.cover.license, external: /^https:/.test(post.cover.url) });
    for (const media of post.gallery) items.push({ src: media.url, alt: media.alt, kind: media.kind, usedBy: `Galeri (CMS): ${post.tr.title}`, credit: media.credit, license: media.license, external: /^https:/.test(media.url) });
  }
  return items;
}

export type SeoRow = { kind: string; name: string; href: string; title: string; description: string; issues: string[] };

function check(title: string, description: string, enMissing: boolean | null) {
  const issues: string[] = [];
  if (!title) issues.push("SEO başlığı yok");
  else if (title.length > 60) issues.push(`Başlık uzun (${title.length}/60)`);
  if (!description) issues.push("Meta açıklama yok");
  else if (description.length < 70 || description.length > 160) issues.push(`Açıklama ${description.length} karakter (70–160 önerilir)`);
  if (enMissing) issues.push("İngilizce sürüm yok");
  return issues;
}

export function seoReport(cms: { products: CmsProduct[] | null; posts: CmsBlogPost[] | null }): SeoRow[] {
  const rows: SeoRow[] = [];
  for (const post of blogPosts) rows.push({ kind: post.status === "published" ? "Yazı (kod, yayında)" : "Yazı (kod, taslak)", name: post.title, href: `/gunluk/${post.slug}`, title: post.seoTitle ?? "", description: post.seoDescription ?? "", issues: check(post.seoTitle ?? "", post.seoDescription ?? "", null) });
  for (const post of cms.posts ?? []) rows.push({ kind: `Yazı (CMS, ${post.status})`, name: post.tr.title, href: `/admin/blog/onizleme/${post.slug}`, title: post.tr.seoTitle, description: post.tr.seoDescription, issues: check(post.tr.seoTitle, post.tr.seoDescription, !post.en.title) });
  for (const product of cms.products ?? []) rows.push({ kind: `Ürün (CMS, ${product.status})`, name: product.tr.name, href: `/urun/${product.id}`, title: product.tr.seoTitle, description: product.tr.seoDescription, issues: check(product.tr.seoTitle, product.tr.seoDescription, !product.en.name) });
  return rows;
}
