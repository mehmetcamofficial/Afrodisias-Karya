# Asset Requirements

The site must never show one package to represent another (e.g. a glass bottle
for a 5 L tin). Images are registered per product in `lib/products.ts`
(`image.kind`: `variant` = this exact SKU, `range` = the product family,
`editorial` = not packaging). Products without a truthful photo show a
"Fotoğraf hazırlanıyor" placeholder. Videos are registered in `lib/media.ts`.

## Repository inventory (all of `public/`)

| File | Size | Shows |
|---|---|---|
| `hero-tetrapylon-grove.webp` | 1672×941, 232 KB | Arches + olive grove at sunset (editorial) |
| `altin-dal-bottle-collection.webp` | 1448×1086, 104 KB | Three dark glass bottles labelled Aphrodite / Caria / Morsynus |
| `altin-dal-gift-box.webp` | 1448×1086, 170 KB | Open gift box, one bottle + cup |
| `reports/lot-26-004-sample-analysis.pdf` | — | Sample lab summary (marked sample) |

No video files are in the repository.

### Owner-supplied AI packaging concepts (added 2026-11-14)

The brand owner supplied eight **AI-generated packaging concept** images
(`Altin_Dal_Web_Site_Entegrasyon_Paketi.zip`, 1122×1402 WebP, 134–220 KB).
They are installed under `public/products/concepts/<sku>.webp`, mapped 1:1 to
SKUs in `lib/products.ts` with `kind: "concept"`, and replace the earlier
vector illustrations (removed). The UI states under every one:
"Yapay zekâyla hazırlanmış temsili ambalaj tasarımı; gerçek ürün fotoğrafı
değildir." They are never emitted as Product JSON-LD images. A Playwright test
verifies that all eight actually load (`naturalWidth > 0`) on the store and
product pages.

| SKU | Concept shows | Open question |
|---|---|---|
| aromatic-set | gift box + 3 × 100 ml bottles (lemon/rosemary/chili) | final box design |
| tin-3l / tin-5l | matte olive tin, gold cap | final tin design |
| green-olive / black-olive | glass jar | **packaging type not confirmed by catalogue** |
| olive-paste | 200 g glass jar | — |
| soap-box | box with soap bars | — |
| olive-club | box with **2 × 500 ml tins** | **catalogue says 2 × 500 ml shipment; bottle vs tin not approved** (disclosed on the product page) |

## Required product photography

Spec: 2000×2000 px minimum, neutral travertine or ivory background, consistent
light direction and camera height across sizes, plus one lifestyle shot per
family. Deliver WebP/AVIF or high-quality JPEG. Label must be legible.

| Product id | Name | Package | Current | Needed |
|---|---|---|---|---|
| glass-250 | 250 ml Cam Şişe | glass | range photo | packshot of the 250 ml bottle |
| glass-500 | 500 ml Cam Şişe | glass | range photo | packshot of the 500 ml bottle |
| glass-750 | 750 ml Cam Şişe | glass | range photo | packshot of the 750 ml bottle |
| reserve-500 | Aphrodisias Special Reserve | box + 500 ml | gift-box photo (range) | confirm the box shown is this product; closed + open shots |
| aromatic-set | Tadım & Aromatik Set | 3 × 100 ml | AI concept | set packshot |
| tin-3l | 3 Litre Mat Teneke | tin | AI concept | **tin packshot** |
| tin-5l | 5 Litre Mat Teneke | tin | AI concept | **tin packshot** |
| green-olive | Ataeymir Kırma Yeşil Zeytin | 500 g | AI concept | jar/pack packshot |
| black-olive | Siyah Sele Zeytin | 500 g | AI concept | jar/pack packshot |
| olive-paste | Zeytin Ezmesi | 200 g jar | AI concept | jar packshot |
| soap-box | El Yapımı Zeytinyağlı Sabun | 2-pack box | AI concept | box packshot |
| olive-club | Olive Club | subscription | AI concept | shipment box / contents photo |
| adopt-tree | Adopt an Olive Tree | experience | grove photo (editorial) | photo of the certificate / tree tag |

## Required video

| Slot (`lib/media.ts`) | Previously referenced path | Notes |
|---|---|---|
| `hero` | `/video/altin-dal-hero.mp4` | 8–12 s silent loop, no burned-in text; add a 9:16 crop for mobile if possible |
| `grove` | `/video/ataeymir-grove.mp4` | Plays only while in view |
| `experience` | `/video/altin-dal-cinematic.mp4` | Plays only while in view |

If any video has Turkish/English text or voice-over, provide both language
versions and register them under `tr` / `en`; language-neutral files go under
`default`. Encode H.264 MP4 (≤ 4 MB for the hero) plus optional WebM/AV1.

Generated imagery may only be used for non-product editorial scenes, and
must never depict packaging that does not exist.
