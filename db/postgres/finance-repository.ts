import type { Currency } from "../../lib/money";
import type { AccountInput, CategoryInput, CostInput, CounterpartyInput, EntryInput } from "../../lib/finance-validation";
import { CmsError } from "./cms-repository";
import type { SqlDriver } from "./repository";

/**
 * Finance & pre-accounting (migration 0006).
 * - Every query is scoped by company_id (multi-company ready).
 * - Every write is ONE statement with its audit row (atomic without client transactions).
 * - Master data uses optimistic locking (`version`). Ledger entries are immutable:
 *   corrections are reversal entries; the DB trigger blocks updates and deletes.
 * - Idempotency: (company_id, idempotency_key) is unique; a replay returns the original entry.
 *   A bank/POS reference (external_ref) can be collected only once.
 */
export const DEFAULT_COMPANY = "altindal";

const audit = (entityType: string, action: string, actor: string, now: string, idExpr = "changed.id") => `,
  aud AS (
    INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, detail, created_at)
    SELECT ${actor}, '${action}', '${entityType}', ${idExpr}, to_jsonb(changed.*), ${now} FROM changed RETURNING 1)`;

function pgCode(error: unknown) { return String((error as { code?: string }).code ?? ""); }
async function versionCheck(db: SqlDriver, table: string, id: string, company: string, expected: number): Promise<never> {
  const row = (await db.query<{ version: number }>(`SELECT version FROM ${table} WHERE id = $1 AND company_id = $2`, [id, company])).rows[0];
  if (!row) throw new CmsError("not_found", "Kayıt bulunamadı");
  if (row.version !== expected) throw new CmsError("version_mismatch", `Kayıt başka bir oturumda değişti (sürüm ${row.version}); sayfayı yenileyin`);
  throw new CmsError("invalid_state", "İşlem koşulları sağlanmadı");
}

export async function baseCurrency(db: SqlDriver, company = DEFAULT_COMPANY): Promise<Currency> {
  const row = (await db.query<{ base: Currency }>("SELECT base_currency AS base FROM companies WHERE id = $1", [company])).rows[0];
  if (!row) throw new CmsError("not_found", "Şirket bulunamadı");
  return row.base;
}

// ------------------------------------------------------------ master data

export type AccountRow = { id: string; name: string; kind: string; currency: Currency; archived: boolean; version: number; balanceMinor: number };
export async function listAccounts(db: SqlDriver, company = DEFAULT_COMPANY): Promise<AccountRow[]> {
  return (await db.query<AccountRow>(
    `SELECT a.id, a.name, a.kind, a.currency, a.archived, a.version,
            coalesce((SELECT sum(CASE WHEN e.kind IN ('income','collection') THEN 1 ELSE -1 END * CASE WHEN e.reversal_of IS NULL THEN 1 ELSE -1 END * e.amount_minor)
                        FROM finance_entries e WHERE e.account_id = a.id), 0)::float8 AS "balanceMinor"
       FROM finance_accounts a WHERE a.company_id = $1 ORDER BY a.archived, a.name`, [company])).rows;
}

export async function createAccount(db: SqlDriver, input: AccountInput & { id: string }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    return (await db.query<{ id: string; version: number }>(
      `WITH changed AS (INSERT INTO finance_accounts(id, company_id, name, kind, currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *)${audit("finance_account", "finance.account.create", "$7", "$6")}
       SELECT changed.id, changed.version FROM changed`, [input.id, company, input.name, input.kind, input.currency, now, actor])).rows[0];
  } catch (error) { if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu ad veya kimlikle hesap zaten var"); throw error; }
}

/** Currency cannot change once created (entries depend on it); name and archive flag can. */
export async function updateAccount(db: SqlDriver, id: string, expectedVersion: number, patch: { name: string; archived: boolean }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    const row = (await db.query<{ id: string; version: number }>(
      `WITH changed AS (UPDATE finance_accounts SET name = $4, archived = $5, version = version + 1, updated_at = $6
          WHERE id = $1 AND company_id = $2 AND version = $3 RETURNING *)${audit("finance_account", "finance.account.update", "$7", "$6")}
       SELECT changed.id, changed.version FROM changed`, [id, company, expectedVersion, patch.name, patch.archived, now, actor])).rows[0];
    return row ?? versionCheck(db, "finance_accounts", id, company, expectedVersion);
  } catch (error) { if (error instanceof CmsError) throw error; if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu adla hesap zaten var"); throw error; }
}

export type CategoryRow = { id: string; name: string; direction: "income" | "expense"; archived: boolean; version: number };
export async function listCategories(db: SqlDriver, company = DEFAULT_COMPANY): Promise<CategoryRow[]> {
  return (await db.query<CategoryRow>("SELECT id, name, direction, archived, version FROM finance_categories WHERE company_id = $1 ORDER BY direction, archived, name", [company])).rows;
}
export async function createCategory(db: SqlDriver, input: CategoryInput & { id: string }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    return (await db.query<{ id: string; version: number }>(
      `WITH changed AS (INSERT INTO finance_categories(id, company_id, name, direction, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING *)${audit("finance_category", "finance.category.create", "$6", "$5")}
       SELECT changed.id, changed.version FROM changed`, [input.id, company, input.name, input.direction, now, actor])).rows[0];
  } catch (error) { if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu kategori zaten var"); throw error; }
}

export type CounterpartyRow = { id: string; kind: string; name: string; taxId: string; email: string; phone: string; notes: string; archived: boolean; version: number; receivableMinor: number; payableMinor: number };
/** Cari bakiye (base currency): income − collections = receivable; expense − payments = payable. */
export async function listCounterparties(db: SqlDriver, company = DEFAULT_COMPANY): Promise<CounterpartyRow[]> {
  return (await db.query<CounterpartyRow>(
    `SELECT c.id, c.kind, c.name, c.tax_id AS "taxId", c.email, c.phone, c.notes, c.archived, c.version,
            coalesce(sum(CASE e.kind WHEN 'income' THEN 1 WHEN 'collection' THEN -1 ELSE 0 END * CASE WHEN e.reversal_of IS NULL THEN 1 ELSE -1 END * e.base_amount_minor), 0)::float8 AS "receivableMinor",
            coalesce(sum(CASE e.kind WHEN 'expense' THEN 1 WHEN 'payment' THEN -1 ELSE 0 END * CASE WHEN e.reversal_of IS NULL THEN 1 ELSE -1 END * e.base_amount_minor), 0)::float8 AS "payableMinor"
       FROM counterparties c LEFT JOIN finance_entries e ON e.counterparty_id = c.id
      WHERE c.company_id = $1 GROUP BY c.id ORDER BY c.archived, c.name`, [company])).rows;
}
export async function createCounterparty(db: SqlDriver, input: CounterpartyInput & { id: string }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    return (await db.query<{ id: string; version: number }>(
      `WITH changed AS (INSERT INTO counterparties(id, company_id, kind, name, tax_id, email, phone, notes, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *)${audit("counterparty", "finance.counterparty.create", "$10", "$9")}
       SELECT changed.id, changed.version FROM changed`,
      [input.id, company, input.kind, input.name, input.taxId, input.email, input.phone, input.notes, now, actor])).rows[0];
  } catch (error) { if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu kimlik veya vergi numarasıyla cari zaten var"); throw error; }
}
export async function updateCounterparty(db: SqlDriver, id: string, expectedVersion: number, input: CounterpartyInput & { archived: boolean }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    const row = (await db.query<{ id: string; version: number }>(
      `WITH changed AS (UPDATE counterparties SET kind = $4, name = $5, tax_id = $6, email = $7, phone = $8, notes = $9, archived = $10, version = version + 1, updated_at = $11
          WHERE id = $1 AND company_id = $2 AND version = $3 RETURNING *)${audit("counterparty", "finance.counterparty.update", "$12", "$11")}
       SELECT changed.id, changed.version FROM changed`,
      [id, company, expectedVersion, input.kind, input.name, input.taxId, input.email, input.phone, input.notes, input.archived, now, actor])).rows[0];
    return row ?? versionCheck(db, "counterparties", id, company, expectedVersion);
  } catch (error) { if (error instanceof CmsError) throw error; if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu vergi numarasıyla cari zaten var"); throw error; }
}

// ------------------------------------------------------------ ledger entries

export type EntryRow = {
  id: string; kind: "income" | "expense" | "collection" | "payment"; occurredOn: string; accountId: string; accountName: string;
  categoryId: string | null; categoryName: string | null; counterpartyId: string | null; counterpartyName: string | null; orderId: string | null;
  currency: Currency; amountMinor: number; fxRate: string; fxSource: string; fxDate: string; baseCurrency: Currency; baseAmountMinor: number;
  description: string; externalRef: string; reversalOf: string | null; status: "posted" | "voided"; voidReason: string; createdBy: string; createdAt: number; version: number;
};
const ENTRY_SELECT = `
  SELECT e.id, e.kind, to_char(e.occurred_on, 'YYYY-MM-DD') AS "occurredOn", e.account_id AS "accountId", a.name AS "accountName",
         e.category_id AS "categoryId", c.name AS "categoryName", e.counterparty_id AS "counterpartyId", p.name AS "counterpartyName", e.order_id AS "orderId",
         e.currency, e.amount_minor::float8 AS "amountMinor", e.fx_rate::text AS "fxRate", e.fx_source AS "fxSource", to_char(e.fx_date, 'YYYY-MM-DD') AS "fxDate",
         e.base_currency AS "baseCurrency", e.base_amount_minor::float8 AS "baseAmountMinor", e.description, e.external_ref AS "externalRef",
         e.reversal_of AS "reversalOf", e.status, e.void_reason AS "voidReason", e.created_by AS "createdBy", e.created_at::float8 AS "createdAt", e.version
    FROM finance_entries e
    JOIN finance_accounts a ON a.id = e.account_id
    LEFT JOIN finance_categories c ON c.id = e.category_id
    LEFT JOIN counterparties p ON p.id = e.counterparty_id`;

export async function listEntries(db: SqlDriver, opts: { kinds?: string[]; from?: string; to?: string; orderId?: string; limit?: number } = {}, company = DEFAULT_COMPANY): Promise<EntryRow[]> {
  const params: unknown[] = [company];
  const where = ["e.company_id = $1"];
  if (opts.kinds?.length) { params.push(opts.kinds); where.push(`e.kind = ANY($${params.length}::text[])`); }
  if (opts.from) { params.push(opts.from); where.push(`e.occurred_on >= $${params.length}::date`); }
  if (opts.to) { params.push(opts.to); where.push(`e.occurred_on <= $${params.length}::date`); }
  if (opts.orderId) { params.push(opts.orderId); where.push(`e.order_id = $${params.length}`); }
  params.push(Math.min(Math.max(opts.limit ?? 200, 1), 1000));
  return (await db.query<EntryRow>(`${ENTRY_SELECT} WHERE ${where.join(" AND ")} ORDER BY e.occurred_on DESC, e.created_at DESC LIMIT $${params.length}`, params)).rows;
}

export async function getEntry(db: SqlDriver, id: string, company = DEFAULT_COMPANY) {
  return (await db.query<EntryRow>(`${ENTRY_SELECT} WHERE e.company_id = $1 AND e.id = $2`, [company, id])).rows[0] ?? null;
}

export type ResolvedEntry = EntryInput & { id: string; fxRate: string; fxSource: string; fxDate: string; baseCurrency: Currency; baseAmountMinor: number };

/**
 * Posts an entry. Account currency, category direction and company ownership are
 * enforced inside the same INSERT…SELECT. Replays with the same idempotency key
 * return the original row (`replayed: true`) instead of creating a duplicate.
 */
export async function createEntry(db: SqlDriver, input: ResolvedEntry, actor: string, now: number, company = DEFAULT_COMPANY): Promise<{ id: string; version: number; replayed: boolean }> {
  const direction = input.kind === "income" ? "income" : input.kind === "expense" ? "expense" : null;
  try {
    const row = (await db.query<{ id: string; version: number }>(
      `WITH src AS (
         SELECT a.id AS account_id FROM finance_accounts a
          WHERE a.id = $4 AND a.company_id = $2 AND a.currency = $9 AND NOT a.archived
            AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM finance_categories c WHERE c.id = $5 AND c.company_id = $2 AND NOT c.archived AND c.direction = $21))
            AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM counterparties p WHERE p.id = $6 AND p.company_id = $2 AND NOT p.archived))),
       changed AS (
         INSERT INTO finance_entries(id, company_id, kind, occurred_on, account_id, category_id, counterparty_id, order_id, currency, amount_minor,
                                     fx_rate, fx_source, fx_date, base_currency, base_amount_minor, description, external_ref, idempotency_key, created_by, created_at)
         SELECT $1, $2, $3, $20::date, src.account_id, $5, $6, $7, $9, $10, $11::numeric, $12, $13::date, $14, $15, $16, $17, $18, $19, $8 FROM src
         ON CONFLICT (company_id, idempotency_key) DO NOTHING
         RETURNING *)${audit("finance_entry", `finance.entry.${input.kind}`, "$19", "$8")}
       SELECT changed.id, changed.version FROM changed`,
      [input.id, company, input.kind, input.accountId, input.categoryId ?? null, input.counterpartyId ?? null, input.orderId ?? null, now,
        input.currency, input.amountMinor, input.fxRate, input.fxSource, input.fxDate, input.baseCurrency, input.baseAmountMinor,
        input.description, input.externalRef, input.idempotencyKey, actor, input.occurredOn, direction],
    )).rows[0];
    if (row) return { ...row, replayed: false };
  } catch (error) {
    if (pgCode(error) === "23505") throw new CmsError("conflict", "Bu banka/POS referansıyla aynı türde bir kayıt zaten var (çift kayıt engellendi)");
    if (pgCode(error) === "23503") throw new CmsError("invalid_state", "Bağlı sipariş bulunamadı");
    throw error;
  }
  // Nothing inserted: either an idempotent replay or a failed precondition.
  const existing = (await db.query<{ id: string; version: number; kind: string; amount_minor: string; currency: string; account_id: string }>(
    "SELECT id, version, kind, amount_minor::text, currency, account_id FROM finance_entries WHERE company_id = $1 AND idempotency_key = $2", [company, input.idempotencyKey])).rows[0];
  if (existing) {
    const same = existing.kind === input.kind && Number(existing.amount_minor) === input.amountMinor && existing.currency === input.currency && existing.account_id === input.accountId;
    if (!same) throw new CmsError("conflict", "Bu işlem anahtarı farklı bir kayıt için kullanılmış");
    return { id: existing.id, version: existing.version, replayed: true };
  }
  throw new CmsError("invalid_state", "Hesap bulunamadı, arşivde ya da para birimi uyuşmuyor; kategori yönü veya cari geçersiz");
}

/** Voids an entry by posting a reversal and flagging the original — both in one statement. */
export async function voidEntry(db: SqlDriver, id: string, expectedVersion: number, reason: string, actor: string, now: number, company = DEFAULT_COMPANY) {
  const row = (await db.query<{ id: string; version: number }>(
    `WITH changed AS (
       UPDATE finance_entries SET status = 'voided', voided_at = $4, void_reason = $5, version = version + 1
        WHERE id = $1 AND company_id = $2 AND version = $3 AND status = 'posted' AND reversal_of IS NULL RETURNING *),
     reversal AS (
       INSERT INTO finance_entries(id, company_id, kind, occurred_on, account_id, category_id, counterparty_id, order_id, currency, amount_minor,
                                   fx_rate, fx_source, fx_date, base_currency, base_amount_minor, description, external_ref, idempotency_key, reversal_of, created_by, created_at)
       SELECT $7, company_id, kind, current_date, account_id, category_id, counterparty_id, order_id, currency, amount_minor,
              fx_rate, fx_source, fx_date, base_currency, base_amount_minor, left('İptal: ' || $5, 500), '', 'void:' || id, id, $6, $4 FROM changed
       RETURNING id)${audit("finance_entry", "finance.entry.void", "$6", "$4")}
     SELECT changed.id, changed.version FROM changed`,
    [id, company, expectedVersion, now, reason, actor, crypto.randomUUID()])).rows[0];
  if (row) return row;
  const current = (await db.query<{ version: number; status: string; reversal_of: string | null }>("SELECT version, status, reversal_of FROM finance_entries WHERE id = $1 AND company_id = $2", [id, company])).rows[0];
  if (!current) throw new CmsError("not_found", "Kayıt bulunamadı");
  if (current.reversal_of) throw new CmsError("invalid_state", "Ters kayıt iptal edilemez");
  if (current.status === "voided") throw new CmsError("invalid_state", "Kayıt zaten iptal edilmiş");
  throw new CmsError("version_mismatch", `Kayıt başka bir oturumda değişti (sürüm ${current.version}); sayfayı yenileyin`);
}

// ------------------------------------------------------------ orders ↔ collections

export type OrderBalanceRow = { id: string; customerName: string; status: string; totalMinor: number; collectedMinor: number; outstandingMinor: number; createdAt: number };
/** Order totals are TRY (orders.total_kurus); collections are compared in base currency. */
export async function orderBalances(db: SqlDriver, company = DEFAULT_COMPANY): Promise<OrderBalanceRow[]> {
  return (await db.query<OrderBalanceRow>(
    `SELECT o.id, o.customer_name AS "customerName", o.status, o.total_kurus::float8 AS "totalMinor",
            coalesce(sum(CASE WHEN e.reversal_of IS NULL THEN 1 ELSE -1 END * e.base_amount_minor), 0)::float8 AS "collectedMinor",
            (o.total_kurus - coalesce(sum(CASE WHEN e.reversal_of IS NULL THEN 1 ELSE -1 END * e.base_amount_minor), 0))::float8 AS "outstandingMinor",
            o.created_at::float8 AS "createdAt"
       FROM orders o LEFT JOIN finance_entries e ON e.order_id = o.id AND e.kind = 'collection' AND e.company_id = $1
      GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200`, [company])).rows;
}

// ------------------------------------------------------------ product costs

export type CostRow = { id: string; productId: string; component: string; label: string; currency: Currency; amountMinor: number; fxRate: string; fxSource: string; fxDate: string; baseAmountMinor: number; effectiveFrom: string; archived: boolean; version: number };
export async function listCosts(db: SqlDriver, company = DEFAULT_COMPANY): Promise<CostRow[]> {
  return (await db.query<CostRow>(
    `SELECT id, product_id AS "productId", component, label, currency, amount_minor::float8 AS "amountMinor", fx_rate::text AS "fxRate", fx_source AS "fxSource",
            to_char(fx_date, 'YYYY-MM-DD') AS "fxDate", base_amount_minor::float8 AS "baseAmountMinor", to_char(effective_from, 'YYYY-MM-DD') AS "effectiveFrom", archived, version
       FROM product_cost_components WHERE company_id = $1 ORDER BY product_id, archived, component`, [company])).rows;
}

export async function createCost(db: SqlDriver, input: CostInput & { id: string; fxRate: string; fxSource: string; fxDate: string; baseCurrency: Currency; baseAmountMinor: number }, actor: string, now: number, company = DEFAULT_COMPANY) {
  try {
    return (await db.query<{ id: string; version: number }>(
      `WITH changed AS (
         INSERT INTO product_cost_components(id, company_id, product_id, component, label, currency, amount_minor, fx_rate, fx_source, fx_date, base_currency, base_amount_minor, effective_from, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10::date, $11, $12, $13::date, $14, $15, $15) RETURNING *)${audit("product_cost", "finance.cost.create", "$14", "$15")}
       SELECT changed.id, changed.version FROM changed`,
      [input.id, company, input.productId, input.component, input.label, input.currency, input.amountMinor, input.fxRate, input.fxSource, input.fxDate, input.baseCurrency, input.baseAmountMinor, input.effectiveFrom, actor, now])).rows[0];
  } catch (error) { if (pgCode(error) === "23503") throw new CmsError("invalid_state", "Ürün bulunamadı"); throw error; }
}

export async function archiveCost(db: SqlDriver, id: string, expectedVersion: number, actor: string, now: number, company = DEFAULT_COMPANY) {
  const row = (await db.query<{ id: string; version: number }>(
    `WITH changed AS (UPDATE product_cost_components SET archived = true, version = version + 1, updated_at = $4 WHERE id = $1 AND company_id = $2 AND version = $3 AND NOT archived RETURNING *)${audit("product_cost", "finance.cost.archive", "$5", "$4")}
     SELECT changed.id, changed.version FROM changed`, [id, company, expectedVersion, now, actor])).rows[0];
  return row ?? versionCheck(db, "product_cost_components", id, company, expectedVersion);
}

export type UnitCostRow = { productId: string; productName: string; active: boolean; listPriceMinor: number; unitCostMinor: number; components: number };
/** Unit cost per product = sum of active components already in effect (base currency). */
export async function unitCosts(db: SqlDriver, company = DEFAULT_COMPANY, today?: string): Promise<UnitCostRow[]> {
  return (await db.query<UnitCostRow>(
    `SELECT p.id AS "productId", p.name AS "productName", p.active, p.price_kurus::float8 AS "listPriceMinor",
            coalesce(sum(c.base_amount_minor), 0)::float8 AS "unitCostMinor", count(c.id)::int AS components
       FROM products p
       LEFT JOIN product_cost_components c ON c.product_id = p.id AND c.company_id = $1 AND NOT c.archived AND c.effective_from <= coalesce($2::date, current_date)
      GROUP BY p.id ORDER BY p.name`, [company, today ?? null])).rows;
}
