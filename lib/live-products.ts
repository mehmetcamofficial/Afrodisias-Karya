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
  // Only the ephemeral local Playwright launcher creates this ignored file.
  // Vercel builds from Git and never receive it. The launcher itself refuses
  // a hosted or DB-connected environment, keeping this fixture isolated.
  // Avoid env guards here: vinext may set its own VERCEL/CI flags.
  const markerPath = join(process.cwd(), ".sites-runtime", "e2e-catalog.fixture");
  const fixtureReady = existsSync(markerPath);
  if (!process.env.DATABASE_URL) console.error("[E2E-FIXTURE-DIAG]", JSON.stringify({ cwd: process.cwd(), markerReady: fixtureReady, markerPath, vercel: Boolean(process.env.VERCEL), vercelEnvPresent: Boolean(process.env.VERCEL_ENV) }));
  if (fixtureReady) {
    return fixtureCatalogue;
  }
  return hydrateProducts(await listProducts(requirePostgres()));
}
