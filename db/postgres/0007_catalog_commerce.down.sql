-- Rollback for 0007 (drops only what 0007 added). Take a branch snapshot first.
-- Refuses to run when the new columns hold data, so a rollback can never
-- silently discard an approved EUR/USD price, packaging, content or a non-TRY order.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE currency <> 'TRY') THEN
    RAISE EXCEPTION '0007 rollback stopped: non-TRY orders exist';
  END IF;
  IF EXISTS (SELECT 1 FROM products WHERE price_eur_cents IS NOT NULL OR price_usd_cents IS NOT NULL
               OR packaging IS NOT NULL OR net_volume_ml IS NOT NULL OR net_weight_g IS NOT NULL
               OR size_family IS NOT NULL OR ships_to IS DISTINCT FROM '{TR}') THEN
    RAISE EXCEPTION '0007 rollback stopped: products hold 0007 data (prices/packaging/sizes/shipping)';
  END IF;
  IF EXISTS (SELECT 1 FROM product_translations WHERE origin <> '' OR ingredients <> '' OR usage <> '' OR storage <> '') THEN
    RAISE EXCEPTION '0007 rollback stopped: product_translations hold 0007 content';
  END IF;
END $$;

DROP TRIGGER IF EXISTS products_publish_guard ON products;
DROP FUNCTION IF EXISTS products_publish_guard();
DROP FUNCTION IF EXISTS product_publish_blockers(products);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_currency_check;
ALTER TABLE orders DROP COLUMN IF EXISTS currency;

ALTER TABLE product_translations DROP COLUMN IF EXISTS storage;
ALTER TABLE product_translations DROP COLUMN IF EXISTS usage;
ALTER TABLE product_translations DROP COLUMN IF EXISTS ingredients;
ALTER TABLE product_translations DROP COLUMN IF EXISTS origin;

DROP INDEX IF EXISTS products_size_family_idx;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_ships_to_iso2;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_size_family_format;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_net_amount_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_packaging_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_base_currency_try;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_usd_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_eur_positive;
ALTER TABLE products DROP COLUMN IF EXISTS ships_to;
ALTER TABLE products DROP COLUMN IF EXISTS size_family;
ALTER TABLE products DROP COLUMN IF EXISTS net_weight_g;
ALTER TABLE products DROP COLUMN IF EXISTS net_volume_ml;
ALTER TABLE products DROP COLUMN IF EXISTS packaging;
ALTER TABLE products DROP COLUMN IF EXISTS price_usd_cents;
ALTER TABLE products DROP COLUMN IF EXISTS price_eur_cents;

DELETE FROM schema_migrations WHERE version = '0007_catalog_commerce';
COMMIT;
