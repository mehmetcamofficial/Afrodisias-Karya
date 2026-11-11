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
| aromatic-set | Tadım & Aromatik Set | 3 × 100 ml | placeholder | set packshot |
| tin-3l | 3 Litre Mat Teneke | tin | placeholder | **tin packshot** |
| tin-5l | 5 Litre Mat Teneke | tin | placeholder | **tin packshot** |
| green-olive | Ataeymir Kırma Yeşil Zeytin | 500 g | placeholder | jar/pack packshot |
| black-olive | Siyah Sele Zeytin | 500 g | placeholder | jar/pack packshot |
| olive-paste | Zeytin Ezmesi | 200 g jar | placeholder | jar packshot |
| soap-box | El Yapımı Zeytinyağlı Sabun | 2-pack box | placeholder | box packshot |
| olive-club | Olive Club | subscription | placeholder | shipment box / contents photo |
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
