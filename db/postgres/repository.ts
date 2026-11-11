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
    'SELECT id,name,type,size,note,price_kurus AS "priceKurus",stock,active FROM products WHERE active=true ORDER BY name'
  );
  return result.rows;
}

export async function upsertProduct(db: SqlDriver, product: ProductRow, updatedAt: number): Promise<void> {
  await db.query(
    `INSERT INTO products(id,name,type,size,note,price_kurus,stock,active,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,true,$8)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,
       size=excluded.size,note=excluded.note,price_kurus=excluded.price_kurus,
       stock=excluded.stock,updated_at=excluded.updated_at`,
    [product.id, product.name, product.type, product.size, product.note, product.priceKurus, product.stock, updatedAt]
  );
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

export async function createPendingOrder(db: SqlDriver, order: NewOrder): Promise<number> {
  // Idempotency must return the original stored amount, never the retry payload.
  await db.query(
    `INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,status,payment_provider,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,'payment_pending','iyzico',$8)
     ON CONFLICT(id) DO NOTHING`,
    [order.id, order.customerName, order.email, order.phone, order.address, order.itemsJson, order.totalKurus, order.createdAt]
  );
  const stored = await db.query<{ totalKurus: number }>(
    'SELECT total_kurus AS "totalKurus" FROM orders WHERE id=$1',
    [order.id]
  );
  if (stored.rows.length !== 1) throw new Error('Order persistence failed');
  return stored.rows[0].totalKurus;
}
