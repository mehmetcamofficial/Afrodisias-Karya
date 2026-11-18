import { products as editorialCatalogue, type Product } from "./products";

/**
 * The ONE catalogue rule set (Faz 13D), pure so it can be unit-tested.
 *
 * - live:    published in the database, commercially approved TRY price, stock > 0
 * - soldout: published, approved price, stock 0
 * - preview: an editorial product that is not (or not yet) published — shown on
 *            editorial surfaces only, with NO price, stock or purchase action
 *
 * Commercial data (name, size, price, stock, packaging, content, approved photo)
 * comes ONLY from published database rows. A draft's database content never
 * reaches the public site: a preview is built from the checked-in editorial
 * catalogue alone.
 */
export type CatalogueState = "live" | "soldout" | "preview";
export type CatalogueEntry = { id: string; product: Product; state: CatalogueState; href: string };
export type Catalogue = {
  entries: CatalogueEntry[];
  /** false when the database could not be read: everything is preview, nothing is for sale. */
  available: boolean;
  showcase: boolean;
};

const seriesHref = (product: Product) => `/koleksiyon#seri-${product.category}`;

/** A preview never carries commercial fields, whatever its source. */
function asPreview(product: Product): Product {
  return { ...product, prices: {}, stock: 0, badge: undefined, sizeFamily: undefined, content: undefined };
}

/**
 * @param published hydrated, PUBLISHED database products (approved prices only); null = database unavailable
 * @param showcase  Production showcase: nothing is sold, product pages stay presentation-only
 */
export function buildCatalogue(published: Product[] | null, showcase: boolean, editorial: Product[] = editorialCatalogue): Catalogue {
  const rows = showcase ? [] : published ?? [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const entry = (product: Product): CatalogueEntry => {
    const live = byId.get(product.id);
    // A published row whose TRY price is not approved reads as 0 (0008): never sellable.
    if (live && typeof live.prices.TRY === "number" && live.prices.TRY > 0) {
      return { id: live.id, product: live, state: live.stock > 0 ? "live" : "soldout", href: `/urun/${live.id}` };
    }
    const preview = asPreview(live ? { ...product, ...live } : product);
    // In the Production showcase the presentation product pages remain (no sale, no price).
    return { id: product.id, product: preview, state: "preview", href: showcase ? `/urun/${product.id}` : seriesHref(preview) };
  };
  const entries = editorial.map((item) => entry(item));
  // New products need no code change: a published row unknown to the editorial list is appended.
  for (const row of rows) if (!editorial.some((item) => item.id === row.id)) entries.push(entry(row));
  return { entries, available: showcase || published !== null, showcase };
}

export const catalogueEntry = (catalogue: Catalogue, id: string) => catalogue.entries.find((e) => e.id === id);
/** Published (live + sold out): the store, product pages, cart restore and sitemap. */
export const publishedProducts = (catalogue: Catalogue) => catalogue.entries.filter((e) => e.state !== "preview").map((e) => e.product);
/** Editorial previews: home vitrine, collection series, journal — never the cart. */
export const previewEntries = (catalogue: Catalogue) => catalogue.entries.filter((e) => e.state === "preview");
