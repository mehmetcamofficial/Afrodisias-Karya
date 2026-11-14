-- Rollback for 0003_cms.sql. DESTRUCTIVE for CMS-only data: drops every table
-- 0003 created (translations, revisions, media, blog, admin users, approvals,
-- audit log, inquiries, settings) and the columns it added to products.
-- Rows in products / orders / product_publish_audit are preserved.
-- Take a backup first and keep it: audit_logs is otherwise lost.
BEGIN;
DROP TABLE IF EXISTS site_settings, contact_inquiries, publication_approvals, admin_users,
  blog_versions, blog_translations, blog_posts, product_media, media_assets,
  product_revisions, product_variants, product_translations, categories CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP FUNCTION IF EXISTS audit_logs_immutable();
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_active_matches_status;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_currency_check;
DROP INDEX IF EXISTS products_sku_unique;
DROP INDEX IF EXISTS products_status_idx;
ALTER TABLE products DROP COLUMN IF EXISTS sku, DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS currency, DROP COLUMN IF EXISTS tags, DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS created_at;
DELETE FROM schema_migrations WHERE version = '0003_cms';
COMMIT;
