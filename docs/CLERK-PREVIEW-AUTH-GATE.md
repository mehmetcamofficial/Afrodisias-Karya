# Clerk Preview authentication — implementation gate

Status: APPROVED FOR PREVIEW DEVELOPMENT; NOT RELEASED.

## Trust boundary
- On Vercel, never trust `oai-authenticated-user-*` or user-supplied identity headers.
- Verify Clerk session server-side using the official Clerk Next.js SDK; derive identity from the verified session, not request parameters.
- Deny all admin access if Clerk credentials or ADMIN_EMAILS are absent. No development fallback in Preview or Production.
- Match a verified primary email address against ADMIN_EMAILS after canonicalization. A signed-in non-admin gets 403; an anonymous API caller gets 401.
- Protect admin pages and every admin API method (including GET/PATCH orders and POST products). No admin secrets in client bundles.
- Clerk's sign-in, sign-out and callback paths must not allow open redirects. Do not create a second independent session implementation.

## Preview-only setup
1. Create a separate Clerk development application, restricted to approved test accounts.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ADMIN_EMAILS` for Vercel Preview only. Store secret values in Vercel; never commit or print them.
3. Add `@clerk/nextjs` with a lockfile update using pnpm 11.25.0. Use ClerkProvider, server-side auth() and currentUser() or verified claims, and middleware/proxy protection compatible with Next.js 16.
4. Replace Vercel's admin auth path with Clerk session verification; retain the current Cloudflare path only where its trusted proxy identity is proven. Ensure Vercel never falls back to proxy headers.
5. Add unit and HTTP/E2E coverage for anonymous 401, signed-in non-admin 403, verified allowlisted admin 200, forged-header rejection, missing-key fail-closed, logout invalidation, and admin mutations.
6. Deploy only to protected Preview and run checks against the deployment SHA. Record no session tokens in CI artifacts.

## Release gates
- Preview login and authorization evidence required; current Preview HTTP smoke does NOT prove an authenticated admin can log in.
- Production Clerk instance, domain configuration, production allowlist, DB backup, rollback, and owner approval are separate gates.
- Do not merge PR #1 or PR #2, deploy Production, change Production DB, or enable payments as part of this work.
