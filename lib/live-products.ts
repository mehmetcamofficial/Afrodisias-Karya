import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";

export async function getLiveProducts(): Promise<Product[]> {
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
