import { baseCurrency, listAccounts, listEntries, orderBalances } from "../db/postgres/finance-repository";
import type { SqlDriver } from "../db/postgres/repository";
import { profitAndLoss } from "./money";

const isDate = (v: string | null | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

/** Period report from real ledger rows only. No data → zeros and empty lists (never sample numbers). */
export async function loadFinanceReport(db: SqlDriver, from?: string | null, to?: string | null) {
  const period = { from: isDate(from) ? from : null, to: isDate(to) ? to : null };
  const [currency, entries, accounts, orders] = await Promise.all([
    baseCurrency(db), listEntries(db, { from: period.from ?? undefined, to: period.to ?? undefined, limit: 1000 }), listAccounts(db), orderBalances(db),
  ]);
  const pl = profitAndLoss(entries.map((e) => ({ kind: e.kind, baseAmountMinor: e.baseAmountMinor, isReversal: e.reversalOf !== null, categoryId: e.categoryId, categoryName: e.categoryName })));
  return { baseCurrency: currency, period, entryCount: entries.length, truncated: entries.length >= 1000, pl, accounts, orders };
}
