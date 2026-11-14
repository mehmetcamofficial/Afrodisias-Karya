import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";
import { isProductionShowcase } from "./showcase-mode";

export async function getLiveProducts(): Promise<Product[]> {
  // Production showcase deliberately reads no database and advertises no stock or commercial prices.
  if (isProductionShowcase()) return fixtureCatalogue.map(item => ({ ...item, prices: {}, stock: 0 }));
  // Only an ephemeral Playwright server can opt in. The marker is created
  // by the E2E webServer command, is never committed, and never exists on Vercel.
  // Unlike process.env.* this filesystem check cannot be constant-folded
  // by the vinext RSC build pipeline.
  if (!process.env.VERCEL && !process.env.VERCEL_ENV &&
      !process.env.DATABASE_URL &&
      existsSync(join(process.cwd(), ".sites-runtime", "e2e-catalog.fixture"))) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
