import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { products as fixtureCatalogue, type Product } from "./products";
import { isProductionShowcase } from "./showcase-mode";

export async function getLiveProducts(): Promise<Product[]> {
  // Production showcase deliberately reads no database and advertises no stock or commercial prices.
  if (isProductionShowcase()) return fixtureCatalogue.map(item => ({ ...item, prices: {}, stock: 0 }));
  // Vinext executes the server component under /bundle, so process.cwd() is
  // not the repository root. Its local Playwright launcher and this RSC process
  // share the system temp directory. The marker never exists on Vercel.
  if (existsSync(join(tmpdir(), "altindal-e2e-catalog.fixture"))) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
