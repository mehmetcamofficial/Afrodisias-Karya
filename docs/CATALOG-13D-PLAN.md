# Faz 13D — Mağaza ve koleksiyon entegrasyonu: uygulama planı (ONAY BEKLİYOR)

## Bugünkü veri kaynakları

| Yüzey | Kaynak | Sorun |
|---|---|---|
| Ana sayfa vitrini (`lib/home-vitrine.ts`) | DB satırı varsa DB, yoksa koddaki editoryal katalog (fiyatsız) | Görsel her zaman koddan geliyor (`scene-*.webp`); DB'deki onaylı görselleri kullanmıyor |
| Koleksiyon (`app/koleksiyon/page.tsx`, `lib/collection-scene.ts`) | Koddaki 13 editoryal ürün, varsa DB satırıyla birleştiriliyor | Ürün listesi kodda tutuluyor; DB'ye eklenen yeni bir ürün burada görünmez |
| Mağaza (`app/magaza`), ürün sayfası (`app/urun/[slug]`), sepet (`app/layout.tsx`), sitemap | `getLiveProducts()`: yalnızca yayındaki ve onaylı fiyatlı DB satırları; görsel, lot ve rozet koddan | Ürün sayfasındaki ambalaj ve saklama bilgisi koddan geliyor; 0008'deki DB içeriği (köken, içerik, kullanım, saklama TR/EN) ve DB ambalajı kullanılmıyor |
| Küratörlü koleksiyon kartları (`app/components/showcase.tsx`), `/en/collection` | CMS koleksiyon ürünleri ve koddaki görsel eşlemesi | DB görselleri kullanılmıyor |
| Günlük yazısındaki ürünler (`app/gunluk/[slug]`) | Kod listesi | Taslak ürünlere `/urun/…` bağlantısı veriyor; bu sayfalar **404** |
| Ziyaretçi asistanı (`lib/ai/knowledge.ts`) | Kod listesi | Taslak ürünlere `/urun/…` bağlantısı veriyor; 404 |
| JSON-LD (`lib/structured-data.ts`) | `prices.TRY` | Onaysız TL fiyatı 0 okunur ve teorik olarak "0.00" fiyat çıkabilir. Yayındaki üründe olamaz ama ek koruma gerekiyor. |

## Önerilen tasarım

En basit çözüm tek bir katalog fonksiyonu: `getCatalogue()` (`lib/catalog.ts`). Her ürün için şunları döndürür:

- **`state`:**
  - `live`: yayında, onaylı fiyatlı ve stokta
  - `soldout`: yayında ama stok 0
  - `preview`: DB'de taslak ya da yalnızca editoryal, satışta değil
- **`product`:** ticari alanlar DB'den. `preview` durumunda fiyat ve stok her zaman boştur.
- **`media`:** önce DB'deki **onaylı** fotoğraf; yoksa koddaki görsel, türü açıkça belirtilerek (konsept, seri, editoryal).
- **`content`:** DB'deki TR/EN çeviriler. Boş alanlar "belirtilmedi" olarak gösterilir; koddaki genel saklama metni yalnızca kategori düzeyinde yedek olarak kullanılır.
- **`href`:** `live` ve `soldout` için `/urun/id`; `preview` için `/koleksiyon#seri-…`.

Kurallar:

1. `preview` ürünler yalnızca editoryal yüzeylerde görünür (ana sayfa vitrini, koleksiyon serileri, günlük yazıları). Bu ürünler için sepet, fiyat, ürün sayfası, sitemap ve JSON-LD yoktur.
2. Mağaza, sepet, ürün sayfası ve sitemap yalnızca `live` ve `soldout` ürünleri gösterir; bugünkü davranış korunur.
3. Görsel, ad, hacim, fiyat ve durum bütün yüzeylerde aynı `getCatalogue()` girdisinden gelir.

## Etkilenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `lib/catalog.ts` | **Yeni:** `getCatalogue`, `CatalogueEntry` |
| `lib/live-products.ts`, `lib/catalog-hydration.ts` | DB görselleri ve çevirileri okunur; `listProducts` sorgusu genişletilir (`db/postgres/repository.ts`) |
| `lib/home-vitrine.ts`, `app/components/home-vitrine.tsx` | `getCatalogue` kullanılır; varsa onaylı DB fotoğrafı |
| `app/koleksiyon/page.tsx`, `lib/collection-scene.ts`, `app/components/collection-page.tsx`, `app/components/showcase.tsx` | Tek kaynak |
| `app/magaza/page.tsx`, `app/components/storefront.tsx` | Görsel ve içerik tek kaynaktan |
| `app/urun/[slug]/page.tsx`, `app/components/product-gallery.tsx`, `app/components/product-visual.tsx` | DB içeriği (köken, içerik, kullanım, saklama), DB ambalajı, görsel türü etiketi |
| `app/gunluk/[slug]/page.tsx`, `lib/ai/knowledge.ts` | Taslak ürün bağlantısı koleksiyon serisine gider (404 yok) |
| `lib/structured-data.ts` | `offers` yalnızca onaylı ve 0'dan büyük TL fiyatı varsa |
| `app/sitemap.ts`, `app/layout.tsx` | Değişmez; davranış testle sabitlenir |

## Testler

- **Birim:** `getCatalogue` durumları (live, soldout, preview), görsel önceliği (onaylı fotoğraf > konsept), içerik yedeği, JSON-LD koruması.
- **PostgreSQL entegrasyon:**
  - onaylı ve onaysız fiyat
  - onaylı ve onaysız fotoğraf
  - taslak ürün → `preview`; satın alma yolu yok
- **E2E:**
  - aynı ürünün adı, hacmi, görseli, fiyatı ve durumu ana sayfa, koleksiyon, mağaza ve ürün sayfasında birebir aynı
  - taslak hiçbir yerde sepete eklenemiyor
  - günlük ve asistan bağlantılarında 404 yok
  - TR ve mevcut EN sayfaları
  - 375, 390, 768 ve 1440 px
- **Gerçek Preview kontrolü:** 13 taslak hiçbir yüzeyde satın alınabilir değil; bağlantılarda 404 yok.

## Kapsam dışı

- **13E'ye kalanlar:** tam EN mağaza ve ürün sayfaları, hreflang.
- **Yapılmayacaklar:** ürün yayımlama, fiyat veya stok girme, Production, merge.
