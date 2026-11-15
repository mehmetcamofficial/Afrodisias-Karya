import type { CmsCollection, CmsExperienceSection } from "../db/postgres/showcase-repository";

/**
 * E2E-ONLY content. Loaded solely when the Vite test build defines
 * __ALTINDAL_E2E_FIXTURE__ (see lib/live-products.ts); Next/Vercel builds never
 * see it. Titles say "Test" so it can never be mistaken for real copy.
 */
export const fixtureCollections: CmsCollection[] = [{
  id: "e2e-hediye", slugTr: "test-hediye-seckisi", slugEn: "test-gift-edit", status: "published", position: 0,
  cover: { url: "/altin-dal-gift-box.webp", alt: "Test kapak görseli", credit: "", license: "" }, version: 2, updatedAt: 0,
  tr: { title: "Test Hediye Seçkisi", intro: "E2E test koleksiyonu.", seoTitle: "Test Hediye Seçkisi", seoDescription: "E2E test koleksiyonu açıklaması." },
  en: { title: "Test Gift Edit", intro: "E2E test collection.", seoTitle: "Test Gift Edit", seoDescription: "E2E test collection description." },
  productIds: ["aromatic-set", "glass-750", "olive-club"],
}];

export const fixtureExperience: CmsExperienceSection[] = [{
  id: "e2e-hasat", kind: "harvest", status: "published", position: 0, version: 2, updatedAt: 0,
  media: [
    { type: "video", url: "/e2e-missing-video.mp4", poster: "/hero-tetrapylon-grove.webp", alt: "Test hasat videosu", credit: "", license: "", captionsUrl: "" },
    { type: "image", url: "/hero-tetrapylon-grove.webp", alt: "Test zeytinlik görseli", credit: "", license: "", kind: "editorial" },
  ],
  relatedProductIds: ["glass-500"], relatedCollectionIds: ["e2e-hediye"],
  tr: { title: "Test Hasat Bölümü", lead: "E2E test bölümü.", bodyMd: "## Test başlığı\n**Kalın** metin <script>window.__xss = 1</script>\n- madde" },
  en: { title: "Test Harvest Section", lead: "E2E test section.", bodyMd: "English test body." },
}];
