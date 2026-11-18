# Faz 13B — Güvenli katalog altyapısı

Bu fazdaki kararlar sahibi tarafından yetkilendirildi:

- Eski yayın yolu yalnızca `approved → published` geçişini kabul eder.
- Boylar ayrı ürün/SKU olarak kalır ve `size_family` ile gruplanır.
- Varsayılan teslimat ülkesi `TR`'dir.
- EUR/USD fiyatı kurla türetilmez.
- 13 ürün taslak kalır.

## Migration `0007_catalog_commerce`

Dosyalar: `db/postgres/0007_catalog_commerce.sql` ve `db/postgres/0007_catalog_commerce.down.sql`.

### Eklenen alanlar

| Tablo | Eklenen |
|---|---|
| `products` | `price_eur_cents`, `price_usd_cents` (NULL = o para biriminde satış yok, > 0 CHECK) |
| `products` | `packaging` (9 değerli CHECK), `net_volume_ml`, `net_weight_g` (> 0) |
| `products` | `size_family` (slug CHECK, indeks), `ships_to text[] DEFAULT '{TR}'` (ISO-2 CHECK) |
| `products` | `products_base_currency_try`: `price_kurus` her zaman TRY'dir |
| `product_translations` | `origin`, `ingredients`, `usage`, `storage` (TR/EN; boş = "belirtilmedi") |
| `orders` | `currency NOT NULL DEFAULT 'TRY'` (eski satırlar TRY), `orders_currency_check` |

### Yayın politikası

- `product_publish_blockers(products)` fonksiyonu, yayını engelleyen eksikleri listeler:
  - `sku`
  - `packaging`
  - `price_try`
  - `stock`
  - `content_tr`: TR ad ve açıklama
  - `photo`: yalnızca `truth='photo'` sayılır. `concept` ve `range` hiçbir zaman sayılmaz. Abonelik/deneyim ürünlerinde `editorial` görsel kabul edilir.
- `products_publish_guard` tetikleyicisi:
  - `published` durumuna yalnızca `approved` durumundan ve engel listesi boşken izin verir.
  - Bunu her yazma yolu için uygular: CMS, eski rota ve ham SQL.

### Güvenlik kontrolleri

- **Uygulama:** TRY dışı taban fiyatlı ürün varsa migration uygulanmadan durur.
- **Geri dönüş:** Yeni kolonlarda veri varsa geri dönüş betiği reddeder; onaylı EUR fiyatı, ambalaj bilgisi veya TRY dışı sipariş sessizce silinemez.

## Migration kanıtı

### Yerel PostgreSQL 17 (izole)

- up → up (idempotent) → down → up başarılı.
- down, şemayı 0007 öncesi şemaya birebir döndürüyor (kolon listesi özeti aynı).
- up, down sonrasında aynı şemayı üretiyor.
- 13 ürün `draft` kalıyor; fiyat, SKU, ambalaj ve stok oluşturulmuyor.
- Uygulanan ifade listesi, dosyanın ürettiği şemayla birebir aynı (kolon, kısıt ve fonksiyon özeti eşit).

### Neon Preview (`fancy-frog-31234482`)

**1. Kaynak doğrulandı.** Dal: `preview`, `br-wispy-cherry-bafzo82p`.

| Kontrol | Değer |
|---|---|
| Veritabanı | `altindal` |
| Migration'lar | 0003–0006 |
| Ürün | 13 |
| Sipariş | 0 |
| TRY dışı taban fiyatlı ürün | 0 |
| Ürün özeti | `829818baae0f3ede37b944df8e8b09e0` |

**2. Yedek alındı ve doğrulandı.** Dal: `preview-backup-pre-0007` (`br-still-union-bacsqk2b`). Bütün sayılar ve ürün özeti birebir aynı.

**3. Prova yapıldı.** Dal: `rehearsal-0007` (`br-floral-heart-bao5jfgn`).

- up (21 ifade, tek işlemde) uygulandı.
- 13 ürün dokunulmadan kaldı.
- Tetikleyici ham `UPDATE … SET status='published'` girişimini `publish_requires_approved` ile reddetti.
- down uygulandığında şema 0006'ya döndü; ürün özeti değişmedi.

**4. Preview'a uygulandı.** Aynı 21 ifade tek işlemde çalıştırıldı. Sonrasında:

| Kontrol | Değer |
|---|---|
| Migration'lar | 0003–0007 |
| Ürün özeti | `829818baae0f3ede37b944df8e8b09e0` (değişmedi) |
| Dokunulmamış taslak | 13/13 |
| Yayında | 0 |
| Sipariş | 0 |
| Finans kaydı | 0 |
| Tetikleyici | aktif |

**Production:** dokunulmadı (orada şema da yok).

**Geri dönüş planı:** `0007_catalog_commerce.down.sql` betiği ya da `preview-backup-pre-0007` dalından geri yükleme.

## Uygulama değişiklikleri

### Fiyat

- `priceFor()` artık `number | null` döndürür. Sabit kur dönüşümleri (`/35`, `×0.031`, `×1.09`) kaldırıldı.
- `displayPrice()` fonksiyonu eklendi. Seçilen para biriminde fiyat yoksa TL fiyatını gösterir ve bunu işaretler (`fallback`); başka para birimine çevirmez.
- Bu davranış mağaza kartlarında, ürün detayında ve sepette aynıdır.
- Sepet toplamı EUR/USD olarak yalnızca bütün satırların o para biriminde fiyatı varsa gösterilir.

### Katalog

- `hydrateProducts`, EUR/USD fiyatını yalnızca veritabanından okur; koddaki EUR rakamları artık kullanılmıyor.
- `ships_to` ve `size_family` alanları veritabanından okunur.
- tin-5l'deki "Stok dikkat" rozeti kaldırıldı; DB stokundan bağımsızdı.

### Sipariş

- Sipariş yalnızca TRY olarak kabul edilir. EUR/USD isteği `unsupported_currency` hatasıyla reddedilir, çevrilmez.
- Teslimat ülkesi varsayılan olarak `TR`'dir. Ürünün `ships_to` listesinde olmayan ülke için sipariş `not_shippable` ile reddedilir.
- Sipariş satırlarına `currency='TRY'` yazılır ve idempotency karşılaştırmasına dahildir.

### Yayın

- CMS iş akışı ve eski `/api/admin/products/publish` rotası aynı politikaya bağlı:
  - `approved` durumu zorunlu
  - `product_publish_blockers` boş olmalı
  - tetikleyici her durumda devrede
- Eski rota ayrıca incelenen fiyat **ve** stokun birebir eşleşmesini ister; yayın anında stok değiştiremez. Artık `audit_logs` tablosuna da kayıt yazar.
- `POST /api/products` yalnızca yeni taslak oluşturur. Var olan ürünü sürüm kontrolü ve audit kaydı olmadan değiştiremez; bu durumda 409 döner.
- RBAC (owner/editor/viewer), yazılan onay ifadesi (`YAYINLA:<id>`), Preview + bayrak kapısı, audit ve optimistic locking korunuyor.

## 13C'den önce gerekli ticari kararlar (sahibinin onayı)

Bunlar girilmeden hiçbir ürün yayımlanamaz; veritabanı politikası bunu engeller.

1. **SKU listesi:** 13 ürünün gerçek SKU kodları ve formatı.
2. **Satılacak ürünler:** hangi ürünler gerçek satış ürünü, hangileri konsept veya kapatılacak (aromatik set, sabun, Olive Club, ağaç sahiplenme).
3. **Onaylı TRY fiyatları:** Preview'daki seed rakamları geçicidir.
4. **EUR/USD:** satış yapılacak mı; yapılacaksa ürün başına onaylı tutarlar. Ödeme sağlayıcısı EUR/USD tahsil edebilene kadar sipariş TRY kalır.
5. **Stok:** ürün başına doğrulanmış başlangıç stoku.
6. **Ambalaj:** her ürün için tip (`glass_bottle`/`tin`/`gift_box`/`jar`/`pouch`/`box`/`set`/`subscription`/`experience`) ve net hacim/ağırlık. Zeytinlerde kavanoz mu poşet mi?
7. **Ürün fotoğrafları:** ürün başına en az bir gerçek fotoğraf (`truth='photo'`). Konsept görseller yayın koşulunu karşılamaz. Medya yükleme (Blob anahtarı) hâlâ BLOCKED.
8. **"Caria / Aphrodite / Morsynus" etiketleri:** seri adı mı? 500 ml cam şişe görseli buna göre güncellenecek.
9. **TR/EN içerik:** açıklama, köken, içerik/bileşen, kullanım ve saklama metinleri.
10. **Teslimat:** TR dışı ülke açılacak mı? Açılacaksa kargo ve ödeme sağlayıcısı kararı.
11. **Ödeme sağlayıcısı:** iyzico kimlik bilgileri. Ödeme hâlâ etkin değil.
