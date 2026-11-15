-- Rollback for 0004 (drops only what 0004 added). Take a branch snapshot first.
DROP INDEX IF EXISTS blog_posts_status_idx;
ALTER TABLE blog_translations DROP CONSTRAINT IF EXISTS blog_translations_body_len;
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_origin_check;
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_video_check;
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_template_check;
ALTER TABLE blog_translations DROP COLUMN IF EXISTS body_md;
ALTER TABLE blog_posts DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS origin, DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS gallery, DROP COLUMN IF EXISTS cover, DROP COLUMN IF EXISTS related_product_ids,
  DROP COLUMN IF EXISTS recipe, DROP COLUMN IF EXISTS template;
DELETE FROM schema_migrations WHERE version = '0004_blog_cms';
