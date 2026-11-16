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

## /koleksiyon scene (Faz 10, 2026-11-15)

The collection page opens with one 2.5D set: glass bottle, matte tin and gift
box on travertine plinths. There is **no real product photography and no 3D
model** in the repository, so no 3D was faked: the products are flat cut-outs
of existing images, placed at different depths under CSS perspective, and the
camera moves between them on scroll.

| Layer | Source | What it is |
|---|---|---|
| `public/collection/scene/scene-bottle.webp` | `altin-dal-bottle-collection.webp` (centre bottle) | brand visual, **not verified as a photograph**; its label reads "Caria", which is not a catalogue name |
| `public/collection/scene/scene-tin.webp` | `products/concepts/tin-3l.webp` | owner-supplied **AI packaging concept** |
| `public/collection/scene/scene-giftbox.webp` | `altin-dal-gift-box.webp` (open base + lid) | brand visual, **not verified as a photograph**; final box design not approved |
| `travertine.webp`, `leaf-shadow.webp` | crops of the tin concept | set dressing |

Every product beat shows its disclosure note on the page. The cut-outs are masks
only (no generated pixels) and are rebuilt with
`python3 scripts/build-collection-scene.py public/collection/scene`.
When real packshots arrive (spec above: 2000 px, travertine/ivory background,
consistent light), replace the three inputs and rerun the script. Use the same
camera height for all three so the set reads as one photograph.

## Page media (Faz 12 / 12B, 2026-11-16)

All stills below are frames from the owner's four cinematic films (`media-src/films/`, not deployed) or crops
of the editorial Aphrodisias photo, built by `scripts/build-page-media.sh`. **None is documentary footage of
the Altın Dal grove**; every page that uses them says so.

| File | Source | Used on |
|---|---|---|
| `pages/story-valley.webp` | film-01 @0.5 s (valley at dawn) | Home (origin), Hikâyemiz |
| `pages/story-aphrodisias.webp` | crop of `hero-tetrapylon-grove.webp` (columns) | Home (origin inset), Hikâyemiz |
| `pages/story-grove.webp`, `story-crate.webp` | film-01 @6.5 s, film-02 @8.5 s | Hikâyemiz |
| `pages/route-heritage/grove/table.webp` | tetrapylon crop, film-01 @4.5 s, film-03 @6.5 s | Home (experience), Deneyim |
| `pages/harvest-*.webp` (7) | films 01–04 | Home (grove-to-table), Hasat, Hikâyemiz |
| `pages/finale-bottle.webp` | film-04 @0.5 s (bottle on travertine) | Home (finale) |
| `video/harvest-loop.webm/.mp4` | film-02, 10 s, muted | Hasat hero (not under reduced motion / Save-Data) |
| `collection/scene/scene-*.webp` | masked cut-outs (see Faz 10) | Koleksiyon scene, Home vitrine, Mağaza doors |

### Still missing (owner to supply)
- Real packshots of the 500 ml bottle, 3 L / 5 L tins and the Special Reserve box (the vitrine and store doors
  use representative images and say so).
- Documentary photos of the grove, harvest and pressing, to replace cinematic frames on Hikâyemiz, Hasat and Home.
- Any certificate or lab report before quality claims beyond the existing protocol text can be shown.
