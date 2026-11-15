import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listAllProducts, listOrders, listPublishAudit, type OrderRow, type ProductRow, type PublishAuditRow } from "../db/postgres/repository";

export type AdminSnapshot = {
  products: ProductRow[] | null;
  orders: OrderRow[] | null;
  audit: PublishAuditRow[] | null;
  /** Human-readable reasons; never contains connection strings or secrets. */
  problems: string[];
};

/**
 * Loads admin data without crashing the page when the database (or the
 * audit migration) is unavailable. A `null` field means "unknown", which
 * the UI must show as unavailable — never as zero.
 */
export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  const problems: string[] = [];
  let db;
  try {
    db = requirePostgres();
  } catch {
    return { products: null, orders: null, audit: null, problems: ["Veritabanı bağlantısı yapılandırılmamış (DATABASE_URL yok)."] };
  }
  const [products, orders, audit] = await Promise.allSettled([listAllProducts(db), listOrders(db), listPublishAudit(db, 20)]);
  if (products.status === "rejected") problems.push("Ürün kataloğu okunamadı.");
  if (orders.status === "rejected") problems.push("Sipariş kayıtları okunamadı.");
  if (audit.status === "rejected") problems.push("Yayın denetim kaydı okunamadı (0002_publish_audit migration'ı bu veritabanında uygulanmamış olabilir).");
  return {
    products: products.status === "fulfilled" ? products.value : null,
    orders: orders.status === "fulfilled" ? orders.value : null,
    audit: audit.status === "fulfilled" ? audit.value : null,
    problems,
  };
}

export { adminEnvironment, type AdminEnvironment } from "./admin-environment";
