-- Altın Dal isolated Neon PostgreSQL schema (preview first).
-- No migration of existing D1 records is performed by this file.
BEGIN;
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  price_kurus integer NOT NULL CHECK (price_kurus > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT true,
  updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(active, name);
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  items_json text NOT NULL,
  total_kurus integer NOT NULL CHECK (total_kurus >= 0),
  status text NOT NULL DEFAULT 'payment_pending'
    CHECK (status IN ('payment_pending','preparing','shipped','completed','cancelled')),
  payment_provider text NOT NULL DEFAULT 'iyzico',
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
COMMIT;
