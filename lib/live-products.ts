import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";

export async function getLiveProducts(): Promise<Product[]> {
  // Local CI-only fixture, gated by explicit webServer opt-in and CI.
  // Framework dev servers may set NODE_ENV=production internally, so it is not a
  // reliable guard. Vercel markers hard-block the fixture in hosted environments.
  if (process.env.E2E_CATALOG_FIXTURE === "1" &&
      process.env.CI === "true" &&
      process.env.VERCEL !== "1" &&
      process.env.VERCEL_ENV === undefined) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
