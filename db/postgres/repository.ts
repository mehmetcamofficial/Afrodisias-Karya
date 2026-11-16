/**
 * Portable, strictly parameterized SQL statements for the Vercel migration.
 * No database connection is opened here. The driver is injected by the caller.
 */
export type SqlDriver = {
  query<T extends Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[]; rowCount: number }>;
};

export type ProductRow = {
  id: string; name: string; type: string; size: string; note: string;
  priceKurus: number; stock: number; active: boolean;
  /** 0007: business-set EUR/USD prices in cents; null = not sold in that currency. */
  priceEurCents?: number | null; priceUsdCents?: number | null;
  sizeFamily?: string | null; shipsTo?: string[];
};
export type OrderRow = {
  id: string; customerName: string; email: string; totalKurus: number;
  status: string; provider: string; createdAt: number;
};
export type NewOrder = {
  id: string; customerName: string; email: string; phone: string;
  address: string; itemsJson: string; totalKurus: number; createdAt: number;
};

export async function listProducts(db: SqlDriver): Promise<ProductRow[]> {
  const result = await db.query<ProductRow>(
    // 0008: only COMMERCIALLY APPROVED prices leave the database for the storefront and orders.
    // An unapproved TRY price reads as 0 (not orderable); an unapproved EUR/USD price as NULL (not shown).
    `SELECT id,name,type,size,note,
            CASE WHEN product_price_approved(products,'TRY') THEN price_kurus ELSE 0 END AS "priceKurus",
            CASE WHEN product_price_approved(products,'EUR') THEN price_eur_cents END AS "priceEurCents",
            CASE WHEN product_price_approved(products,'USD') THEN price_usd_cents END AS "priceUsdCents",
            size_family AS "sizeFamily",ships_to AS "shipsTo",stock,active
       FROM products WHERE active=true ORDER BY name`
  );
  return result.rows;
}

/** Admin inventory includes inactive drafts; public listProducts never does. */
export async function listAllProducts(db: SqlDriver): Promise<ProductRow[]> {
  const result = await db.query<ProductRow>(
    `SELECT id,name,type,size,note,price_kurus AS "priceKurus",price_eur_cents AS "priceEurCents",price_usd_cents AS "priceUsdCents",size_family AS "sizeFamily",ships_to AS "shipsTo",stock,active FROM products ORDER BY name`
  );
  return result.rows;
}

/**
 * Legacy create: inserts a NEW inactive draft only. An existing id is never
 * overwritten here (that path had no version check, revision or audit); edits
 * go through the CMS repository. Returns false when the id already exists.
 */
export async function upsertProduct(db: SqlDriver, product: ProductRow, updatedAt: number): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO products(id,name,type,size,note,price_kurus,stock,active,updated_at,status)
     VALUES($1,$2,$3,$4,$5,$6,0,false,$7,'draft')
     ON CONFLICT(id) DO NOTHING RETURNING id`,
    [product.id, product.name, product.type, product.size, product.note, product.priceKurus, updatedAt]
  );
  return result.rowCount > 0;
}

/**
 * Legacy Preview publish, bound to the same policy as the CMS workflow:
 * only an APPROVED product whose reviewed price and stock match exactly, and
 * whose publish blockers (SKU, packaging, TR content, real photo, stock) are
 * empty. Draft → published is impossible here (and in the DB trigger, 0007).
 */
export async function publishReviewedProduct(
  db: SqlDriver,
  input: { id: string; expectedPriceKurus: number; approvedStock: number; actorUserId: string; actorEmail: string },
  updatedAt: number,
): Promise<boolean> {
  // A single PostgreSQL statement is atomic: any audit failure rolls back publication.
  // Neither the audit nor product change may succeed independently.
  const result = await db.query<{ id: string }>(
    `WITH published AS (
       UPDATE products
       SET active=true, status='published', version=version+1, updated_at=$4
       WHERE id=$1 AND active=false AND status='approved' AND price_kurus=$2 AND stock=$3
         AND $2 > 0 AND $3 > 0 AND cardinality(product_publish_blockers(products)) = 0
       RETURNING id, price_kurus, stock, version, status
     ), recorded AS (
       INSERT INTO product_publish_audit
         (product_id, actor_user_id, actor_email, action, price_kurus, approved_stock, occurred_at)
       SELECT id, $5, $6, 'publish', price_kurus, stock, $4 FROM published
       RETURNING product_id
     ), aud AS (
       INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
       SELECT $6, 'product.publish', 'product', id,
              jsonb_build_object('version', version, 'status', status, 'priceKurus', price_kurus, 'stock', stock, 'route', 'legacy'), $4
         FROM published
       RETURNING 1
     )
     SELECT product_id AS id FROM recorded`,
    [input.id, input.expectedPriceKurus, input.approvedStock, updatedAt, input.actorUserId, input.actorEmail],
  );
  return result.rows.length === 1;
}

export async function listOrders(db: SqlDriver): Promise<OrderRow[]> {
  const result = await db.query<OrderRow>(
    'SELECT id,customer_name AS "customerName",email,total_kurus AS "totalKurus",status,payment_provider AS provider,created_at AS "createdAt" FROM orders ORDER BY created_at DESC LIMIT 100'
  );
  return result.rows;
}

export async function setOrderStatus(db: SqlDriver, id: string, status: string): Promise<boolean> {
  const result = await db.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING id', [status, id]);
  return result.rowCount > 0;
}

export class OrderIdempotencyConflictError extends Error {
  constructor() { super('Idempotency key already used for a different order'); this.name = 'OrderIdempotencyConflictError'; }
}

export async function createPendingOrder(db: SqlDriver, order: NewOrder): Promise<number> {
  // One atomic statement: concurrent requests serialize on the unique order id.
  // A mismatched retry never changes the stored order. The WHERE clause prevents
  // a conflicting payload from returning a row, even under concurrent inserts.
  const result = await db.query<{ totalKurus: number }>(
    `INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,currency,status,payment_provider,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,'TRY','payment_pending','iyzico',$8)
     ON CONFLICT(id) DO UPDATE SET id=orders.id
     WHERE orders.customer_name IS NOT DISTINCT FROM excluded.customer_name
       AND orders.email IS NOT DISTINCT FROM excluded.email
       AND orders.phone IS NOT DISTINCT FROM excluded.phone
       AND orders.address IS NOT DISTINCT FROM excluded.address
       AND orders.items_json IS NOT DISTINCT FROM excluded.items_json
       AND orders.total_kurus IS NOT DISTINCT FROM excluded.total_kurus
       AND orders.currency IS NOT DISTINCT FROM excluded.currency
     RETURNING total_kurus AS "totalKurus"`,
    [order.id, order.customerName, order.email, order.phone, order.address, order.itemsJson, order.totalKurus, order.createdAt]
  );
  if (result.rows.length !== 1) throw new OrderIdempotencyConflictError();
  return result.rows[0].totalKurus;
}

export type PublishAuditRow = {
  eventId: number; productId: string; actorEmail: string; action: string;
  priceKurus: number; approvedStock: number; occurredAt: number;
};

/** Read-only view of the append-only publication audit (newest first). */
export async function listPublishAudit(db: SqlDriver, limit = 20): Promise<PublishAuditRow[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);
  const result = await db.query<PublishAuditRow>(
    `SELECT event_id AS "eventId", product_id AS "productId", actor_email AS "actorEmail", action,
            price_kurus AS "priceKurus", approved_stock AS "approvedStock", occurred_at AS "occurredAt"
       FROM product_publish_audit ORDER BY occurred_at DESC LIMIT $1`,
    [safeLimit],
  );
  return result.rows;
}
