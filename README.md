# Altın Dal — Aphrodisias Estate

Immersive premium zeytinyağı mağazası. Marka anlatısı Karacasu/Ataeymir zeytinliği ile Aphrodisias'ın mermer ve heykelcilik mirasını bir araya getirir.

## Deneyim yönü

Ana yolculuk: **Tetrapylon ritmi → mermer → toprak → zeytinlik → sıvı altın → şişe → hediye kutusu**.

Site şu anda performanslı bir scroll-sinema yaklaşımı kullanır. Çekilecek gerçek video geldiğinde aynı kompozisyonu bozmadan hero katmanına eklenebilir.

## Önerilen hero video çekim listesi

8–12 saniyelik, sessiz, döngüye uygun WebM/MP4:

1. 0–2 sn — gün doğumunda Tetrapylon'a doğru yavaş ileri kamera hareketi
2. 2–5 sn — mermer dokudan zeytin yaprağına yakın plan eşleşmeli geçiş
3. 5–8 sn — Ataeymir zeytinliğinde ağaçların arasından alçak uçuş
4. 8–10 sn — zeytinin düşüşünden altın yağ akışına match-cut
5. 10–12 sn — koyu cam Altın Dal şişesinin mermer kaide üzerinde belirmesi

Çekim: 4K, 25 fps, 16:9 yatay; kilitli pozlama; ağır ağır hareket; yazı ve logo görüntüye gömülmemeli. Mobil için 9:16 alternatif kadraj alınmalı.

## Görsel ve tarihsel referanslar

- UNESCO Aphrodisias tanımı: https://whc.unesco.org/en/list/1519/
- Aphrodisias kazıları — Tetrapylon Street: https://aphrodisias-excavations.com/tetrapylon-street/
- Lia Olive Oil — scroll kontrollü 3D şişe yaklaşımı: https://www.cssdesignawards.com/sites/lia-premium-olive-oil/41149/

Referanslar yön ve yöntem içindir; üçüncü taraf görseller siteye kopyalanmamıştır. Site içindeki ana görseller Altın Dal için özgün üretilmiştir.

## Geliştirme

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build
```

Kalite kontrolleri (CI'da da çalışır):

```bash
pnpm lint
pnpm typecheck
pnpm test         # vitest birim testleri
pnpm test:e2e     # Playwright: 375 / 768 / 1024 / 1440 px
```

### Yönetim paneli yetkisi

`/admin` ve yönetim API'leri yalnızca `ADMIN_EMAILS` ortam değişkenindeki
e-posta adreslerine açıktır (virgülle ayrılmış). Değişken tanımlı değilse panel
**herkese kapalıdır** (fail-closed). Yerel geliştirme için `.dev.vars` dosyası:

```
ADMIN_EMAILS=seedy@sites.test
```

Yerel D1 tabloları için `drizzle/*.sql` göçlerini yerel veritabanına uygulayın.

### Medya ve ürün görselleri

- Videolar `lib/media.ts` içinde dil bazında kaydedilir; dosya yoksa yalnızca
  poster görseli gösterilir.
- Her ürünün görseli `lib/products.ts` içinde `image.kind` ile sınıflandırılır;
  bir ambalaj başka bir ambalajın fotoğrafıyla gösterilmez.
- Eksik görseller: `docs/ASSET-REQUIREMENTS.md`. Denetim raporu: `docs/AUDIT.md`.

Ödeme sistemi iyzico adaptörüne hazırlanmıştır. Canlı tahsilat için iyzico mağaza anahtarları ve callback doğrulaması ayrıca etkinleştirilmelidir. Siparişler şu an yalnızca `payment_pending` olarak kaydedilir; tutar sunucuda katalogdan TL olarak hesaplanır.
