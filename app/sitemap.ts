import type { MetadataRoute } from "next";
import { blogCategories, categorySlugs, publishedPosts } from "../lib/blog";
import { getLiveProducts } from "../lib/live-products";
import { SITE_URL } from "../lib/site";

// Only request active Neon products at request time. Do not prerender in CI
// without a database connection; never expose inactive draft product URLs.
export const dynamic = "force-dynamic";

const STATIC_ROUTES = ["", "/koleksiyon", "/magaza", "/hikayemiz", "/hasat", "/deneyim", "/gunluk", ...blogCategories.map((category) => `/gunluk/${categorySlugs[category]}`), "/olive-club", "/corporate-gifts"];

/** Canonical (non-redirecting) public URLs only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getLiveProducts();
  return [
    ...STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path || "/"}` })),
    ...products.map((product) => ({ url: `${SITE_URL}/urun/${product.id}` })),
    // Drafts are never listed.
    ...publishedPosts.map((post) => ({ url: `${SITE_URL}/gunluk/${post.slug}`, lastModified: post.isoDate })),
  ];
}
