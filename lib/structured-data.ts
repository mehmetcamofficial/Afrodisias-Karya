import type { Product } from "./products";
import { BRAND, SITE_URL } from "./site";

/**
 * schema.org builders. Only verified catalogue fields are emitted: no SKU,
 * GTIN, rating or review data exists, so none is invented.
 */
export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.note,
    url: `${SITE_URL}/urun/${product.id}`,
    brand: { "@type": "Brand", name: BRAND.name },
    // Only an image of this exact variant is a truthful product image.
    ...(product.image?.kind === "variant" ? { image: `${SITE_URL}${product.image.src}` } : {}),
    ...(typeof product.prices.TRY === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: product.prices.TRY.toFixed(2),
            priceCurrency: "TRY",
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/urun/${product.id}`,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${SITE_URL}${item.path}` })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    address: { "@type": "PostalAddress", addressLocality: BRAND.locality, addressRegion: BRAND.region, addressCountry: BRAND.country },
  };
}

/** Serialises JSON-LD safely for inline <script> (escapes `<`). */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
