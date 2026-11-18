# Faz 13A — Katalog denetim raporu

Tarih: 2026-11-16 · Branch: `feat/catalog-commerce` (PR #9 HEAD `096fb2c` üzerinden)

Kaynaklar:

- **Kod:** `lib/products.ts`, `lib/catalog-hydration.ts`, `lib/live-products.ts`, `app/api/orders`, `db/postgres/*`, `app/admin/ProductCms.tsx`.
- **Neon Preview:** proje `fancy-frog-31234482`, dal `preview` (`br-wispy-cherry-bafzo82p`). Yalnızca `SELECT` sorgusu çalıştırıldı.
- **Neon Production:** dal `production`, yalnızca okuma.

Hiçbir veritabanına yazılmadı. Hiçbir ürün, fiyat, stok veya ambalaj bilgisi değiştirilmedi.

## 1. Mevcut ürün sayısı ve durumları

| Kaynak | Ürün | Yayında (`published`) | Satışa uygun |
|---|---|---|---|
| Neon Preview `products` | 13 | 0 (13'ü `draft`, `active=false`) | 0 (tüm stoklar 0) |
| Neon Production | `products` tablosu yok (şema uygulanmamış) | — | — |
| Kod `lib/products.ts` (editoryal katalog) | 13 (aynı 13 kimlik) | — | Kod satış kaynağı değildir |

Kod ve Neon Preview aynı 13 `id`'yi içeriyor. Neon'daki satırlar `0002_preview_catalogue_review.sql` / `preview_draft_catalog_seed.sql` ile eklendi. Bu dosyalar kendileri "fiyatlar geçici, ticari olarak onaylı değil" der.

Neon Preview'da diğer tabloların durumu:

| Tablo | Kayıt |
|---|---|
| `product_translations` | 0 |
| `product_media` | 0 |
| `media_assets` | 0 |
| `product_variants` | 0 |
| `collections` | 0 |
| `collection_products` | 0 |
| `orders` | 0 |
| `product_publish_audit` | 0 |
| `publication_approvals` (ürün) | 0 |
| `product_revisions` | 0 |

Uygulanmış migration'lar: `0003_cms`, `0004_blog_cms`, `0005_collections_experience`, `0006_finance`. `0006_finance`, PR #4'ten gelir ve bu branch'te dosyası yoktur. Yeni migration bu yüzden `0007` olmalıdır.

### Ürün bazında tablo

Tablodaki kısaltmalar ve ortak notlar:

- **TRY (DB, onaysız):** Neon'daki `price_kurus / 100`, seed'den gelen geçici rakam.
- **EUR (kod):** yalnızca `lib/products.ts` içinde, kaynağı ve onayı belgesiz.
- **USD:** hiçbir üründe yok; ekranda kurla türetiliyor (bkz. §5).
- **SKU:** her üründe `NULL`.
- **EN açıklama:** her üründe yok.
- **Koleksiyon eşleşmesi:** yalnızca kod kategorisi (`type`) ile; DB'de koleksiyon ilişkisi yok.

| id | Ad (DB = kod) | Hacim | Ambalaj (kod) | DB durumu | TRY (DB, onaysız) | EUR (kod) | Stok (DB) | Görsel | Görsel türü |
|---|---|---|---|---|---|---|---|---|---|
| glass-250 | 250 ml Cam Şişe | 250 ml | Koyu renkli cam şişe | draft | 550 | 25 | 0 | `altin-dal-bottle-collection.webp` | seri görseli (range), fotoğraf olarak doğrulanmadı |
| glass-500 | 500 ml Cam Şişe | 500 ml | Koyu renkli cam şişe | draft | 890 | 32 | 0 | aynı seri görseli; ana sayfada `scene-bottle.webp` | range (etiketi "Caria") |
| glass-750 | 750 ml Cam Şişe | 750 ml | Koyu renkli cam şişe | draft | 1.250 | 42 | 0 | aynı seri görseli | range |
| reserve-500 | Aphrodisias Special Reserve | 500 ml | Ahşap/mermer dokulu kutu + 500 ml şişe | draft | 1.450 | 48 | 0 | `altin-dal-gift-box.webp`; ana sayfada `scene-giftbox.webp` | range, nihai kutu onaylı değil |
| aromatic-set | Tadım & Aromatik Set | 3 x 100 ml | 3 × 100 ml şişe, set | draft | 780 | 28 | 0 | `products/concepts/aromatic-set.webp` | AI konsept |
| tin-3l | 3 Litre Mat Teneke | 3 L | Mat teneke | draft | 2.100 | 75 | 0 | `concepts/tin-3l.webp`; ana sayfada `scene-tin.webp` | AI konsept |
| tin-5l | 5 Litre Mat Teneke | 5 L | Mat teneke | draft | 3.200 | 110 | 0 | `concepts/tin-5l.webp` | AI konsept |
| green-olive | Ataeymir Kırma Yeşil Zeytin | 500 g | **doğrulanmadı** (kavanoz/poşet?) | draft | 240 | — | 0 | `concepts/green-olive.webp` | AI konsept |
| black-olive | Siyah Sele Zeytin | 500 g | **doğrulanmadı** | draft | 260 | — | 0 | `concepts/black-olive.webp` | AI konsept |
| olive-paste | Zeytin Ezmesi | 200 g cam kavanoz | Cam kavanoz | draft | 180 | — | 0 | `concepts/olive-paste.webp` | AI konsept |
| soap-box | El Yapımı Zeytinyağlı Sabun | 2'li kutu | 2'li kutu | draft | 290 | — | 0 | `concepts/soap-box.webp` | AI konsept |
| olive-club | Olive Club | 2 x 500 ml / 2 ay | Üyelik gönderimi (2 × 500 ml) | draft | 1.450 | — | 0 | `concepts/olive-club.webp` (görselde teneke, ambalaj onaylı değil) | AI konsept |
| adopt-tree | Adopt an Olive Tree | Yıllık | Deneyim programı | draft | 4.500 | — | 0 | `hero-tetrapylon-grove.webp` | editoryal (ürün görseli değil) |

## 2. Eksik ürün verileri

Bilgiler sahibinden gelmeli; tahmin edilip girilmeyecek.

| Veri | Durum | Etki |
|---|---|---|
| **SKU** | 13/13 `NULL`. Koddaki `AD-26-G500` gibi değerler lot kodudur, SKU değildir. | SKU ile eşleştirme şu an mümkün değil |
| **Onaylı TRY fiyatı** | 13/13 "geçici" seed rakamı | Yayına alınmadan önce sahibinin onaylaması gerekir |
| **EUR fiyatı** | 7 üründe yalnızca kodda var; DB'de EUR kolonu yok | Onaylı EUR fiyatı sistemde tutulamıyor |
| **USD fiyatı** | 0/13 | — |
| **Stok** | 13/13 = 0 (DB) | Hiçbir ürün satılamaz (doğru davranış) |
| **EN ad/açıklama** | 0/13 | EN ürün sayfaları yapılamaz |
| **TR uzun açıklama** | 0/13. Yalnızca tek satırlık `note` var. | Ürün sayfasında içerik zayıf |
| **İçerik ve bileşen** (ör. aromatik setin aroma bileşenleri) | yok | Uydurulmayacak; sayfada "belirtilmedi" denecek |
| **Kullanım ve saklama** | Kodda kategori bazlı genel metin var, DB'de yok | — |
| **Köken** | Marka düzeyinde var (Ataeymir · Karacasu); ürün/lot bazında yok | — |
| **Net hacim/ağırlık** (yapısal) | Yalnızca serbest metin (`"3 x 100 ml"`, `"2'li kutu"`) | Filtre, karşılaştırma ve kargo ağırlığı hesaplanamaz |
| **Ambalaj tipi** | Yalnızca kodda; zeytin ürünleri için doğrulanmamış | — |
| **Gerçek ürün fotoğrafı** | 0/13 | Bkz. §3 |
| **Kargo ağırlığı/ölçüsü, gönderilebilir ülkeler** | hiç yok | Uluslararası teslimat değerlendirilemez |

## 3. Görsel envanteri

| Görsel | Kullanıldığı yer | Ne gösteriyor | Doğruluk |
|---|---|---|---|
| `altin-dal-bottle-collection.webp` | glass-250/500/750 (üçü aynı görsel) | Üç koyu şişe, etiketleri **Aphrodite / Caria / Morsynus** | Marka görseli, fotoğraf olarak doğrulanmadı. **Etiketlerdeki adlar katalogda yok.** |
| `collection/scene/scene-bottle.webp` | Ana sayfa vitrini ve Koleksiyon sahnesi → "500 ml Cam Şişe" | Yukarıdaki görselin ortadaki şişesi ("Caria") | Aynı sorun: "Caria" etiketli şişe "500 ml Cam Şişe" olarak sunuluyor |
| `altin-dal-gift-box.webp`, `scene-giftbox.webp` | reserve-500 | Açık hediye kutusu, şişe + kâse | Doğrulanmadı; nihai kutu tasarımı onaylı değil |
| `products/concepts/*.webp` (8 adet) | aromatic-set, tin-3l, tin-5l, green-olive, black-olive, olive-paste, soap-box, olive-club | Sahibi tarafından verilmiş AI ambalaj konseptleri | Sitede "temsili" olarak işaretli (doğru) |
| `scene-tin.webp` | tin-3l | tin-3l konseptinin kesiti | AI konsept |
| `hero-tetrapylon-grove.webp` | adopt-tree | Zeytinlik / antik kent | Editoryal |

Özet:

- Gerçek ürün fotoğrafı: **0**
- AI konsept: **8**
- Doğrulanmamış seri görseli: **2** dosya, 4 ürüne bağlı
- Editoryal: **1**

DB'de `media_assets` ve `product_media` boş. Görsel eşlemesi yalnızca kodda duruyor. Medya yükleme özelliği de kapalı: `/admin/medya` "Yükleme: BLOCKED" diyor, çünkü Blob depolama anahtarı yapılandırılmamış.

## 4. CMS ve kod eşleşme sorunları

1. **İki ayrı doğruluk kaynağı var.**
   - Ticari veriler Neon'da: ad, boy, not, TRY fiyatı, stok, durum.
   - Görsel, rozet (`badge`), lot, EUR fiyatı, ambalaj, boy ailesi ve saklama metni yalnızca kodda.
   - `hydrateProducts`, kod verisini **`id`** ile Neon satırına yapıştırıyor. Kod ve DB adları ayrışırsa görsel yanlış ürüne gidebilir.
2. **Kod rozeti ile DB stoku çelişebilir.** tin-5l'nin koddaki "Stok dikkat" rozeti DB stokundan bağımsız gösterilir.
3. **Kod "ürün listesi" gibi davranıyor.**
   - `/koleksiyon` ve ana sayfa vitrini, DB'de olmayan ürünleri koddan "önizleme" olarak gösteriyor. Bu doğru etiketleniyor ve satın alınamıyor, ama kod yine de ürün varlığının kaynağı.
   - Hedef: ürün yalnızca DB'de var olur, kod yalnızca sunum yedeğidir.
4. **Kimlik ve SKU.** `id` hem birincil anahtar hem URL slug'ı. `sku` kolonu var ve kısmi benzersiz indeksli (`WHERE sku IS NOT NULL`), ama hiç doldurulmamış.
5. **İkinci yayın yolu onay akışını atlıyor.** `POST /api/admin/products/publish` (`publishReviewedProduct`):
   - Ürünü **`draft`** durumundan doğrudan `published` yapabiliyor.
   - Yalnızca owner yetkisi ve `YAYINLA:<id>` onay metni ister; `in_review → approved` adımlarını atlar.
6. **Boy varyantları tutarsız modellenmiş.** `product_variants` tablosu kullanılmıyor. Boylar ayrı ürün olarak duruyor; aile ilişkisi (`sizeFamilies`) yalnızca kodda.
7. **Koleksiyon ilişkisi yok.** `collection_products` boş. Ana sayfa, Koleksiyon ve Mağaza serileri koddaki `category` ile gruplanıyor.
8. **Görsel–ürün uyumsuzluğu.** "Caria" etiketli şişe "500 ml Cam Şişe" olarak gösteriliyor (bkz. §3).
9. **İngilizce sayfalar eksik.**
   - Yalnızca `/en/collection`, `/en/collection/[slug]` ve `/en/experience` var.
   - EN ana sayfa, mağaza ve ürün sayfaları yok.
   - `/urun/[slug]` sayfasında hreflang yok.

## 5. Sipariş ve fiyat altyapısının sınırlamaları

| Konu | Mevcut durum | Risk |
|---|---|---|
| **Kurla fiyat türetme** | `priceFor()` EUR'yu `TRY/35`, USD'yi `EUR×1.09` veya `TRY×0.031` ile **türetiyor**. Mağaza, sepet ve ürün sayfası bu değerleri gerçek fiyat gibi gösteriyor. | **13E kuralını ihlal ediyor** ("otomatik döviz çevirisiyle fiyat üretme"). Kaldırılmalı. |
| Sepet para birimi | Sepette EUR/USD seçilebiliyor; not "TRY tahsil edilir" diyor | Gösterilen EUR/USD tutarı onaysız ve türetilmiş |
| Sipariş API'si | Fiyatı sunucuda DB'den çözüyor, `active=true` ürün listesiyle doğruluyor, stok ve idempotency kontrolü var. Production'da 403 dönüyor (doğru). | Taslak ürün sipariş edilemiyor (iyi). Yalnızca TRY. |
| `orders` tablosu | `currency` kolonu yok; `total_kurus` her zaman TRY | Çok para birimli sipariş kaydı tutulamaz |
| Ödeme | `payment_provider='iyzico'`; kimlik bilgisi yok, API `credentials_required` dönüyor | Ödeme hiçbir ortamda etkin değil |
| Kargo/teslimat | Ülke, bölge, kargo ücreti ve ağırlık modeli yok | Uluslararası teslimat **desteklenmiyor**; sitede de vaat edilmemeli |
| Yayın kapısı | `approved → published` geçişi SKU, EN metin, stok veya görsel doğrulaması yapmıyor (yalnızca `price_kurus > 0`) | Eksik veriyle ürün yayına alınabilir |
| Production | DB'de şema yok, showcase modu DB'ye hiç dokunmuyor | Production'da satış imkânsız (beklenen) |

## 6. Önerilen migration ve uygulama planı

Kritik kararlar ve öneriler aşağıda; **onay beklenen noktalar ⚠ ile işaretli**. Her adım geriye uyumlu (yalnızca ekleme) ve Preview'da yedek dal alındıktan sonra uygulanacak.

### Migration `0007_catalog_commerce` (yalnızca ekleme)

**`products` tablosuna:**

- `price_eur_cents integer NULL CHECK (>0)` ve `price_usd_cents integer NULL CHECK (>0)`.
  - `NULL` = o para biriminde satış yok; kur ile türetme yok.
  - Mevcut `price_kurus` TRY olarak kalır.
- `packaging text NULL CHECK (packaging IN ('glass_bottle','tin','gift_box','jar','pouch','box','set','subscription','experience'))`. ⚠ Zeytinlerin ambalajı sahibinden gelmeli.
- `net_volume_ml integer NULL`, `net_weight_g integer NULL` (yapısal hacim; serbest metin `size` görüntü için kalır).
- `size_family text NULL` (boy değiştirici DB'den; `product_variants` kullanılmaz, en basit çözüm).
- `ships_to text[] NOT NULL DEFAULT '{TR}'`. Ülke uygunluğu; uluslararası varsayılan kapalı.
- `sku`, yayın anında zorunlu olur (CHECK: `status <> 'published' OR sku IS NOT NULL`). Mevcut satırlar draft olduğu için kırılmaz.

**`product_translations` tablosuna:**

- `ingredients text NOT NULL DEFAULT ''`
- `usage text NOT NULL DEFAULT ''`
- `storage text NOT NULL DEFAULT ''`
- Köken marka düzeyinde ve lot sayfasında kalır.

**`orders` tablosuna:**

- `currency text NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY','EUR','USD'))`.
- EUR/USD sipariş, ödeme sağlayıcısı etkinleşene kadar API'de kapalı kalır.

**Yayın kapısı (uygulama + test):**

- `approved → published` ancak şu koşullarla geçer:
  - SKU dolu
  - TR ad ve açıklama dolu
  - TRY fiyatı > 0
  - stok > 0
  - en az bir görsel kaydı
- EN metin eksikse ürün yalnızca TR'de listelenir.

**Eski yayın yolu:** `publishReviewedProduct` yalnızca `approved` kaynağını kabul edecek şekilde daraltılır. ⚠ Alternatif: tamamen kaldırılır.

**Medya:**

- Repo içi mevcut görseller `media_assets` tablosuna `truth` ile kaydedilir (`concept`/`range`/`editorial`).
- `product_media` ile bağlanır.
- Koddaki eşleme yedek olarak kalır.
- Yükleme (Blob) BLOCKED olarak kalır.

### Uygulama sırası (13B → 13F)

1. **13B:**
   - `0007` migration + down migration.
   - Preview'da yedek dal alınır, sonra uygulanır.
   - `priceFor` kur türetmesi kaldırılır (onaylı fiyat yoksa "bu para biriminde satışta değil").
   - Sipariş API'sinde para birimi ve yayın kapısı.
   - Birim ve PostgreSQL entegrasyon testleri.
2. **13C:** Admin ürün formuna eklenecekler:
   - TR/EN alanlar (içerik, kullanım, saklama)
   - SKU, ambalaj, net hacim
   - EUR/USD fiyatları
   - stok
   - ülke listesi
   - görsel seçimi (mevcut dosyalardan)
   - koleksiyon ilişkisi
   - Mevcut RBAC, audit ve optimistic locking korunur.
3. **13D:**
   - Ana sayfa, koleksiyon ve mağaza tek fonksiyondan (`getCatalogue`) beslenir.
   - Kod yalnızca sunum yedeği olur.
   - Ürün detayında köken, içerik, hacim, kullanım ve saklama gösterilir; eksik alan "belirtilmedi" olarak çıkar.
4. **13E:**
   - EN ana sayfa (`/en`), mağaza (`/en/shop`) ve ürün sayfası (`/en/product/[slug]`).
   - Dil geçişi eşdeğer sayfaya gider.
   - hreflang ve canonical.
   - Para birimi yalnızca onaylı fiyat varsa seçilebilir.
   - Ülke uygunluğu bilgisi.
5. **13F:** Kabul testleri (birim + PG entegrasyon + e2e + cross-browser + gerçek Preview).

### Onay gerektiren kararlar ⚠

1. **SKU formatı ve 13 ürünün gerçek SKU'ları.** Örnek format: `AD-EVOO-GL-500`. Uydurulmayacak.
2. **Satışa açılacak ürün listesi:** hangi ürünler gerçek, hangileri yalnızca konsept (ör. aromatik set, sabun, Olive Club, ağaç sahiplenme).
3. **Onaylı TRY fiyatları.** Mevcut DB rakamları "geçici". Ayrıca EUR/USD fiyatları satılacak mı, satılacaksa onaylı tutarlar.
4. **Cam şişe görseli.** "Aphrodite / Caria / Morsynus" etiketleri ürün adı mı (seri adı)? Değilse 500 ml cam şişe için başka görsel kullanılmalı veya etiket uyumsuzluğu açıkça belirtilmeli.
5. **Zeytin ürünlerinin ambalajı** (kavanoz/poşet) ve net ağırlıklar.
6. **Teslimat ülkeleri.** Öneri: yalnızca TR (uluslararası sevkiyat etkin değil).
7. **Eski yayın yolu:** daraltılsın mı, kaldırılsın mı?
8. **Boy varyantları:** ayrı ürün + `size_family` (önerilen, en basit) mi, yoksa `product_variants` mı?

## 7. PASS / BLOCKED

| Kontrol | Sonuç | Not |
|---|---|---|
| Kod kataloğu incelendi | PASS | 13 editoryal ürün |
| Neon Preview kataloğu incelendi (salt okunur) | PASS | 13 draft, stok 0, SKU yok |
| Neon Production incelendi (salt okunur) | PASS | şema yok, ürün yok |
| CMS tabloları (çeviri, medya, koleksiyon, revizyon, onay) | PASS | hepsi boş |
| Kod ↔ DB kimlik eşleşmesi | PASS | 13/13 `id` eşleşiyor |
| Kod ↔ DB SKU eşleşmesi | BLOCKED | SKU yok, sahibinden alınmalı |
| Onaylı fiyatlar (TRY/EUR/USD) | BLOCKED | geçici rakamlar; EUR yalnızca kodda; USD yok |
| Kur ile fiyat türetme yok | **FAIL** | `priceFor` EUR/USD türetiyor → 13B'de düzeltilecek |
| Taslak ürün satın alınamaz | PASS | sipariş API yalnızca `active=true` + stok kabul ediyor; Production 403 |
| Yayın onay akışı tek yol | **FAIL** | eski publish rotası `draft → published` geçişine izin veriyor |
| Gerçek ürün fotoğrafları | BLOCKED | 0/13; 8 AI konsept, 2 doğrulanmamış seri görseli |
| Görsel–ürün adı uyumu | **FAIL** | "Caria" etiketli şişe "500 ml Cam Şişe" olarak gösteriliyor (karar 4) |
| EN ürün içerikleri | BLOCKED | 0/13 çeviri |
| EN ana sayfa / mağaza / ürün | FAIL (eksik) | 13E'de yapılacak |
| Uluslararası ödeme | BLOCKED | iyzico kimlik bilgisi yok; EUR/USD tahsilat yok |
| Uluslararası teslimat | BLOCKED | kargo/ülke modeli yok |
| Medya yükleme | BLOCKED | Blob anahtarı yok |
| CMS admin arayüzü gerçek tarayıcıda (Preview + Clerk) | Bu adımda yapılmadı | 13C'de Preview oturumuyla doğrulanacak |
