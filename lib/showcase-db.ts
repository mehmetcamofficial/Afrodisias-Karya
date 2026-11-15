import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { getPublishedCollectionBySlug, listCollections, listExperienceSections, type CmsCollection, type CmsExperienceSection } from "../db/postgres/showcase-repository";
import { fixtureCollections, fixtureExperience } from "./showcase-fixtures";
import { isProductionShowcase } from "./showcase-mode";

declare const __ALTINDAL_E2E_FIXTURE__: boolean;
const fixtureMode = () => typeof __ALTINDAL_E2E_FIXTURE__ !== "undefined" && __ALTINDAL_E2E_FIXTURE__;

/**
 * Public reads: only PUBLISHED rows. The Production showcase reads no CMS
 * content (its database is not migrated); any failure means "nothing published".
 */
export async function publishedCollections(): Promise<CmsCollection[]> {
  if (isProductionShowcase()) return [];
  if (fixtureMode()) return fixtureCollections;
  try { return await listCollections(requirePostgres(), { publishedOnly: true }); } catch { return []; }
}

export async function publishedCollection(locale: "tr" | "en", slug: string): Promise<CmsCollection | null> {
  if (isProductionShowcase()) return null;
  if (fixtureMode()) return fixtureCollections.find((c) => (locale === "tr" ? c.slugTr : c.slugEn) === slug) ?? null;
  try { return await getPublishedCollectionBySlug(requirePostgres(), locale, slug); } catch { return null; }
}

export async function publishedExperience(): Promise<CmsExperienceSection[]> {
  if (isProductionShowcase()) return [];
  if (fixtureMode()) return fixtureExperience;
  try { return await listExperienceSections(requirePostgres(), { publishedOnly: true }); } catch { return []; }
}
