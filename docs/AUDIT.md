# Altın Dal — Baseline Audit & Phase Report

Branch: `claude/intelligent-thompson-imgr47` · Audit date: 2026-11-11
Everything below marked **measured** was run in this session; nothing is assumed.

## 1. Research access (Phase 0)

| Source | Status |
|---|---|
| Live preview `altin-dal-aphrodisias.oncoconnect2.chatgpt.site` | **BLOCKED** — host not allowed by this session's network policy |
| brightland.co, frantoiomuraglia.it, graza.co, oliviers-co.com, v2.workwithpact.com | **BLOCKED** — same |

No benchmark matrix is presented as "verified": the reference sites could not be
loaded, and a matrix written from memory would be unverifiable. Allow these hosts
in the environment's network settings and the comparison can be done properly
(visual hierarchy, PDP structure, cart/checkout patterns, i18n, mobile conversion).
The local repository and a locally-run build were audited in full.

## 2. Stack baseline (measured)

| Area | Finding |
|---|---|
| Framework | Next.js 16.3 API on **vinext 1.0.0-beta.5** (Vite 8) deployed as a Cloudflare Worker; React 19.2 |
| Data | Cloudflare D1 (`DB`), Drizzle schema with `products`, `orders`; static catalogue in `lib/products.ts` is what the storefront actually uses |
| Auth | Hosting proxy injects `oai-authenticated-user-*` headers; local dev mocks a user |
| Styling | 84 KB hand-minified `app/globals.css` + vendored shadcn/Tailwind (218 KB built, 39 KB gz); no design tokens beyond 6 colour vars; Georgia/Arial + Instrument Serif |
| Routes | TR-only: `/`, `/magaza`, `/koleksiyon`, `/urun/[slug]`, `/hikayemiz`, `/hasat`, `/deneyim`, `/gunluk/*`, `/olive-club`, `/corporate-gifts`, `/traceability/[lotId]`, `/admin/*`; English-named routes are redirects only |
| i18n | None. `<html lang="tr">`, mixed English labels in Turkish UI ("THE COLLECTION", "Walk the land") |
| Tests / CI | None |
| Quality gates (baseline) | build ✅ · lint ✅ (10 warnings) · **typecheck ❌ 9 errors** |

## 3. Defects found and their status

| # | Severity | Defect (baseline, measured) | Status |
|---|---|---|---|
| 1 | **Critical** | `POST /api/orders` trusted client prices: a 5 L tin was accepted for **1 kuruş**; `qty:-5` produced a **−16 000 TL** order; unknown products and invalid e-mails accepted; bad JSON → 500 | **FIXED** — server-side pricing from catalogue, validation, 422/400, idempotency |
| 2 | **Critical** | Any signed-in user was an admin (pages and `GET/PATCH /api/orders`, `POST /api/products`) | **FIXED** — `ADMIN_EMAILS` allowlist, fail-closed, 401/403 |
| 3 | High | Cart displayed €110 while the order recorded 3 200 TL, with no disclosure | **FIXED** — TRY charge disclosed when EUR/USD shown |
| 4 | High | 5 L / 3 L tins, aromatic set, pantry goods, Olive Club showed a **glass-bottle** photo | **FIXED** — honest placeholder; range photos labelled |
| 5 | High | All 3 homepage videos (+ /hasat, /deneyim) 404 — files not in repo; 3 competing autoplay videos | **FIXED** (poster-first, manifest) · video files **BLOCKED** (missing assets) |
| 6 | High | Hero secondary CTA invisible (dark text on dark hero) | **FIXED** |
| 7 | High | Club "ön talep" and corporate-gift forms say "Talebiniz alındı" but **send nothing**; admin Lot/Blog "saves" are local state lost on reload | **OPEN** — needs decision (see §7) |
| 8 | Medium | Cart: no Escape, no focus management, lost on reload | **FIXED** |
| 9 | Medium | No robots/sitemap/canonical/structured data | **FIXED** (robots, sitemap, Product/Breadcrumb/Organization JSON-LD, canonical) |
| 10 | Medium | "Admin" link shown to every visitor in the header | **FIXED** — moved to a discreet footer link |
| 11 | Medium | Bare `footer {}` CSS rule leaked into product cards | **FIXED** |
| 12 | Medium | `/traceability/<anything>` renders sample data under any lot id | OPEN (labelled "örnek · doğrulanmamış") |
| 13 | Medium | Admin catalogue edits (D1) never reach the storefront or checkout (both use the static catalogue) | OPEN — needs decision |
| 14 | Medium | Stock is static and never decremented on order | OPEN — inventory logic not changed silently |
| 15 | Low | `[vinext] RSC prefetch setup error: ne is not a function` in production console (framework `Link` chunk) | OPEN — vinext beta bug; track upstream |
| 16 | Low | Typecheck errors | **FIXED** (0) |

## 4. Product data integrity issues (reported, not changed)

Prices and claims were **not** edited — they need the owner's confirmation:

- **Olive Club**: store says 1 450 TL, "2 × 500 ml / 2 ay, %20 avantajlı"; `/olive-club` says 1 690 TL (bi-monthly) / 1 990 TL (monthly), "%15 üye indirimi".
- **Adopt a Tree**: store 4 500 TL ("ağaçtan 3 L yağ"); `/olive-club` 7 900 TL.
- **Names**: product photos show bottles labelled **Aphrodite / Caria / Morsynus**; the catalogue has only "250/500/750 ml Cam Şişe". Which names are real?
- **USD/EUR**: USD prices are derived from hard-coded rates (EUR×1.09, TRY×0.031; EUR = TRY/35 when no EUR price). Orders are recorded in TRY regardless.
- **Badges**: "Lokomotif" (internal jargon for "flagship") and "Stok dikkat" are shown to customers.
- **Exact stock counts** ("19 adet") are displayed from static data.
- No SKUs exist; product `id` is the only identifier. No reviews or certifications exist — none were added.

## 5. Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 Research & audit | **PARTIAL** | Repo + local runtime audited; external sites BLOCKED |
| 1 Design system | **PARTIAL** | Tokens + primitives in `app/foundation.css` (contrast-checked); legacy CSS not yet migrated |
| 2 Homepage | **PARTIAL** | Hero rebuilt (single media slot, poster, reduced motion, 3 CTAs); server component; section redesign pending |
| 3 Store | **PARTIAL** | Image integrity, card fixes; filters/sort pre-existing and working |
| 4 PDP | **PARTIAL** | Truthful image + note, quantity cap, breadcrumbs, metadata; gallery/zoom/related pending real photos |
| 5 Commerce | **PASS (pre-payment)** | Validated, idempotent order capture. Payment **not** activated (iyzico keys absent, by design) |
| 6 Bilingual | **NOT STARTED** | Needs routing decision (§7) |
| 7 Admin | **PARTIAL** | RBAC done; persistence of lots/blog/forms pending |
| 8 Perf & a11y | **PARTIAL** | See §6 |
| 9 SEO | **PARTIAL** | Technical SEO done; editorial architecture pending |
| 10 Testing | **PASS** | 24 unit + 108 e2e (4 widths) passing; CI added |

## 6. Lighthouse 12 (measured, simulated mobile, local production build)

| Page | Perf | A11y | SEO | BP | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` before | 78 | 90 | 100 | 96 | 5.0 s | 0 |
| `/` after | 78 | 95 | 100 | 96 | 5.0 s | 0.002 |
| `/magaza` after | 91 | 95 | 100 | 93 | 2.9 s | 0.001 |
| `/urun/glass-500` after (before) | 87 (85) | 100 (96) | 92 (92) | 96 | 3.5 s | 0 |
| `/urun/tin-5l` after | 92 | 96 | 91 | 96 | 2.9 s | 0.01 |

Caveats: local server (near-zero TTFB); Google Fonts is blocked in this sandbox, so
real font loading is **not** reflected. Targets (Perf ≥ 90, LCP ≤ 2.5 s) are **not met**
on `/`. Main remaining cost: 218 KB render-blocking CSS (mostly unused vendored
shadcn/Tailwind) and the display-font swap on the hero `<h1>`. PDP SEO 91–92 is
vinext/Next "streaming metadata": verified that Facebook/Twitter/Bing user agents
receive title/description/canonical in `<head>`; Lighthouse's default UA does not.

## 7. Decisions needed from the owner

1. **Admin e-mails** — set `ADMIN_EMAILS` (comma-separated) in the deployment before
   merging, otherwise `/admin` is closed to everyone (fail-closed by design).
2. **Video files** — supply the approved hero/grove/cinematic videos (and Turkish variants if any); register them in `lib/media.ts`.
3. **Product photos and names** — see `docs/ASSET-REQUIREMENTS.md`; confirm Aphrodite/Caria/Morsynus naming.
4. **Price conflicts** in §4 — which numbers are correct?
5. **Inquiry forms** (club, corporate gifts) — store them in D1 and/or e-mail them, or change the copy so they don't claim a request was received.
6. **Source of truth for the catalogue** — static file, or D1 managed from admin?
7. **i18n routing** — recommended: Turkish stays at existing URLs, English under `/en/...` with English slugs and `hreflang` pairs.
8. **Network access** — allow the reference sites and the preview host for the benchmark and live verification.

## 8. Premium upgrade on `chore/vercel-portability-phase1` (2026-11-14)

| Phase | Status | Notes |
|---|---|---|
| 1 Product imagery | **PASS (illustrations)** / BLOCKED (photos) | 8 distinct packshot *illustrations*, disclosed as "temsili çizim"; no image-generation model was available, and photorealistic fakes were deliberately not made. Real photos still required (`docs/ASSET-REQUIREMENTS.md`). |
| 2 Homepage | PASS | Seven editorial sections; each photo used once (e2e-checked). |
| 3 Store & PDP | PASS | URL category filters, zoom dialog, packaging/storage/origin/status details, de-duplicated related items, mobile sticky bar (never in showcase). |
| 4 Journal | PASS | 4 published + 7 drafts; drafts 404 publicly, excluded from the sitemap, previewable only by admins; reading time is computed. |
| 5 Admin | PASS | Honest dashboard, media audit table, read-only publish audit, no fake saves or status. |
| 6 Quality | PASS locally | lint 0 errors · typecheck · 55 unit tests · `pnpm build` · `next build` · e2e 133 passed / 4 skipped. A local production-showcase smoke test passed (no prices or cart, orders 403, admin closed). |

Removed unverified copy: the tasting claim "Canlı meyve. Temiz bitiş.", "Sınırlı seri", and the "Toplam ciro" metric built from unpaid orders.
