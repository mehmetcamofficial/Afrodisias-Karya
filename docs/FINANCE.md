# Finans ve ön muhasebe (Faz 9)

Ön muhasebe kayıtlarıdır; resmî defter, e-fatura/e-arşiv veya vergi beyanı yerine geçmez. Gerçek bir ödeme sağlayıcısına bağlı değildir.

## 9A — İnceleme sonucu
- **Aktif veritabanı:** PostgreSQL (Neon). Migration'lar `db/postgres/NNNN_*.sql` + `schema_migrations` tablosu (Preview'de 0003–0005 kayıtlıydı) → bu migration **0006**.
- **SQLite/Drizzle (`db/schema.ts`, `drizzle/`):** eski Cloudflare D1 kalıntısı; `db/index.ts` her çağrıda hata fırlatır. Kullanılmıyor, dokunulmadı.
- **Sipariş:** `orders.total_kurus` (TRY), `status` (`payment_pending`…), `payment_provider`. Production'da sipariş oluşturma kapalı (403).
- **Desenler:** RBAC `requirePermission`, append-only `audit_logs`, tek ifadeli CTE yazımları + `version` iyimser kilit.

## Veri modeli — `db/postgres/0006_finance.sql`
| Tablo | Amaç |
|---|---|
| `companies` | Şirket ve ana para birimi (`altindal`, TRY). Her tabloda `company_id` → çok şirketli yapıya hazır. |
| `finance_accounts` | Kasa / banka / POS hesapları, para birimi değişmez |
| `finance_categories` | Gelir/gider kategorileri |
| `counterparties` | Cari hesaplar (müşteri/tedarikçi), VKN/TCKN tekil |
| `finance_entries` | Gelir, gider, tahsilat, ödeme. **Değiştirilemez ve silinemez** (tetikleyici); iptal = ters kayıt |
| `product_cost_components` | Ürün birim maliyet bileşenleri (geçerlilik tarihli) |
| `audit_logs` (mevcut) | Her finans yazımı: `finance.*` eylemleri |

- **Tutarlar:** en küçük birim (kuruş/sent) `bigint`. Ondalık sayı kullanılmaz.
- **Döviz:** yabancı para kaydında kur (`numeric(20,10)`, 6 ondalığa kadar), **kur kaynağı** ve **kur tarihi** zorunlu; ana para karşılığı `base_amount_minor` sunucuda BigInt ile hesaplanır (yarım → sıfırdan uzağa). Aynı para biriminde kur = 1 (`base`) — veritabanı CHECK ile zorlanır.
- **Çift kayıt önleme:** `(company_id, idempotency_key)` tekil (aynı istek tekrar gelirse ilk kayıt döner); banka/POS referansı (`external_ref`) tür başına tekil (ters kayıtlar hariç).
- **Sipariş ↔ tahsilat:** `finance_entries.order_id` (yalnızca tahsilat). Sipariş bakiyesi = tutar − (tahsilatlar − ters kayıtlar).
- **Kâr/zarar:** gelir − gider (ters kayıtlar düşülür); tahsilat/ödeme nakit hareketidir, K/Z'yi değiştirmez.

## Yetki
| Rol | finance.read | finance.write | Not |
|---|---|---|---|
| owner (ADMIN_EMAILS) | ✓ | ✓ | her şey |
| accountant (`admin_users`, yeni) | ✓ | ✓ | CMS, kullanıcı yönetimi ve yayın yetkisi yok |
| editor, viewer | ✗ | ✗ | finans ekranları ve API'leri 403 |

API (`/api/admin/finance/*`): önce yetki (anonim 401, yetkisiz 403), sonra zod doğrulaması (400), sonra tek ifadeli yazım + audit.

## Ekranlar — `/admin/finans`
Genel Bakış · Gelir ve Giderler · Ürün Maliyetleri · Cari Hesaplar · Tahsilatlar · Raporlar (dönem K/Z, kategori kırılımı, nakit, CSV). Veri yoksa açık boş durum; örnek/sahte rakam yok. Marj yalnızca yayındaki (onaylı fiyatlı) ürünler için.

## Ortamlar ve geri dönüş
| Branch | Durum |
|---|---|
| `cms-0003-rehearsal` (br-purple-cherry-baqt9poa) | 0006 uygulandı → tekil referans, silme ve tutar değiştirme Neon'da reddedildi → **down** çalıştırıldı (Faz 8 kayıtları korundu) → yeniden uygulandı |
| `preview-backup-pre-0006` (br-sparkling-base-baxrnnfb) | Preview'in 0006 öncesi yedeği (compute'suz) |
| preview (br-wispy-cherry-bafzo82p) | 0006 uygulandı; finans verisi yok (0 hesap, 0 kayıt) |
| production | **dokunulmadı** |

Geri dönüş: `db/postgres/0006_finance.down.sql` (finans tablolarını ve muhasebe rolündeki kullanıcıları kaldırır — önce dal yedeği alın) veya Preview'i `preview-backup-pre-0006`'dan geri yükleyin.

## Testler
- Birim: `tests/unit/money.test.ts` (ayrıştırma, kur, yuvarlama, K/Z, marj), `tests/unit/finance-api.test.ts` (RBAC, yetki yükseltme, doğrulama), `tests/unit/driver.test.ts`.
- PostgreSQL: `tests/integration/finance.test.ts` (idempotency, eşzamanlı çift tahsilat, para birimi/kategori/arşiv kontrolleri, döviz, ters kayıt + değişmezlik, sipariş bakiyesi, maliyet, şirket sınırı).
- Yönetici ekranı E2E: `pnpm test:e2e:admin` → `next build && next start` + tek kullanımlık yerel PostgreSQL (`LOCAL_PG_DRIVER=1`, yalnızca localhost, Vercel'de asla). Her UI işlemi ayrı bir DB oturumundan doğrulanır.
