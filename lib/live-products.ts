import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";
import { isProductionShowcase } from "./showcase-mode";

declare const __ALTINDAL_E2E_FIXTURE__: boolean;

export async function getLiveProducts(): Promise<Product[]> {
  // Production showcase deliberately reads no database and advertises no stock or commercial prices.
  if (isProductionShowcase()) return fixtureCatalogue.map(item => ({ ...item, prices: {}, stock: 0 }));
  // This is Vite-compiled into local test RSC only. For Next/Vercel builds
  // the symbol is absent and typeof keeps the real Neon path fail-closed.
  if (typeof __ALTINDAL_E2E_FIXTURE__ !== "undefined" && __ALTINDAL_E2E_FIXTURE__)
    return fixtureCatalogue;
  return hydrateProducts(await listProducts(requirePostgres()));
}
