-- 0008: Premium product CMS (Faz 13C). ADDITIVE and idempotent. Requires 0007.
--
-- * Commercial price approval, separate from the content workflow: one row per
--   (product, currency) recording WHO approved WHICH amount and WHEN. An
--   approval only counts while the product's current price equals the approved
--   amount; any price change deletes it (trigger) and writes an audit row.
--   Existing (seed) prices get NO approval.
-- * Media approval: a real photo must be explicitly approved before it can
--   satisfy publication. Concept / range images can never be approved.
-- * media_blobs: uploaded images stored in PostgreSQL (the existing storage;
--   no new paid service). Size is capped by the API (and here).
-- * product_publish_blockers() now also requires approved prices and an
--   APPROVED real photo.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0007_catalog_commerce') THEN
    RAISE EXCEPTION '0008 stopped: apply 0007_catalog_commerce first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_price_approvals (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('TRY','EUR','USD')),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  approved_by text NOT NULL CHECK (approved_by <> ''),
  approved_at bigint NOT NULL,
  PRIMARY KEY (product_id, currency)
);

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS approved_at bigint;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_approval_truth') THEN
    -- Only a real photo (or an editorial image, for subscriptions/experiences) can be approved.
    ALTER TABLE media_assets ADD CONSTRAINT media_assets_approval_truth
      CHECK (approved_at IS NULL OR (truth IN ('photo','editorial') AND approved_by IS NOT NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS media_blobs (
  media_id text PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,
  data bytea NOT NULL CHECK (octet_length(data) > 0 AND octet_length(data) <= 4194304),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

-- A price change revokes the approval of that currency (and records it).
CREATE OR REPLACE FUNCTION products_price_approval_revoke() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE changed text[] := '{}';
BEGIN
  IF NEW.price_kurus IS DISTINCT FROM OLD.price_kurus THEN changed := array_append(changed, 'TRY'); END IF;
  IF NEW.price_eur_cents IS DISTINCT FROM OLD.price_eur_cents THEN changed := array_append(changed, 'EUR'); END IF;
  IF NEW.price_usd_cents IS DISTINCT FROM OLD.price_usd_cents THEN changed := array_append(changed, 'USD'); END IF;
  IF cardinality(changed) > 0 THEN
    WITH gone AS (
      DELETE FROM product_price_approvals WHERE product_id = NEW.id AND currency = ANY(changed)
      RETURNING currency, amount_minor
    )
    INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
    SELECT 'system', 'price.revoke', 'product', NEW.id,
           jsonb_build_object('currency', gone.currency, 'amountMinor', gone.amount_minor, 'reason', 'price_changed'),
           (extract(epoch FROM clock_timestamp()) * 1000)::bigint
      FROM gone;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_price_approval_revoke ON products;
CREATE TRIGGER products_price_approval_revoke AFTER UPDATE OF price_kurus, price_eur_cents, price_usd_cents ON products
  FOR EACH ROW EXECUTE FUNCTION products_price_approval_revoke();

-- Is this currency's current price approved? (NULL price = not sold = nothing to approve.)
CREATE OR REPLACE FUNCTION product_price_approved(p products, cur text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM product_price_approvals a
     WHERE a.product_id = p.id AND a.currency = cur
       AND a.amount_minor = CASE cur WHEN 'TRY' THEN p.price_kurus WHEN 'EUR' THEN p.price_eur_cents ELSE p.price_usd_cents END
  )
$$;

CREATE OR REPLACE FUNCTION product_publish_blockers(p products) RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN p.sku IS NULL OR btrim(p.sku) = '' THEN 'sku' END,
    CASE WHEN p.packaging IS NULL THEN 'packaging' END,
    CASE WHEN p.price_kurus IS NULL OR p.price_kurus <= 0 THEN 'price_try' END,
    CASE WHEN p.price_kurus > 0 AND NOT product_price_approved(p, 'TRY') THEN 'price_try_approval' END,
    CASE WHEN p.price_eur_cents IS NOT NULL AND NOT product_price_approved(p, 'EUR') THEN 'price_eur_approval' END,
    CASE WHEN p.price_usd_cents IS NOT NULL AND NOT product_price_approved(p, 'USD') THEN 'price_usd_approval' END,
    CASE WHEN p.stock <= 0 THEN 'stock' END,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM product_translations t
       WHERE t.product_id = p.id AND t.locale = 'tr' AND btrim(t.name) <> '' AND btrim(t.description) <> ''
    ) THEN 'content_tr' END,
    -- An APPROVED real photo of this product. Concept and range images never count;
    -- for a subscription or experience an approved editorial image may stand in.
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM product_media pm JOIN media_assets m ON m.id = pm.media_id
       WHERE pm.product_id = p.id AND m.kind = 'image' AND m.approved_at IS NOT NULL
         AND (m.truth = 'photo' OR (m.truth = 'editorial' AND p.packaging IN ('subscription','experience')))
    ) THEN 'photo' END
  ], NULL)
$$;

INSERT INTO schema_migrations(version) VALUES ('0008_product_cms') ON CONFLICT DO NOTHING;
COMMIT;
