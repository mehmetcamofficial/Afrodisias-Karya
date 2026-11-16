-- Rollback for 0008 (drops only what 0008 added; restores the 0007 publish blockers).
-- Take a branch snapshot first. Refuses to run when approvals or uploaded images exist,
-- so a rollback can never silently discard a commercial approval or a photo.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM product_price_approvals) THEN
    RAISE EXCEPTION '0008 rollback stopped: price approvals exist';
  END IF;
  IF EXISTS (SELECT 1 FROM media_blobs) OR EXISTS (SELECT 1 FROM media_assets WHERE approved_at IS NOT NULL) THEN
    RAISE EXCEPTION '0008 rollback stopped: uploaded or approved media exist';
  END IF;
END $$;

-- 0007 definition, restored verbatim.
CREATE OR REPLACE FUNCTION product_publish_blockers(p products) RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN p.sku IS NULL OR btrim(p.sku) = '' THEN 'sku' END,
    CASE WHEN p.packaging IS NULL THEN 'packaging' END,
    CASE WHEN p.price_kurus IS NULL OR p.price_kurus <= 0 THEN 'price_try' END,
    CASE WHEN p.stock <= 0 THEN 'stock' END,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM product_translations t
       WHERE t.product_id = p.id AND t.locale = 'tr' AND btrim(t.name) <> '' AND btrim(t.description) <> ''
    ) THEN 'content_tr' END,
    -- A real photo of this product. Concept and range images never count; for a
    -- subscription or experience an editorial image may stand in.
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM product_media pm JOIN media_assets m ON m.id = pm.media_id
       WHERE pm.product_id = p.id AND m.kind = 'image'
         AND (m.truth = 'photo' OR (m.truth = 'editorial' AND p.packaging IN ('subscription','experience')))
    ) THEN 'photo' END
  ], NULL)
$$;

DROP TRIGGER IF EXISTS products_price_approval_revoke ON products;
DROP FUNCTION IF EXISTS products_price_approval_revoke();
DROP FUNCTION IF EXISTS product_price_approved(products, text);
DROP TABLE IF EXISTS media_blobs;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_approval_truth;
ALTER TABLE media_assets DROP COLUMN IF EXISTS approved_at;
ALTER TABLE media_assets DROP COLUMN IF EXISTS approved_by;
DROP TABLE IF EXISTS product_price_approvals;

DELETE FROM schema_migrations WHERE version = '0008_product_cms';
COMMIT;
