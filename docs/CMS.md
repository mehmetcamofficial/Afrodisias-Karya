# Altın Dal CMS — data model, permissions and rollback

## Migration `db/postgres/0003_cms.sql`
Additive and idempotent. Existing `products`, `orders` and
`product_publish_audit` rows and columns are preserved; `products` gains `sku`,
`status`, `currency`, `tags`, `version`, `archived_at`, `created_at`.
New tables: `categories`, `product_translations`, `product_variants`,
`product_revisions`, `media_assets`, `product_media`, `blog_posts`,
`blog_translations`, `blog_versions`, `admin_users`, `publication_approvals`,
`audit_logs` (append-only via trigger), `contact_inquiries`, `site_settings`,
`schema_migrations`.

Invariant: `products.active = (status = 'published')` (CHECK constraint). The
storefront and order pricing still read only `active` rows.

### Applied (2026-11-14)
| Branch | Status |
|---|---|
| local PostgreSQL 16 + CI service (PostgreSQL 17) | applied by `pnpm test:db` on every run |
| Neon `cms-0003-rehearsal` (`br-purple-cherry-baqt9poa`, child of preview) | applied + write/constraint smoke |
| Neon **preview** (`br-wispy-cherry-bafzo82p`) | applied; 13 products remain inactive drafts, 0 orders |
| Neon **production** (`br-wandering-block-baq7c11i`) | **NOT applied** — requires explicit owner approval |

### Rollback
1. Restore point: Neon branch `preview-backup-pre-0003` (`br-red-thunder-baexrycf`)
   was created from preview immediately before the migration.
2. Schema rollback: `db/postgres/0003_cms.down.sql` drops only CMS tables and the
   added product columns; products/orders/publish audit rows survive. Export
   `audit_logs` first — it is otherwise lost.
3. Code rollback: revert the CMS commits; the legacy flows were kept compatible.

## Workflow
`draft → in_review → approved → published`, plus `archived`.
Editing a reviewed product sends it back to draft. Published products are
read-only until unpublished. Every write is a single SQL statement that also
writes a revision snapshot and an audit row (optimistic locking on `version`).
Publishing requires `approved` status, price > 0, stock > 0, the typed phrase
`YAYINLA:<id>`, and the environment gate (Preview + `PREVIEW_CATALOG_PUBLISH_ENABLED`).
Permanent delete requires `archived`, the phrase `SIL:<id>`, and no reference in
orders or the publication audit.

## Roles (`lib/cms-permissions.ts`)
| | owner (ADMIN_EMAILS) | editor (admin_users) | viewer (admin_users) |
|---|---|---|---|
| read | ✓ | ✓ | ✓ |
| create / edit / duplicate / submit / archive | ✓ | ✓ | – |
| approve / publish / unpublish / restore / delete | ✓ | – | – |
| users, blog publish | ✓ | – | – |

Production remains fail-closed for all admin APIs.

## Yardım, WhatsApp ve ziyaretçi talepleri (Faz 7)

- Her genel sayfada "Yardım" düğmesi (`app/components/help-widget.tsx`): SSS (`lib/faq.ts`), izinli iletişim formu, yapılandırılmışsa WhatsApp/e-posta bağlantısı. `/admin` altında gösterilmez.
- İletişim kanalları **yalnızca** ortam değişkenlerinden okunur; boş/hatalıysa kanal gizlenir, hiçbir numara uydurulmaz:
  - `NEXT_PUBLIC_WHATSAPP_NUMBER` — E.164 rakamları (`90…`, `+` ve boşluk yok)
  - `NEXT_PUBLIC_CONTACT_EMAIL`
  - `CONTACT_IP_SALT` — IP karması için tuz (IP'nin kendisi saklanmaz)
- WhatsApp yalnızca ziyaretçi bağlantıya tıklayınca açılır; otomatik mesaj gönderilmez.
- `POST /api/contact`: zod doğrulaması, zorunlu izin (DB'de de `CHECK consent = true`), honeypot, IP karması başına 10 dakikada 3 mesaj (tek SQL ifadesi). Eşzamanlı isteklerde sınır yumuşaktır (aynı anda gelen birkaç istek sınırı birkaç adet aşabilir). Veritabanı yoksa 503 döner ve mesajın kaydedilmediğini açıkça söyler.
- `/admin/talepler`: `inquiry.manage` (owner/editor) durum günceller; her değişiklik `audit_logs`'a yazılır. Viewer yalnızca okur.
