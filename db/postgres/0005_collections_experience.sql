-- 0005: CMS collections and experience sections. Additive and idempotent.
-- Status workflow: draft → published (human, typed confirmation) → draft; archive/restore.
-- Every write goes through the repositories as one statement with an audit row.

CREATE TABLE IF NOT EXISTS collections (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  slug_tr text NOT NULL UNIQUE CHECK (slug_tr ~ '^[a-z0-9-]{2,80}$'),
  slug_en text UNIQUE CHECK (slug_en IS NULL OR slug_en ~ '^[a-z0-9-]{2,80}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  position integer NOT NULL DEFAULT 0,
  cover jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  archived_at bigint
);

CREATE TABLE IF NOT EXISTS collection_translations (
  collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  intro text NOT NULL DEFAULT '' CHECK (length(intro) <= 1200),
  seo_title text NOT NULL DEFAULT '' CHECK (length(seo_title) <= 70),
  seo_description text NOT NULL DEFAULT '' CHECK (length(seo_description) <= 170),
  PRIMARY KEY (collection_id, locale)
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS collection_products_order_idx ON collection_products(collection_id, position);

CREATE TABLE IF NOT EXISTS experience_sections (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  kind text NOT NULL CHECK (kind IN ('region','groves','harvest','production','tasting','stories')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  position integer NOT NULL DEFAULT 0,
  media jsonb NOT NULL DEFAULT '[]',
  related_product_ids text[] NOT NULL DEFAULT '{}',
  related_collection_ids text[] NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  archived_at bigint
);

CREATE TABLE IF NOT EXISTS experience_translations (
  section_id text NOT NULL REFERENCES experience_sections(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  lead text NOT NULL DEFAULT '' CHECK (length(lead) <= 400),
  body_md text NOT NULL DEFAULT '' CHECK (length(body_md) <= 20000),
  PRIMARY KEY (section_id, locale)
);

CREATE INDEX IF NOT EXISTS collections_status_idx ON collections(status, position);
CREATE INDEX IF NOT EXISTS experience_sections_status_idx ON experience_sections(status, position);

DO $$ BEGIN
  ALTER TABLE publication_approvals DROP CONSTRAINT IF EXISTS publication_approvals_entity_type_check;
  ALTER TABLE publication_approvals ADD CONSTRAINT publication_approvals_entity_type_check
    CHECK (entity_type IN ('product','blog_post','collection','experience_section'));
END $$;

INSERT INTO schema_migrations(version) VALUES ('0005_collections_experience') ON CONFLICT DO NOTHING;
