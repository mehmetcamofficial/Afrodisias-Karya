import type { MetadataRoute } from "next";
import { blogPosts } from "../lib/blog";
import { getLiveProducts } from "../lib/live-products";
import { SITE_URL } from "../lib/site";

const STATIC_ROUTES = ["", "/koleksiyon", "/magaza", "/hikayemiz", "/hasat", "/deneyim", "/gunluk", "/gunluk/zeytinyagi", "/gunluk/hasat", "/gunluk/tarifler", "/gunluk/aphrodisias", "/olive-club", "/corporate-gifts"];

/** Canonical (non-redirecting) public URLs only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getLiveProducts();
  return [
    ...STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path || "/"}` })),
    ...products.map((product) => ({ url: `${SITE_URL}/urun/${product.id}` })),
    ...blogPosts.map((post) => ({ url: `${SITE_URL}/gunluk/${post.slug}` })),
  ];
}
