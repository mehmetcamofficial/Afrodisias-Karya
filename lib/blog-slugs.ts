import { blogPosts, categorySlugs } from "./blog";

/** Slugs a CMS post may not take: static category routes and existing code posts. */
export function reservedSlugReason(slug: string, opts: { allowCodeDraft?: string } = {}) {
  if (Object.values(categorySlugs).includes(slug)) return `"${slug}" bir kategori adresi`;
  const code = blogPosts.find((post) => post.slug === slug);
  if (code && !(code.status === "draft" && opts.allowCodeDraft === slug)) {
    return code.status === "published" ? `"${slug}" kod tabanlı yayındaki bir yazı` : `"${slug}" kod tabanlı bir taslak; "Taslağı içe aktar" kullanın`;
  }
  return null;
}
