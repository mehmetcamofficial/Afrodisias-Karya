/**
 * Legacy D1 access is deliberately unavailable in the Vercel/Neon runtime.
 * Importing this module must never import the Cloudflare-only 'cloudflare:workers'
 * module, which crashes Next.js page-data collection at build time.
 *
 * Callers must migrate to db/postgres/driver and db/postgres/repository.
 */
export function getDb(): never {
  throw new Error("Legacy D1 adapter disabled; use PostgreSQL repository");
}

export function requireD1(): never {
  throw new Error("Legacy D1 adapter disabled; use PostgreSQL repository");
}
