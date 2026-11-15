/**
 * Money and FX helpers. All amounts are integer minor units (kuruş / cent).
 * Conversion uses BigInt and a fixed 6-decimal rate so no floating-point error
 * reaches stored amounts. Rounding: half away from zero (to the nearest minor unit).
 */
export const CURRENCIES = ["TRY", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const MINOR_DIGITS: Record<Currency, number> = { TRY: 2, EUR: 2, USD: 2 };
export const RATE_DECIMALS = 6;
const RATE_SCALE = BigInt(10) ** BigInt(RATE_DECIMALS);

/** "1.234,56", "5.000", "1234.56" or "1234,5" → minor units. Rejects negatives, zero, >2 decimals and garbage. */
export function parseMajor(input: string): number | null {
  const raw = input.trim().replace(/\s/g, "");
  if (!raw) return null;
  // Turkish style "1.234,56": dots group thousands, comma is the decimal mark.
  // "5.000" / "1.234.567" (groups of exactly three after a non-zero lead) are thousands too.
  // Anything else with a dot ("1234.5") is a dot decimal.
  let normalised: string;
  if (raw.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(raw)) return null;
    normalised = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(raw)) {
    normalised = raw.replace(/\./g, "");
  } else normalised = raw;
  const match = /^(\d{1,13})(?:\.(\d{1,2}))?$/.exec(normalised);
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

/** Validates an FX rate string (max 6 decimals, > 0) and returns it scaled by 1e6. */
export function parseRate(rate: string): bigint | null {
  const match = /^(\d{1,8})(?:\.(\d{1,6}))?$/.exec(rate.trim());
  if (!match) return null;
  const scaled = BigInt(match[1]) * RATE_SCALE + BigInt((match[2] ?? "").padEnd(RATE_DECIMALS, "0"));
  return scaled > BigInt(0) ? scaled : null;
}

/** Canonical rate text stored in the database (e.g. "35.250000"). */
export function formatRate(scaled: bigint): string {
  const whole = scaled / RATE_SCALE;
  const frac = (scaled % RATE_SCALE).toString().padStart(RATE_DECIMALS, "0");
  return `${whole}.${frac}`;
}

/** amount (minor, source currency) × rate → minor units of the base currency, rounded half away from zero. */
export function convertMinor(amountMinor: number, rateScaled: bigint): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("amount must be a positive integer");
  const product = BigInt(amountMinor) * rateScaled;
  const result = (product + RATE_SCALE / BigInt(2)) / RATE_SCALE;
  const n = Number(result);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("converted amount out of range");
  return n;
}

export type FxInput = { currency: Currency; amountMinor: number; rate?: string; rateSource?: string; rateDate?: string };
export type FxResolved = { fxRate: string; fxSource: string; fxDate: string; baseAmountMinor: number };

/** Same currency → rate 1 from "base". Foreign currency → caller must give rate, source and date. */
export function resolveFx(input: FxInput, baseCurrency: Currency, occurredOn: string): FxResolved | { error: string } {
  if (input.currency === baseCurrency) return { fxRate: "1.000000", fxSource: "base", fxDate: occurredOn, baseAmountMinor: input.amountMinor };
  const scaled = input.rate ? parseRate(input.rate) : null;
  if (!scaled) return { error: "Döviz kuru zorunlu (en çok 6 ondalık, sıfırdan büyük)" };
  if (!input.rateSource || input.rateSource.trim().length < 2) return { error: "Kur kaynağı zorunlu (ör. TCMB döviz alış)" };
  if (!input.rateDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.rateDate)) return { error: "Kur tarihi zorunlu (YYYY-AA-GG)" };
  return { fxRate: formatRate(scaled), fxSource: input.rateSource.trim(), fxDate: input.rateDate, baseAmountMinor: convertMinor(input.amountMinor, scaled) };
}

export function formatMinor(minor: number, currency: Currency) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 10 ** MINOR_DIGITS[currency]);
}

// ------------------------------------------------------------- P&L (pure)

export type LedgerRow = { kind: "income" | "expense" | "collection" | "payment"; baseAmountMinor: number; isReversal: boolean; categoryId?: string | null; categoryName?: string | null };
export type ProfitAndLoss = {
  incomeMinor: number; expenseMinor: number; netMinor: number; collectionsMinor: number; paymentsMinor: number; cashNetMinor: number;
  byCategory: Array<{ categoryId: string | null; name: string; kind: "income" | "expense"; amountMinor: number }>;
};

/**
 * Profit & loss in base currency. Reversal entries subtract the original amount,
 * so a voided entry nets to zero. Collections/payments are cash movements and do
 * not change P&L (they settle receivables/payables).
 */
export function profitAndLoss(rows: LedgerRow[]): ProfitAndLoss {
  const sum = { income: 0, expense: 0, collection: 0, payment: 0 };
  const categories = new Map<string, { categoryId: string | null; name: string; kind: "income" | "expense"; amountMinor: number }>();
  for (const row of rows) {
    const signed = row.isReversal ? -row.baseAmountMinor : row.baseAmountMinor;
    sum[row.kind] += signed;
    if (row.kind === "income" || row.kind === "expense") {
      const key = `${row.kind}:${row.categoryId ?? "-"}`;
      const current = categories.get(key) ?? { categoryId: row.categoryId ?? null, name: row.categoryName ?? "Kategorisiz", kind: row.kind, amountMinor: 0 };
      current.amountMinor += signed;
      categories.set(key, current);
    }
  }
  return {
    incomeMinor: sum.income, expenseMinor: sum.expense, netMinor: sum.income - sum.expense,
    collectionsMinor: sum.collection, paymentsMinor: sum.payment, cashNetMinor: sum.collection - sum.payment,
    byCategory: [...categories.values()].filter((c) => c.amountMinor !== 0).sort((a, b) => b.amountMinor - a.amountMinor),
  };
}

/** Unit cost and margin for one product (all base currency). */
export function productMargin(unitCostMinor: number, listPriceMinor: number | null) {
  if (!listPriceMinor || listPriceMinor <= 0) return { unitCostMinor, listPriceMinor: null, marginMinor: null, marginPct: null };
  const marginMinor = listPriceMinor - unitCostMinor;
  // Percentage with one decimal, computed in integers (basis points) to avoid float drift.
  const marginBp = Math.round((marginMinor * 10000) / listPriceMinor);
  return { unitCostMinor, listPriceMinor, marginMinor, marginPct: marginBp / 100 };
}
