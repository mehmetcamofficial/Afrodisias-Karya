-- 0006: finance & pre-accounting. Additive and idempotent.
-- Money: integer minor units (kuruş / cent) in bigint. FX: rate, source and date are stored
-- on every foreign-currency row together with the converted base amount.
-- Ownership: every row carries company_id (single company today, multi-company ready).
-- Ledger entries are immutable: corrections are reversal entries; deletes are blocked by trigger.

CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text NOT NULL,
  base_currency text NOT NULL CHECK (base_currency IN ('TRY','EUR','USD')),
  created_at bigint NOT NULL
);
INSERT INTO companies(id, name, base_currency, created_at) VALUES ('altindal', 'Altın Dal', 'TRY', 0) ON CONFLICT (id) DO NOTHING;

-- Finance-only role for an accountant (no CMS rights).
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner','editor','viewer','accountant'));

CREATE TABLE IF NOT EXISTS finance_accounts (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  company_id text NOT NULL REFERENCES companies(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  kind text NOT NULL CHECK (kind IN ('cash','bank','pos','other')),
  currency text NOT NULL CHECK (currency IN ('TRY','EUR','USD')),
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  company_id text NOT NULL REFERENCES companies(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  direction text NOT NULL CHECK (direction IN ('income','expense')),
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (company_id, direction, name)
);

CREATE TABLE IF NOT EXISTS counterparties (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  company_id text NOT NULL REFERENCES companies(id),
  kind text NOT NULL CHECK (kind IN ('customer','supplier','both')),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  tax_id text NOT NULL DEFAULT '' CHECK (tax_id ~ '^[0-9]{0,11}$'),
  email text NOT NULL DEFAULT '' CHECK (email = '' OR email LIKE '%@%'),
  phone text NOT NULL DEFAULT '' CHECK (length(phone) <= 30),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS counterparties_tax_id_unique ON counterparties(company_id, tax_id) WHERE tax_id <> '';

CREATE TABLE IF NOT EXISTS finance_entries (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES companies(id),
  kind text NOT NULL CHECK (kind IN ('income','expense','collection','payment')),
  occurred_on date NOT NULL,
  account_id text NOT NULL REFERENCES finance_accounts(id),
  category_id text REFERENCES finance_categories(id),
  counterparty_id text REFERENCES counterparties(id),
  order_id text REFERENCES orders(id),
  currency text NOT NULL CHECK (currency IN ('TRY','EUR','USD')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  fx_rate numeric(20,10) NOT NULL CHECK (fx_rate > 0),
  fx_source text NOT NULL CHECK (length(fx_source) BETWEEN 2 AND 80),
  fx_date date NOT NULL,
  base_currency text NOT NULL CHECK (base_currency IN ('TRY','EUR','USD')),
  base_amount_minor bigint NOT NULL CHECK (base_amount_minor > 0),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  external_ref text NOT NULL DEFAULT '' CHECK (length(external_ref) <= 80),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 100),
  reversal_of text UNIQUE REFERENCES finance_entries(id),
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','voided')),
  voided_at bigint,
  void_reason text NOT NULL DEFAULT '' CHECK (length(void_reason) <= 300),
  created_by text NOT NULL,
  created_at bigint NOT NULL,
  version integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, idempotency_key),
  CHECK (currency <> base_currency OR (fx_rate = 1 AND base_amount_minor = amount_minor)),
  CHECK (order_id IS NULL OR kind = 'collection'),
  CHECK (reversal_of IS NULL OR status = 'posted'),
  CHECK ((status = 'voided') = (voided_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS finance_entries_period_idx ON finance_entries(company_id, occurred_on);
CREATE INDEX IF NOT EXISTS finance_entries_order_idx ON finance_entries(order_id) WHERE order_id IS NOT NULL;
-- The same bank/POS reference cannot be collected twice (reversals excluded).
CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_external_ref_unique
  ON finance_entries(company_id, kind, external_ref) WHERE external_ref <> '' AND reversal_of IS NULL;

-- Immutability: amounts and links never change; only posted → voided is allowed; no deletes.
CREATE OR REPLACE FUNCTION finance_entries_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'finance_entries is append-only; use a reversal entry'; END IF;
  IF NEW.status <> 'voided' OR OLD.status <> 'posted'
     OR (NEW.id, NEW.company_id, NEW.kind, NEW.occurred_on, NEW.account_id, NEW.category_id, NEW.counterparty_id, NEW.order_id,
         NEW.currency, NEW.amount_minor, NEW.fx_rate, NEW.fx_source, NEW.fx_date, NEW.base_currency, NEW.base_amount_minor,
         NEW.description, NEW.external_ref, NEW.idempotency_key, NEW.reversal_of, NEW.created_by, NEW.created_at)
        IS DISTINCT FROM
        (OLD.id, OLD.company_id, OLD.kind, OLD.occurred_on, OLD.account_id, OLD.category_id, OLD.counterparty_id, OLD.order_id,
         OLD.currency, OLD.amount_minor, OLD.fx_rate, OLD.fx_source, OLD.fx_date, OLD.base_currency, OLD.base_amount_minor,
         OLD.description, OLD.external_ref, OLD.idempotency_key, OLD.reversal_of, OLD.created_by, OLD.created_at)
  THEN RAISE EXCEPTION 'finance_entries rows are immutable except posted → voided'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS finance_entries_immutable ON finance_entries;
CREATE TRIGGER finance_entries_immutable BEFORE UPDATE OR DELETE ON finance_entries FOR EACH ROW EXECUTE FUNCTION finance_entries_guard();

CREATE TABLE IF NOT EXISTS product_cost_components (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES companies(id),
  product_id text NOT NULL REFERENCES products(id),
  component text NOT NULL CHECK (component IN ('olive','oil','bottle','tin','label','packaging','labor','shipping','other')),
  label text NOT NULL DEFAULT '' CHECK (length(label) <= 120),
  currency text NOT NULL CHECK (currency IN ('TRY','EUR','USD')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  fx_rate numeric(20,10) NOT NULL CHECK (fx_rate > 0),
  fx_source text NOT NULL CHECK (length(fx_source) BETWEEN 2 AND 80),
  fx_date date NOT NULL,
  base_currency text NOT NULL CHECK (base_currency IN ('TRY','EUR','USD')),
  base_amount_minor bigint NOT NULL CHECK (base_amount_minor > 0),
  effective_from date NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_by text NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CHECK (currency <> base_currency OR (fx_rate = 1 AND base_amount_minor = amount_minor))
);
CREATE INDEX IF NOT EXISTS product_cost_components_product_idx ON product_cost_components(company_id, product_id) WHERE NOT archived;

INSERT INTO schema_migrations(version) VALUES ('0006_finance') ON CONFLICT DO NOTHING;
