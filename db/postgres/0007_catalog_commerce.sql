-- 0007: Catalogue commerce foundation (Faz 13B). ADDITIVE and idempotent.
--
-- * products.price_kurus stays the TRY price (minor units). EUR/USD are separate,
--   nullable, business-set prices: NULL means "not sold in that currency".
--   Nothing is ever derived by exchange rate.
-- * Structured packaging / net volume / net weight / size_family / ships_to.
-- * TR/EN product content fields (origin, ingredients, usage, storage).
-- * orders.currency (existing rows are TRY by default).
-- * ONE publication policy enforced in the database for every write path:
--   a product can only become 'published' from 'approved' and only when
--   product_publish_blockers() is empty. Concept imagery never satisfies the
--   photo requirement.
--
-- No existing row is modified except: orders/products receive the new
-- defaulted columns. The 13 Preview drafts stay draft; no price, stock, SKU or
-- packaging value is created. Requires 0003 (products.status, translations,
-- media) to be applied first.
BEGIN;

-- Stop instead of guessing: before 0007 products.currency could label price_kurus
-- as EUR/USD. From now on price_kurus is always TRY.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE currency <> 'TRY') THEN
    RAISE EXCEPTION '0007 stopped: products with a non-TRY base currency exist; resolve them manually first';
  END IF;
END $$;

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_eur_cents integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_usd_cents integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS net_volume_ml integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS net_weight_g integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_family text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ships_to text[] NOT NULL DEFAULT '{TR}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_eur_positive') THEN
    ALTER TABLE products ADD CONSTRAINT products_price_eur_positive CHECK (price_eur_cents IS NULL OR price_eur_cents > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_usd_positive') THEN
    ALTER TABLE products ADD CONSTRAINT products_price_usd_positive CHECK (price_usd_cents IS NULL OR price_usd_cents > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_base_currency_try') THEN
    ALTER TABLE products ADD CONSTRAINT products_base_currency_try CHECK (currency = 'TRY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_packaging_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_packaging_check CHECK (packaging IS NULL OR packaging IN
      ('glass_bottle','tin','gift_box','jar','pouch','box','set','subscription','experience'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_net_amount_positive') THEN
    ALTER TABLE products ADD CONSTRAINT products_net_amount_positive
      CHECK ((net_volume_ml IS NULL OR net_volume_ml > 0) AND (net_weight_g IS NULL OR net_weight_g > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_size_family_format') THEN
    ALTER TABLE products ADD CONSTRAINT products_size_family_format CHECK (size_family IS NULL OR size_family ~ '^[a-z0-9][a-z0-9-]{1,39}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_ships_to_iso2') THEN
    -- ISO 3166-1 alpha-2 codes; an empty list means "ships nowhere".
    ALTER TABLE products ADD CONSTRAINT products_ships_to_iso2 CHECK (array_to_string(ships_to, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS products_size_family_idx ON products(size_family) WHERE size_family IS NOT NULL;

ALTER TABLE product_translations ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT '';
ALTER TABLE product_translations ADD COLUMN IF NOT EXISTS ingredients text NOT NULL DEFAULT '';
ALTER TABLE product_translations ADD COLUMN IF NOT EXISTS usage text NOT NULL DEFAULT '';
ALTER TABLE product_translations ADD COLUMN IF NOT EXISTS storage text NOT NULL DEFAULT '';

-- Orders: total_kurus is the total in minor units of `currency`. Old rows are TRY.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_currency_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_currency_check CHECK (currency IN ('TRY','EUR','USD'));
  END IF;
END $$;

-- What still prevents publication. Empty array = publishable. Read-only.
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

-- Backstop for EVERY write path (CMS workflow, legacy publish, raw SQL):
-- 'published' is reachable only from 'approved' with no blockers.
CREATE OR REPLACE FUNCTION products_publish_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE missing text[];
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'publish_requires_approved' USING ERRCODE = 'check_violation';
    END IF;
    missing := product_publish_blockers(NEW);
    IF cardinality(missing) > 0 THEN
      RAISE EXCEPTION 'publish_blocked: %', array_to_string(missing, ',') USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_publish_guard ON products;
CREATE TRIGGER products_publish_guard BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_publish_guard();

INSERT INTO schema_migrations(version) VALUES ('0007_catalog_commerce') ON CONFLICT DO NOTHING;
COMMIT;
