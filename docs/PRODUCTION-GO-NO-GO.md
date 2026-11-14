# Altın Dal — Production Go/No-Go gates (2026-11-12)

Status: **NO-GO**. Planning and review only. No merge, production deploy, production database write, or secret retrieval authorized.

## Verified inventory
- GitHub PR #1: `claude/intelligent-thompson-imgr47` -> `main`, open Draft.
- GitHub PR #2: `chore/vercel-portability-phase1` -> PR #1 head, open Draft; Clerk Preview commit `5d635976a7cc3c955731bdad7d1af3e315277b0c`.
- Vercel Preview-only branch-scoped `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ADMIN_EMAILS`; `DATABASE_URL` scoped to Preview.
- Neon project `fancy-frog-31234482` (PostgreSQL 17, eu-central-1): Preview `br-wispy-cherry-bafzo82p`, Production `br-wandering-block-baq7c11i`. Both READY; Production branch currently not marked protected.
- The code's Clerk authorization is currently restricted to `VERCEL_ENV=preview`. This is **not** Production authentication.

## 1. Production identity design — BLOCKED
- Choose a separate Clerk Production instance, configure real domains, callback/sign-in URLs, secure cookies, session validation, and restricted authorized parties.
- Refactor admin authorization so Vercel Production verifies Clerk sessions with production keys; **never** fall back to untrusted `oai-authenticated-user-*` headers.
- Fail closed if keys, verified primary email, or `ADMIN_EMAILS` are absent. Require verified Clerk identity and allowlist for all admin pages and admin API methods.
- Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ADMIN_EMAILS` to Production **only after** approval and a secret-management review. Do not copy Development keys.
- Acceptance: anonymous 401, authenticated non-admin 403, allowlisted verified admin success, forged-header rejection, logout invalidation, and production-domain session test.

## 2. Data inventory and backup/restore — BLOCKED
- **Corrected source-of-truth decision:** Altın Dal was created using ChatGPT Sites; the owner confirms **no Cloudflare D1 was ever used for this site and no real customer orders were placed**. Do not plan D1 migration or invent historical orders.
- Neon Preview currently contains **13 draft products, zero published products, zero orders and zero publication-audit events**; demo prices and stock are not business-approved.
- Preview has the versioned `0002_publish_audit.sql` table. Product publication is atomic with audit write; publish feature flag defaults off and only works in Preview.
- Production catalog/order data is a **clean start**, subject to a separate read-only inventory and release authorization. No demo product may be published without verified price/stock and media identity.
- Read-only Production inventory still needed: table/schema/migration versions, counts, PK/ACL audit, and environment/branch identity. Do not read secrets or PII unnecessarily.
- Before any production writes: take a timestamped backup/export with checksum, encrypted offsite copy and documented retention; prove restore to a **separate disposable** PostgreSQL 17 branch/database, validate counts, schema, permissions, and app queries. Never test restore against Production.
- Current Neon Production branch is unprotected: review/enable branch protection only with explicit authorization. Record recovery-window limitations and confirm PITR/restore features actually available on the subscription.
- Release plan must include a controlled empty-catalog start, versioned migrations, audit-verification, go/no-go owner approval, and a reversible strategy.

## 3. PR and deployment controls — BLOCKED
- PR #1 must remain Draft until its security review and PR #2 dependency are resolved.
- PR #2 description must reflect actual PostgreSQL adapter, Clerk Preview integration, tests and migration limits; original planning-only description is stale.
- Preserve dependency order PR #1 -> PR #2; do not deploy PR #1 alone. Re-evaluate target/base and CI at the final reviewed SHAs.
- Confirm Vercel Production branch mapping, Production environment-variable names/scopes (never values), build command and deploy protection, domain routing, and database branch identity before owner approval.
- Rollback: identify last known-good deployment, domain reassignment process, schema compatibility, immutable backup/restore evidence, and orders written after cutover. A Vercel code rollback does not automatically roll back database changes.
- Payments remain disabled until separately approved and tested.
- Explicit owner approval required **before** merge, Production deployment, production env changes, or Production DB changes.

## Evidence needed to flip to GO
1. Production Clerk identity verified and all RBAC security tests pass.
2. Confirmed clean-start strategy implemented without historical D1 migration; isolated restore and data reconciliation PASS.
3. Backup, recovery time, and rollback rehearsed and documented.
4. PR checks, deployment environment separation, and latest SHA verified.
5. Owner explicitly approves the precise release scope.

## 4. PR #2 E2E and rollback checkpoint (2026-11-14)
- The complete Playwright run at `f2144d2` **FAILED**: 52 passed, 56 failed, 4 skipped. Evidence: https://github.com/mehmetcamofficial/Afrodisias-Karya/actions/runs/43459235257 . Multiple page 500s report missing DATABASE_URL; merely passing unit checks is insufficient.
- The subsequent fixture-gating correction at `b31912f` is under CI; **do not call PR #2 ready unless its latest HEAD E2E completes successfully**.
- Rollback prerequisites before any release: identify last-good deployment ID, prove previous app version compatibility with proposed PostgreSQL schema, preserve immutable snapshot + tested isolated restore, retain `product_publish_audit` events, and document a stop-switch for the Preview publishing flag. Do not delete audit records during rollback.
- For any failed E2E or schema verification, remain NO-GO and keep both PRs Draft. Production environment, data, keys, and deployments are unchanged by this review.
