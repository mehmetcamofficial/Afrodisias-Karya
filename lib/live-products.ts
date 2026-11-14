import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";
import { isProductionShowcase } from "./showcase-mode";

export async function getLiveProducts(): Promise<Product[]> {
  // Production showcase deliberately reads no database and advertises no stock or commercial prices.
  if (isProductionShowcase()) return fixtureCatalogue.map(item => ({ ...item, prices: {}, stock: 0 }));
  // The isolated Playwright server opts in explicitly; the only fixture switch
  // is never configured in a deployment. Reject all Vercel-hosted runtimes
  // regardless of NODE_ENV/CI, which vinext may transform during RSC compilation.
  if (process.env.E2E_CATALOG_FIXTURE === "1" &&
      !process.env.VERCEL &&
      !process.env.VERCEL_ENV &&
      !process.env.DATABASE_URL) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
