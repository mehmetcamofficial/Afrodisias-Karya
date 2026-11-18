import "server-only";
import { cache } from "react";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import { buildCatalogue, type Catalogue } from "./catalog-core";
import { products as fixtureCatalogue } from "./products";
import { isProductionShowcase } from "./showcase-mode";

export * from "./catalog-core";

declare const __ALTINDAL_E2E_FIXTURE__: boolean;

/**
 * The single catalogue for every public surface (home, collection, store,
 * product pages, journal, sitemap, structured data). Cached per request.
 * Database unavailable → every product is a preview and nothing can be bought.
 */
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  if (isProductionShowcase()) return buildCatalogue([], true);
  // Vite-compiled into local test builds only; Next/Vercel builds never see the fixture.
  if (typeof __ALTINDAL_E2E_FIXTURE__ !== "undefined" && __ALTINDAL_E2E_FIXTURE__) return buildCatalogue(fixtureCatalogue, false);
  try {
    return buildCatalogue(hydrateProducts(await listProducts(requirePostgres())), false);
  } catch (error) {
    console.error("catalogue unavailable; selling disabled", error instanceof Error ? error.message : "unknown");
    return buildCatalogue(null, false);
  }
});
