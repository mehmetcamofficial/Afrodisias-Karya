-- 0003: Content management (products, media, blog, roles, audit, inquiries).
--
-- ADDITIVE ONLY. Existing tables (products, orders, product_publish_audit)
-- keep every column and row; products gains nullable/defaulted columns.
-- Idempotent: safe to re-run. Apply to an isolated/Preview branch first and
-- NEVER to Production without an approved backup + restore rehearsal
-- (see docs/CMS.md#rollback). Rollback for this file: db/postgres/0003_cms.down.sql.
BEGIN;

-- ---------------------------------------------------------------- products
-- Workflow: draft → in_review → approved → published, plus archived.
-- `active` (used by the storefront and order pricing) stays the single
-- commerce switch and is only true while status = 'published'.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at bigint;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at bigint NOT NULL DEFAULT 0;
-- Rows that were published through the 0002 flow are already active.
UPDATE products SET status = 'published' WHERE active = true AND status = 'draft';
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (status IN ('draft','in_review','approved','published','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_active_matches_status
    CHECK (active = (status = 'published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_currency_check CHECK (currency IN ('TRY','EUR','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);

CREATE TABLE IF NOT EXISTS categories (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name_tr text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0
);
INSERT INTO categories(slug, name_tr, name_en, position) VALUES
  ('glass','Erken Hasat Soğuk Sıkım','Early Harvest Cold Extracted',1),
  ('luxury','Özel Seri & Lüks Kutular','Special Series & Gift Boxes',2),
  ('tin','Aile / Teneke Boyu','Family Tins',3),
  ('pantry','Yan Ürünler & Yan Lezzetler','Pantry',4),
  ('subscription','Abonelik & Deneyim','Subscriptions & Experiences',5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_translations (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en')),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '' CHECK (length(seo_title) <= 70),
  seo_description text NOT NULL DEFAULT '' CHECK (length(seo_description) <= 170),
  PRIMARY KEY (product_id, locale)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label text NOT NULL,
  size text NOT NULL DEFAULT '',
  sku text UNIQUE,
  price_kurus integer CHECK (price_kurus IS NULL OR price_kurus > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  position integer NOT NULL DEFAULT 0
);

-- Full snapshot per saved version: the change history.
CREATE TABLE IF NOT EXISTS product_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor_email text NOT NULL,
  created_at bigint NOT NULL,
  UNIQUE (product_id, version)
);

-- ---------------------------------------------------------------- media
CREATE TABLE IF NOT EXISTS media_assets (
  id text PRIMARY KEY,
  url text NOT NULL CHECK (url ~ '^(/|https://)'),
  kind text NOT NULL CHECK (kind IN ('image','video')),
  mime text NOT NULL CHECK (mime IN ('image/webp','image/jpeg','image/png','image/avif','video/mp4','video/webm')),
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 26214400),
  width integer, height integer,
  alt_tr text NOT NULL DEFAULT '', alt_en text NOT NULL DEFAULT '',
  -- photo | range | editorial | concept : what the media truthfully shows
  truth text NOT NULL DEFAULT 'editorial' CHECK (truth IN ('photo','range','editorial','concept')),
  credit text NOT NULL DEFAULT '', license text NOT NULL DEFAULT '',
  created_by text NOT NULL, created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS product_media (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id text NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- ---------------------------------------------------------------- blog
CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,90}$'),
  category text NOT NULL,
  author text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','scheduled','published','archived')),
  featured boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  cover_media_id text REFERENCES media_assets(id) ON DELETE SET NULL,
  publish_at bigint,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CHECK (status <> 'scheduled' OR publish_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS blog_translations (
  post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en')),
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '' CHECK (length(seo_title) <= 70),
  seo_description text NOT NULL DEFAULT '' CHECK (length(seo_description) <= 170),
  PRIMARY KEY (post_id, locale)
);
CREATE TABLE IF NOT EXISTS blog_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor_email text NOT NULL,
  created_at bigint NOT NULL,
  UNIQUE (post_id, version)
);

-- ---------------------------------------------------------------- people & approvals
-- Owners come from ADMIN_EMAILS (bootstrap); this table adds editors/viewers.
CREATE TABLE IF NOT EXISTS admin_users (
  email text PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%@%'),
  role text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  disabled boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_approvals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('product','blog_post')),
  entity_id text NOT NULL,
  version integer NOT NULL,
  decision text NOT NULL CHECK (decision IN ('requested','approved','rejected','published')),
  actor_email text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS publication_approvals_entity_idx ON publication_approvals(entity_type, entity_id, created_at DESC);

-- Append-only audit log: UPDATE and DELETE are rejected by trigger.
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_time_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END $$;
DROP TRIGGER IF EXISTS audit_logs_no_change ON audit_logs;
CREATE TRIGGER audit_logs_no_change BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- ---------------------------------------------------------------- inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) <= 254 AND email LIKE '%@%'),
  topic text NOT NULL CHECK (topic IN ('product','order','corporate','club','other')),
  message text NOT NULL CHECK (length(message) BETWEEN 5 AND 2000),
  consent boolean NOT NULL CHECK (consent = true),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','answered','spam','closed')),
  ip_hash text NOT NULL DEFAULT '',
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_inquiries_time_idx ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_inquiries_ip_idx ON contact_inquiries(ip_hash, created_at DESC);

-- ---------------------------------------------------------------- settings
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9_.]{2,60}$'),
  value jsonb NOT NULL,
  updated_by text NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations(version) VALUES ('0003_cms') ON CONFLICT DO NOTHING;
COMMIT;
