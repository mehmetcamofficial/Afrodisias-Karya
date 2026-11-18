# Faz 13D — Mağaza ve koleksiyon entegrasyonu: kapanış raporu

## Değişiklikler

### Tek katalog kaynağı (`lib/catalog-core.ts`, `lib/catalog.ts`)

`getCatalogue()` bir istek boyunca önbelleğe alınır. Ürün durumları:

- **`live`:** yayında, ticari onaylı TL fiyatı var, stok > 0.
- **`soldout`:** yayında ve fiyatı onaylı, ancak stok 0.
- **`preview`:** editoryal, satışa kapalı. Fiyatı, stoku, rozeti, boy ailesi ve içeriği her zaman boştur.

Kurallar:

- **Ticari veri:** ad, hacim, fiyat, stok, ambalaj, TR/EN içerik ve onaylı fotoğraf yalnızca **yayındaki** veritabanı satırından gelir. Taslağın veritabanındaki içeriği hiçbir zaman kamuya çıkmaz (`listProducts` yalnızca `active=true` satırları döndürür).
- **Fiyatı onaylanmamış yayın satırı:** TL fiyatı 0 okunur (0008) ve satırın durumu `preview` olur, yani satışa açılmaz.
- **Veritabanına erişilemezse:** her ürün `preview` olur, satın alma yapılamaz (`available: false`).
- **Production showcase:** hiçbir ürün satılmaz; mevcut "Yakında" ürün tanıtım sayfaları korunur.
- **Yeni ürünler:** veritabanında yayımlanan ve kod listesinde olmayan bir ürün, kod değişikliği olmadan kataloğa eklenir.
- **Kaldırılan kod:** `lib/live-products.ts` silindi; bütün yüzeyler `getCatalogue()` kullanıyor.

### Yüzeyler

| Yüzey | Davranış |
|---|---|
| Ana sayfa vitrini | Önizleme ürünlerde "Satış henüz açık değil" yazar ve koleksiyon serisine bağlanır. Ürünün onaylı gerçek fotoğrafı varsa sinematik kesit görselin yerine o gösterilir. |
| Koleksiyon | Seri kartlarında durum (`data-state`) ve "Satışta / Tükendi / Koleksiyon önizlemesi" etiketi var. Önizleme kartında fiyat ve bağlantı yok, "Satış henüz açık değil" yazar. |
| Mağaza | Grid'de yalnızca yayındaki ürünler var. Taslaklar ayrı bir **"Yakında mağazada"** bölümünde gösterilir: görsel türü notu var; fiyat, stok ve sepet yok; kart koleksiyon serisine bağlanır. |
| Ürün sayfası | Taslağın `/urun/…` adresi **307** ile koleksiyon serisine yönlenir, 404 vermez. Yayındaki üründe açıklama, köken, içerik, kullanım, saklama, ambalaj ve net miktar veritabanından gelir; eksik alanda "Belirtilmedi" yazar. |
| Küratörlü koleksiyonlar, Deneyim (TR/EN) | Aynı katalog kuralları. |
| Sepet | Yalnızca yayındaki ürünler geri yüklenir; önizleme ürün sepete giremez. |
| Sipariş API'si | Değişmedi: fiyatı veritabanından onaylı TL olarak alır, yalnızca TR teslimat kabul eder. |

### SEO ve ziyaretçi asistanı

- **Sitemap:** yalnızca yayındaki ürünler listelenir. Taslaklar ve showcase tanıtım sayfaları listelenmez.
- **JSON-LD:** `Offer` yalnızca onaylı ve 0'dan büyük bir TL fiyatı varsa üretilir; önizleme ürüne `Product` JSON-LD yazılmaz.
- **Günlük:** yazıdaki ürün bağlantıları katalogdan gelir. Önizleme ürün koleksiyon serisine bağlanır ve "Satış henüz açık değil" etiketi taşır; 404 yok.
- **Ziyaretçi asistanı:** ürün bağlantıları her zaman koleksiyon serisine gider. Asistanın bilgi tabanında fiyat ya da stok bilgisi yok; "Satış durumu yalnızca mağazada" notu eklendi.

## Clerk güvenlik testi mimarisi (`@clerk/testing` 2.2.54)

- **Dosyalar:**
  - `.github/workflows/clerk-preview-auth.yml`
  - `playwright.clerk.config.ts`
  - `tests/clerk-preview/global-setup.ts`
  - `tests/clerk-preview/outsider.spec.ts`
- **Gizli anahtarların kapsamı:** anahtarlar yalnızca `clerk-preview-tests` adlı GitHub Environment'ında tutulur; başka hiçbir iş bunları okuyamaz.
- **Anahtar türü:** yalnızca Development anahtarları (`pk_test_` / `sk_test_`) kabul edilir. Hem iş akışı hem global setup, Production anahtarı verilirse **çalışmayı reddeder**.
- **Test hesabı:** yalnızca Clerk test adresi (`ad+clerk_test@alan`) kabul edilir. Development instance'ında bu adreslerin doğrulama kodu 424242'dir. Hesap yoksa global setup onu Development instance'ında oluşturur. Hesap `ADMIN_EMAILS` listesine veya `admin_users` tablosuna eklenmez.
- **Test akışı:**
  1. Gerçek bir Clerk oturumu açılır.
  2. `/admin/urunler` sayfasının "Bu alana erişim yetkiniz yok" ekranını gösterdiği, ürün verisinin yüklenmediği doğrulanır.
  3. Aynı oturumla 14 admin API çağrısı yapılır; hepsi **403** dönmelidir. Bunlara fiyat onayı, görsel onayı, kullanıcının kendini yükseltmesi ve eski yayın yolu dahildir.
  4. Oturum kapatılır ve aynı çağrının **401** döndüğü doğrulanır.
- **Etkinleştirme:** iş, depo değişkeni `CLERK_PREVIEW_AUTH_ENABLED` değeri `true` olana kadar **skipped** görünür. Böylece kurulum eksikken iş asla yeşil PASS olarak görünmez.

## Test sonuçları (yerel)

| Kontrol | Sonuç |
|---|---|
| Lint | PASS (0 hata) |
| Typecheck | PASS |
| Birim testleri | PASS — 213/213 (yeni `catalog-core.test.ts`: durumlar, taslak verisinin temizlenmesi, DB erişilemezken davranış, showcase, yeni ürün, fotoğraf önceliği, JSON-LD, asistan) |
| PostgreSQL entegrasyon | PASS — 52/52 (yeni: herkese açık katalogda yalnızca yayındaki satır, onaylı fotoğraf ve veritabanı içeriği; taslak görünmüyor) |
| next build, vinext build | PASS |
| Tarayıcılar arası CSS (Chromium) | PASS — 2/2 |
| Etkilenen e2e paketleri | PASS — 137/137 |
| Yeni e2e `catalogue-consistency` | PASS — ad, hacim, görsel ve fiyat ana sayfa, koleksiyon, mağaza ve ürün sayfasında aynı; günlük bağlantıları 200; sitemap ürünleri 200 |
| Production build, yayında ürün yokken (Preview'daki durum) | PASS: `/urun/glass-500` → 307 `/koleksiyon#seri-glass`; sitemap'te 0 ürün; mağazada 13 önizleme |
| Görsel kontrol: 375, 390, 768, 1024, 1440 px (ana sayfa, koleksiyon, mağaza) | PASS: 15/15 ekranda yatay taşma yok ve hiç ₺ fiyatı yok |

## CI ve gerçek Preview (`5a14960`)

| Kontrol | Sonuç |
|---|---|
| `checks`, `cms-integration`, `postgres-transaction`, `diagnostic` | PASS |
| `e2e` (tam paket) | PASS |
| `cross-browser-css` (Chromium, WebKit masaüstü, iPhone, Firefox) | PASS |
| Gerçek Preview `probe` | PASS — 24/24. 13D testi dört tarayıcıda: mağazada 0 ürün kartı ve 13 önizleme; sepet düğmesi yok; fiyat ve stok yok; koleksiyonda 13/13 önizleme; `/urun/glass-500` → `/koleksiyon#seri-glass` (200); sitemap'te `/urun/` yok; ana sayfa vitrininde 3 önizleme |
| Clerk `outsider` işi | **SKIPPED** — sahibin GitHub Environment kurulumu bekleniyor (aşağıda) |
| Yerel tam e2e | 470 geçti. 11 hata yalnızca bu ortamın Wikimedia'ya erişememesinden kaynaklanıyor (`/gunluk` ve navigasyon testleri); CI'da geçiyor. |

## Güvenlik kontrolleri

- 13 ürün taslak kaldı; yayımlama yapılmadı.
- Fiyat, SKU veya stok oluşturulmadı.
- Production'a dokunulmadı; main'e merge yapılmadı.
- Neon yedekleri silinmedi.
- Yeni ücretli servis eklenmedi.
- Production showcase sözleşmesi korundu: siparişler 403, herkese açık katalog boş, admin kapalı.

## Kalan engeller

| Konu | Durum | Gereken |
|---|---|---|
| Gerçek Clerk oturumuyla yetkisiz kullanıcı testi | **BLOCKED** | Sahibin GitHub'da yapacakları: (1) **`clerk-preview-tests`** adlı bir Environment oluşturmak; (2) bu Environment'a secret olarak `CLERK_TEST_PUBLISHABLE_KEY`, `CLERK_TEST_SECRET_KEY` (Preview'ın kullandığı **Development** instance'ın anahtarları) ve `CLERK_TEST_OUTSIDER_EMAIL` (`…+clerk_test@…`, `ADMIN_EMAILS` listesinde olmayan) eklemek; (3) depo değişkeni `CLERK_PREVIEW_AUTH_ENABLED=true` tanımlamak. Bu Development instance'ının yalnızca Preview için ayrılmış bir Clerk uygulaması olması önerilir. |
| Ürün yayımlama | BLOCKED (bilerek) | Gerçek SKU, onaylı fiyat, stok, ambalaj ve gerçek fotoğraf |
| Tam EN mağaza ve ürün sayfaları, hreflang | Faz 13E | Onay bekleniyor |
