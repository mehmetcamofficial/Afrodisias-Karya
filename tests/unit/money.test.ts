import { describe, expect, it } from "vitest";
import { convertMinor, formatRate, parseMajor, parseRate, productMargin, profitAndLoss, resolveFx } from "../../lib/money";

describe("money parsing", () => {
  it("parses Turkish and dot decimals into minor units", () => {
    expect(parseMajor("1.234,56")).toBe(123456);
    expect(parseMajor("1234.5")).toBe(123450);
    expect(parseMajor("0,01")).toBe(1);
    expect(parseMajor("12")).toBe(1200);
    expect(parseMajor("5.000")).toBe(500000); // Turkish thousands separator
    expect(parseMajor("1.234.567")).toBe(123456700);
    expect(parseMajor("1.234.567,89")).toBe(123456789);
  });
  it("rejects negatives, zero, 3+ decimals and garbage", () => {
    for (const bad of ["-5", "0", "0,00", "12.3456", "0.001", "1,2,3", "1.23,4", "abc", "", "1e5"]) expect(parseMajor(bad), bad).toBeNull();
  });
});

describe("FX conversion and rounding", () => {
  it("stores the rate canonically with 6 decimals", () => {
    expect(formatRate(parseRate("35.25")!)).toBe("35.250000");
    expect(parseRate("0")).toBeNull();
    expect(parseRate("1.1234567")).toBeNull();
  });
  it("converts with integer arithmetic and rounds half away from zero", () => {
    expect(convertMinor(10000, parseRate("35.25")!)).toBe(352500); // 100.00 EUR → 3525.00 TRY
    expect(convertMinor(1, parseRate("0.5")!)).toBe(1); // 0.5 → 1 (half away from zero)
    expect(convertMinor(3, parseRate("0.5")!)).toBe(2); // 1.5 → 2
    expect(convertMinor(1001, parseRate("1.0005")!)).toBe(1002); // 1001.5005 → 1002
    // A conversion that rounds to zero is rejected instead of storing a 0 amount.
    expect(() => convertMinor(1, parseRate("0.499999")!)).toThrow();
  });
  it("never produces float drift on large values", () => {
    expect(convertMinor(999_999_999_99, parseRate("38.123456")!)).toBe(Number((BigInt(99_999_999_999) * BigInt(38_123_456) + BigInt(500_000)) / BigInt(1_000_000)));
  });
  it("base currency uses rate 1 from 'base'; foreign needs rate, source and date", () => {
    expect(resolveFx({ currency: "TRY", amountMinor: 500 }, "TRY", "2026-11-15")).toEqual({ fxRate: "1.000000", fxSource: "base", fxDate: "2026-11-15", baseAmountMinor: 500 });
    expect(resolveFx({ currency: "EUR", amountMinor: 500 }, "TRY", "2026-11-15")).toHaveProperty("error");
    expect(resolveFx({ currency: "EUR", amountMinor: 500, rate: "35.1", rateSource: "" , rateDate: "2026-11-15" }, "TRY", "2026-11-15")).toHaveProperty("error");
    expect(resolveFx({ currency: "USD", amountMinor: 1999, rate: "32.987654", rateSource: "TCMB döviz alış", rateDate: "2026-11-14" }, "TRY", "2026-11-15"))
      .toEqual({ fxRate: "32.987654", fxSource: "TCMB döviz alış", fxDate: "2026-11-14", baseAmountMinor: 65942 }); // 19.99 × 32.987654 = 659.42
  });
});

describe("profit and loss", () => {
  it("nets reversals to zero and keeps cash movements out of P&L", () => {
    const pl = profitAndLoss([
      { kind: "income", baseAmountMinor: 100000, isReversal: false, categoryId: "sales", categoryName: "Satış" },
      { kind: "expense", baseAmountMinor: 30000, isReversal: false, categoryId: "packaging", categoryName: "Ambalaj" },
      { kind: "expense", baseAmountMinor: 5000, isReversal: false, categoryId: "packaging", categoryName: "Ambalaj" },
      { kind: "expense", baseAmountMinor: 5000, isReversal: true, categoryId: "packaging", categoryName: "Ambalaj" }, // void
      { kind: "collection", baseAmountMinor: 80000, isReversal: false },
      { kind: "payment", baseAmountMinor: 20000, isReversal: false },
    ]);
    expect(pl).toMatchObject({ incomeMinor: 100000, expenseMinor: 30000, netMinor: 70000, collectionsMinor: 80000, paymentsMinor: 20000, cashNetMinor: 60000 });
    expect(pl.byCategory).toEqual([
      { categoryId: "sales", name: "Satış", kind: "income", amountMinor: 100000 },
      { categoryId: "packaging", name: "Ambalaj", kind: "expense", amountMinor: 30000 },
    ]);
  });
  it("empty ledger is all zeros (no invented figures)", () => {
    expect(profitAndLoss([])).toMatchObject({ incomeMinor: 0, expenseMinor: 0, netMinor: 0, byCategory: [] });
  });
  it("margin uses integer basis points", () => {
    expect(productMargin(33333, 100000)).toEqual({ unitCostMinor: 33333, listPriceMinor: 100000, marginMinor: 66667, marginPct: 66.67 });
    expect(productMargin(500, null).marginPct).toBeNull();
  });
});
