-- 0002: Preview product publication audit. Apply only to an isolated/Preview DB after identity check.
-- Application publication is a single SQL statement that fails atomically if audit insertion fails.
CREATE TABLE IF NOT EXISTS public.product_publish_audit (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id),
  actor_user_id text NOT NULL CHECK (length(actor_user_id) > 0),
  actor_email text NOT NULL CHECK (length(actor_email) > 0),
  action text NOT NULL DEFAULT 'publish' CHECK (action='publish'),
  price_kurus integer NOT NULL CHECK (price_kurus > 0),
  approved_stock integer NOT NULL CHECK (approved_stock > 0),
  occurred_at bigint NOT NULL,
  CONSTRAINT product_publish_audit_event_unique UNIQUE (product_id,action)
);
CREATE INDEX IF NOT EXISTS product_publish_audit_time_idx ON public.product_publish_audit(occurred_at DESC);
