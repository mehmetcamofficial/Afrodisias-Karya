import { products as displayCatalogue, type Product, type ProductCategory } from "./products";
import type { ProductRow } from "../db/postgres/repository";

const categories = new Set<ProductCategory>(["glass", "luxury", "tin", "pantry", "subscription"]);

/** Neon is authoritative for ids, availability, TRY prices and stock.
 * The checked-in catalogue only supplies non-commercial presentation metadata
 * (verified media mappings, lot and badges). Never prices: EUR/USD come only from the database.
 * An empty database is an empty store, never an implicit seed.
 */
export function hydrateProducts(rows: ProductRow[]): Product[] {
  return rows.filter(row => row.active).map(row => {
    const presentation = displayCatalogue.find(item => item.id === row.id);
    const category: ProductCategory = categories.has(row.type as ProductCategory)
      ? row.type as ProductCategory : "pantry";
    return {
      id: row.id, name: row.name, category, size: row.size, note: row.note,
      // Only prices stored in the database; EUR/USD exist only where the business set them.
      prices: {
        TRY: row.priceKurus / 100,
        ...(row.priceEurCents ? { EUR: row.priceEurCents / 100 } : {}),
        ...(row.priceUsdCents ? { USD: row.priceUsdCents / 100 } : {}),
      },
      stock: row.stock,
      shipsTo: row.shipsTo ?? ["TR"],
      ...(row.sizeFamily ? { sizeFamily: row.sizeFamily } : {}),
      ...(row.packaging ? { packaging: row.packaging } : {}),
      ...(row.netVolumeMl ? { netVolumeMl: row.netVolumeMl } : {}),
      ...(row.netWeightG ? { netWeightG: row.netWeightG } : {}),
      ...(row.content ? { content: row.content } : {}),
      ...(presentation ? { lot: presentation.lot, badge: presentation.badge, image: presentation.image } : {}),
      // An owner-APPROVED photo of this product outranks every editorial/concept image.
      ...(row.photo ? { image: { src: row.photo.src, alt: row.photo.altTr || row.name, kind: "variant" as const } } : {}),
    };
  });
}

