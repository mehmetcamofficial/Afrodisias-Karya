# Faz 13C — Premium ürün CMS

**Ön koşul:** Faz 13B'nin bütün kontrolleri `7a9ece9` üzerinde PASS. Bunlar `checks`, `cms-integration`, `postgres-transaction`, `diagnostic`, `e2e`, `cross-browser-css` ve gerçek Preview `probe` kontrolleri.

## Migration `0008_product_cms` (+ down)

Migration yalnızca ekleme yapar ve tekrar uygulanabilir. 0007 uygulanmamışsa durur.

| Ne | Ayrıntı |
|---|---|
| `product_price_approvals` | Ürün ve para birimi başına tek kayıt tutulur: onaylanan tutar, onaylayan, zaman damgası. Seed fiyatlar için kayıt **yok**; geçici fiyatlar onaylı sayılmaz. |
| `products_price_approval_revoke` tetikleyicisi | Hangi para biriminin fiyatı değişirse onun onayı silinir. Audit'e `price.revoke` (`price_changed`) yazılır. Ham SQL ile yapılan değişikliklerde de çalışır. Fiyat eski tutara geri alınsa bile onay geri gelmez. |
| `product_price_approved(p, cur)` | Onay, ancak onaylanan tutar güncel fiyata eşitse geçerlidir. |
| `media_assets.approved_by` / `approved_at` | Gerçek görsel onayı. `CHECK`: yalnızca `photo` ya da `editorial` onaylanabilir; `concept` ve `range` hiçbir zaman onaylanamaz. |
| `media_blobs` | Yüklenen görseller mevcut PostgreSQL'de, `bytea` olarak saklanır. Yeni bir ücretli servis eklenmedi. Boyut sınırı 4 MB'dır ve hem API'de hem `CHECK` kısıtında uygulanır. |
| `product_publish_blockers` | Yayın engellerine `price_try_approval`, `price_eur_approval` ve `price_usd_approval` eklendi. `photo` engeli artık **onaylı** gerçek fotoğraf ister. |
| Mağaza ve siparişler | `listProducts` yalnızca onaylı fiyatları döndürür. Onaysız TL fiyatı 0 okunur, yani sipariş verilemez; onaysız EUR/USD fiyatı `NULL` okunur, yani gösterilmez. |

## Yetki modeli (RBAC)

| İzin | owner | editor | viewer |
|---|---|---|---|
| `price.approve` (ticari fiyat onayı) | ✓ | — | — |
| `media.write` (görsel yükle, bağla, kaldır) | ✓ | ✓ | — |
| `media.approve` (gerçek fotoğraf onayı) | ✓ | — | — |
| Koleksiyon üyeliği (`blog.write`, koleksiyon API'si) | ✓ | ✓ | — |

Her yazma işlemi tek bir SQL ifadesidir ve audit kaydı aynı ifade içinde yazılır. Fiyat onayı `expectedVersion` ve tutar eşleşmesiyle korunur. Yayındaki ürünlerde fiyat onayı, görsel onayı ve görsel ekleme/kaldırma kilitlidir.

## API

| Uç nokta | Açıklama |
|---|---|
| `POST /api/admin/cms/products/[id]/prices` | `{ action: approve, currency, amountMinor, expectedVersion }` veya `{ action: revoke, currency }` |
| `POST /api/admin/cms/products/[id]/media` | Dosya yüklemek için multipart; mevcut bir repo görselini bağlamak için JSON. |
| `DELETE /api/admin/cms/products/[id]/media/[mediaId]` | Görseli üründen ayırır; görsel kaydı ve geçmişi korunur. |
| `POST /api/admin/cms/media/[mediaId]/approval` | `{ approve }` — yalnızca owner. |
| `GET /media/[id]` | Yayındaki ürünlerin görselleri herkese açıktır (ETag ve önbellek). Taslak ürünlerin görsellerini yalnızca admin görür; başkasına 404 döner. |

**Görsel yükleme doğrulaması** (`lib/media-validation.ts`):
- Format, dosya uzantısına veya bildirilen türe göre değil, dosyanın ilk baytlarına bakılarak belirlenir. Desteklenenler: JPEG, PNG, WebP, AVIF. SVG ve HTML reddedilir.
- Bildirilen tür ile gerçek içerik uyuşmazsa yükleme reddedilir.
- Gerçek fotoğrafın kısa kenarı en az 800 px olmalıdır.
- Repo görseli bağlarken yalnızca güvenli yollar kabul edilir ve bu yolla eklenen görsel "gerçek fotoğraf" olarak işaretlenemez.

## Yönetim paneli (`/admin/urunler`)

- **Liste:** TL fiyatı ve onay durumu, "Hazır / N eksik" göstergesi ve ürün ailesi.
- **Yayına hazırlık:** her koşul için ✓ veya ✗ gösterilir (kimlik, ambalaj, içerik, fiyatlar ve onayları, stok, görsel). Yayımla düğmesi eksik varken pasiftir; veritabanı da yayını ayrıca engeller.
- **Kimlik ve ambalaj:** SKU, ürün ailesi (`size_family`), kategori, ambalaj tipi, boyut etiketi, net hacim ve ağırlık.
- **Fiyat, stok ve satış:**
  - TL taban fiyatı, isteğe bağlı EUR ve USD (boş bırakılırsa o para biriminde satış yapılmaz)
  - stok
  - gönderim ülkeleri
- **Ürün içeriği:** TR/EN sekmeleri. Alanlar: ad, açıklama, köken, içerik/bileşenler, kullanım, saklama, SEO.
- **Fiyatlar ve ticari onay:**
  - Her para birimi için kayıtlı tutar ve onaylayanın adı ile zamanı gösterilir.
  - "₺… onayla" düğmesi kaydedilmiş tutarı onaylar. Kaydedilmemiş bir fiyat değişikliği varken düğme pasiftir.
- **Ürün görselleri:**
  - Görsel türü rozeti (gerçek fotoğraf, editoryal, AI konsept, seri) ve onay rozeti.
  - Owner "Gerçek görsel olarak onayla" düğmesini görür; konsept ve seri görsellerde bu düğme hiç yoktur.
  - Dosya yükleme ve sitedeki görseli bağlama.
- **Koleksiyonlar:** onay kutuları üyeliği koleksiyon API'si üzerinden yazar; sürüm kontrolü ve audit orada yapılır.
- **İş akışı:** Taslak → İnceleme → Onaylı → Yayında. Mevcut RBAC, `YAYINLA:<id>` onay metni ve Preview bayrağı korunur.
- **Mobil:** eski `.admin-card form{grid-template-columns:1fr 1fr}` kuralı CMS formunu iki sütuna zorluyor ve telefonda yatay kaydırmaya yol açıyordu; düzeltildi. 375 ve 390 px'te taşma yok.

## Neon Preview uygulaması

1. **Kaynak doğrulandı:**

   | Kontrol | Değer |
   |---|---|
   | Migration'lar | 0003–0007 |
   | Ürün | 13 taslak |
   | Ürün özeti | `829818ba…` |
   | Sipariş | 0 |
   | Görsel | 0 |

2. **Yedek alındı:** `preview-backup-pre-0008` (`br-silent-darkness-batxd33x`). Tüm sayılar ve ürün özeti Preview ile birebir aynı. `preview-backup-pre-0007` korundu.
3. **Prova yapıldı:** Neon dal sınırı dolu olduğu için yeni prova dalı açılamadı; hiçbir dal silinmedi. Prova, mevcut `rehearsal-0007` dalında yapıldı (dal silinmedi):
   - 0007 ve 0008 uygulandı.
   - TL fiyat onayı eklenince `price_try_approval` engeli kalktı.
   - Fiyat 89000 → 90000 yapılınca onay silindi ve audit `price_changed` yazıldı.
   - Fiyat 89000'e geri döndürüldüğünde onay geri gelmedi.
   - 0008 geri alındı; şema 0007'ye döndü, ürün özeti aynı kaldı.
4. **Preview'a uygulandı:** aynı 12 ifade, tek bir işlem (transaction) içinde. Sonrasında:

   | Kontrol | Değer |
   |---|---|
   | Migration'lar | 0003–0008 |
   | Taslak | 13/13, dokunulmadı |
   | Yayında | 0 |
   | Fiyat onayı | 0 |
   | TL fiyat onayı bekleyen | 13/13 |
   | Sipariş, finans kaydı | 0 |

   İki tetikleyici etkin: `products_price_approval_revoke`, `products_publish_guard`.

**Production:** dokunulmadı.

## 13C'den sonra satışa açmak için gerekenler

Hiçbiri sistemde yok; uydurulmayacak.

1. Gerçek SKU'lar.
2. Onaylı TL fiyatları (owner, panelden onaylar). İsteniyorsa EUR/USD.
3. Doğrulanmış stok.
4. Ambalaj tipi ve net hacim/ağırlık.
5. Her ürün için **gerçek ürün fotoğrafı**: kısa kenarı ≥ 800 px, panelden yüklenip owner tarafından onaylanmış.
6. TR (ve isteniyorsa EN) açıklama, köken, içerik, kullanım ve saklama metinleri.
7. Ödeme sağlayıcısı (iyzico) kimlik bilgileri. Sipariş akışı TL ve TR ile sınırlı kalır.

## 13C kapanışı — yetki ve oturum güvenliği

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Bütün admin API'leri (glob ile bulunan her handler ve metot), Clerk ile doğrulanmış ama rolü olmayan kullanıcıyı reddediyor | PASS | `tests/unit/preview-admin-routes.test.ts`: 403, veriye erişmeden |
| `/admin/urunler` sayfası, ürün verisi yüklenmeden önce erişimi reddediyor | PASS | Aynı test (`AdminForbidden`, `loadAdminSnapshot` çağrılmıyor) |
| `ADMIN_EMAILS` listesinde olup e-postası doğrulanmamış hesap | PASS | `tests/unit/preview-admin-escalation.test.ts`: 403, rol sorgusu bile yapılmıyor |
| Benzer görünen e-postalar (`…test.evil.io`, `+x`, ön ek, eksik harf) | PASS | 403 |
| Taklit `oai-authenticated-*` başlıkları (Vercel) | PASS | Oturum yokken 401, yabancı kullanıcıyla 403 |
| Production Clerk anahtarları (`pk_live` / `sk_live`) Preview admin'i açamıyor | PASS | 401; `auth()` hiç çağrılmıyor |
| Production ortamı | PASS | Listedeki doğrulanmış owner bile 401 alıyor |
| `admin_users` tablosundaki "owner" satırı yetki vermiyor | PASS | Owner yalnızca `ADMIN_EMAILS` listesinden geliyor |
| Editor kendi rolünü yükseltemiyor; API yeni owner oluşturamıyor | PASS | Editor 403; owner'ın kendisi bile 400 alıyor |
| Clerk kimliği ile oturum kimliği uyuşmuyor | PASS | `preview-admin-routes.test.ts` |
| Rol tablosu: bilinmeyen, benzer görünen ve devre dışı hesaplar | PASS | `tests/integration/admin-roles.test.ts`: rol yok |
| Owner satırı CMS üzerinden değiştirilemiyor veya düşürülemiyor; rol değişiklikleri audit'leniyor | PASS | Aynı test |
| Fiyat ve fotoğraf onayı, onaylayan kişiyi değiştirilemez (append-only) audit'e yazıyor | PASS | Aynı test; `UPDATE` ve `DELETE` reddediliyor |
| Gerçek Clerk Development test hesabıyla Preview kabulü | **BLOCKED** | Bu oturumda tarayıcı yok ve `vercel.app` erişilemez. CI'da otomatikleştirmek için `@clerk/testing` paketi, Development `CLERK_SECRET_KEY` değerinin GitHub secret olarak eklenmesi ve bir test kullanıcısı gerekiyor; sahibin onayına bağlı. |
