-- 0004: blog CMS fields. Additive and idempotent; no existing row changes meaning.
-- Bodies are stored as constrained Markdown (body_md) and rendered as React
-- text nodes — never as raw HTML. Media are referenced by URL with explicit
-- credit/license, because upload storage is not configured yet.
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'article';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS recipe jsonb NOT NULL DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS related_product_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover jsonb NOT NULL DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'cms';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS archived_at bigint;
ALTER TABLE blog_translations ADD COLUMN IF NOT EXISTS body_md text NOT NULL DEFAULT '';

DO $$ BEGIN
  ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_template_check CHECK (template IN ('article','recipe'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_video_check CHECK (video_url = '' OR video_url ~ '^(/|https://)');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_origin_check CHECK (origin IN ('cms','code-import'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE blog_translations ADD CONSTRAINT blog_translations_body_len CHECK (length(body_md) <= 60000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status, publish_at);

INSERT INTO schema_migrations(version) VALUES ('0004_blog_cms') ON CONFLICT DO NOTHING;
