/**
 * Canonical origin used for metadata, sitemap and structured data.
 * Override per deployment with NEXT_PUBLIC_SITE_URL (no trailing slash).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://altin-dal-aphrodisias.oncoconnect2.chatgpt.site").replace(/\/+$/, "");

export const BRAND = {
  name: "Altın Dal",
  legalName: "Altın Dal — Aphrodisias Estate",
  locality: "Karacasu",
  region: "Aydın",
  country: "TR",
} as const;
