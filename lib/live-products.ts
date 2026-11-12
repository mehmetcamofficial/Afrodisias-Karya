import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";

export async function getLiveProducts(): Promise<Product[]> {
  // CI-only fixture. Cannot be enabled in Vercel or a production build.
  // Deliberately scoped to the ephemeral Playwright dev server, never Preview/Production.
  if (process.env.E2E_CATALOG_FIXTURE === "1" &&
      process.env.CI === "true" &&
      process.env.NODE_ENV === "development" &&
      process.env.VERCEL !== "1" &&
      process.env.VERCEL_ENV === undefined) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
