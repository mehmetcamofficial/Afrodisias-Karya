import { products as displayCatalogue, type Product, type ProductCategory } from "./products";
import type { ProductRow } from "../db/postgres/repository";

const categories = new Set<ProductCategory>(["glass", "luxury", "tin", "pantry", "subscription"]);

/** Neon is authoritative for ids, availability, TRY prices and stock.
 * The checked-in catalogue only supplies non-commercial presentation metadata
 * (verified media mappings, EUR display labels, lot and badges).
 * An empty database is an empty store, never an implicit seed.
 */
export function hydrateProducts(rows: ProductRow[]): Product[] {
  return rows.filter(row => row.active).map(row => {
    const presentation = displayCatalogue.find(item => item.id === row.id);
    const category: ProductCategory = categories.has(row.type as ProductCategory)
      ? row.type as ProductCategory : "pantry";
    return {
      id: row.id, name: row.name, category, size: row.size, note: row.note,
      prices: { TRY: row.priceKurus / 100 },
      stock: row.stock,
      ...(presentation ? { lot: presentation.lot, badge: presentation.badge, image: presentation.image } : {}),
    };
  });
}

