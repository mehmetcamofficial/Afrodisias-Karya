# Altın Dal — Vercel portability gates (2026-11-11)

## Baseline
- Source: PR #1 head `26568224220fa2f4a75a825362b9860f262505a0`.
- Vercel project: `dragonfire-09s-projects/altin-dal-aphrodisias`.
- `pnpm run build` invokes vinext and produces Cloudflare Worker output, not Vercel's Next.js routes manifest.
- `pnpm exec next build` compiles and passes TypeScript, then fails at `db/index.ts` importing `cloudflare:workers` while loading `/api/orders`.
- Existing D1 `DB` binding is not a Vercel database. Merely replacing the build command is **not** a safe migration.

## Phase 1 — Platform-neutral data access
1. Inventory all `requireD1`, `getDb`, `cloudflare:workers`, D1 prepared statements and SQL schema/migrations.
2. Introduce a server-only database adapter interface. Implement a PostgreSQL/Neon adapter for Vercel and retain the D1 adapter for the current host. No production D1 writes.
3. Match SQL behavior including idempotent orders, parameter binding, status updates and schema defaults. Validate with isolated tests.
4. Add explicit runtime configuration validation: fail closed on missing database credentials; never use static catalogue as an implicit substitute for write operations.
5. Migrate data only with an approved backup, count reconciliation, and cutover plan. No automatic production data migration.

## Phase 2 — Authentication and commerce safety
1. Replace hosting-proxy `oai-authenticated-user-*` identity with a verified Vercel-compatible identity provider. **Never** trust user-supplied identity headers.
2. Keep `ADMIN_EMAILS` allowlist fail-closed and verify 401/403 on every admin API.
3. Keep server-side order pricing, stock and quantity validation, and idempotency. Payments remain disabled.
4. Do not claim forms persist unless backed by a tested database or delivery service.

## Phase 3 — Deployment
1. Preview only: Vercel Node 22, `pnpm exec next build`; isolated preview database and configured auth.
2. Run unit, integration and end-to-end tests (cart, orders, admin RBAC, product integrity, media and mobile).
3. Verify production URLs, error logs, database connectivity and rollback.
4. Require explicit owner approval before merging to `main` or enabling payments.

## Open decisions
- PostgreSQL target/project and backup source, if any.
- Verified admin login provider and authorized admin email(s).
- Whether existing D1 records must be migrated or only a new clean catalogue is needed.
- Product prices, real images, videos and TR/EN routing from `docs/AUDIT.md`.

Status: **BLOCKED for production** until the adapter, auth, data and preview gates pass.
