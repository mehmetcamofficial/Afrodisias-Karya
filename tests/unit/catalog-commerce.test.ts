import { describe, expect, it } from "vitest";
import { hydrateProducts } from "../../lib/catalog-hydration";
import { productInputSchema } from "../../lib/cms-validation";
import { validateOrder } from "../../lib/orders";
import { displayPrice, formatPrice, hasListedPrice, priceFor, sizeSiblings, type Product } from "../../lib/products";
import type { ProductRow } from "../../db/postgres/repository";

const product = (over: Partial<Product> = {}): Product => ({
  id: "p", name: "P", category: "glass", size: "500 ml", note: "", prices: { TRY: 890 }, stock: 5, ...over,
});

describe("prices are never derived by exchange rate (13B.2)", () => {
  it("returns only business-set prices", () => {
    const p = product({ prices: { TRY: 890 } });
    expect(priceFor(p, "TRY")).toBe(890);
    expect(priceFor(p, "EUR")).toBeNull();
    expect(priceFor(p, "USD")).toBeNull();
    expect(hasListedPrice(p, "EUR")).toBe(false);
    // A EUR price never produces a USD price either.
    expect(priceFor(product({ prices: { TRY: 890, EUR: 32 } }), "USD")).toBeNull();
  });
  it("shows the TRY price, flagged, when the selected currency has no set price", () => {
    expect(displayPrice(product(), "EUR")).toEqual({ amount: 890, currency: "TRY", fallback: true });
    expect(formatPrice(product(), "USD")).toBe("₺890");
    expect(displayPrice(product({ prices: { TRY: 890, EUR: 32 } }), "EUR")).toEqual({ amount: 32, currency: "EUR", fallback: false });
    expect(formatPrice(product({ prices: { TRY: 890, USD: 35 } }), "USD")).toBe("$35");
  });
  it("never shows a zero or invented price", () => {
    expect(displayPrice(product({ prices: {} }), "TRY")).toBeNull();
    expect(formatPrice(product({ prices: {} }), "EUR")).toBe("Fiyat belirlenmedi");
    expect(priceFor(product({ prices: { TRY: 0 } }), "TRY")).toBeNull();
  });
});

describe("catalogue hydration takes commercial data only from the database", () => {
  const row = (over: Partial<ProductRow> = {}): ProductRow => ({
    id: "glass-500", name: "500 ml Cam Şişe", type: "glass", size: "500 ml", note: "", priceKurus: 89000, stock: 3, active: true, ...over,
  });
  it("ignores the code catalogue's EUR figure and uses DB EUR/USD only when set", () => {
    const [p] = hydrateProducts([row()]);
    expect(p.prices).toEqual({ TRY: 890 }); // lib/products.ts has EUR 32 for glass-500: not used
    const [q] = hydrateProducts([row({ priceEurCents: 3150, priceUsdCents: 3400 })]);
    expect(q.prices).toEqual({ TRY: 890, EUR: 31.5, USD: 34 });
  });
  it("drafts never reach the storefront; ships_to and size_family come through", () => {
    expect(hydrateProducts([row({ active: false })])).toEqual([]);
    const [p] = hydrateProducts([row({ shipsTo: ["TR"], sizeFamily: "glass-evoo" })]);
    expect(p).toMatchObject({ shipsTo: ["TR"], sizeFamily: "glass-evoo" });
  });
  it("size siblings follow size_family when the database sets it", () => {
    const a = product({ id: "a", sizeFamily: "fam" }), b = product({ id: "b", sizeFamily: "fam" }), c = product({ id: "c", sizeFamily: "other" });
    expect(sizeSiblings(a, [a, b, c]).map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("orders stay TRY-only and TR-only until payment and shipping are live", () => {
  const base = { customerName: "Ad Soyad", email: "a@example.test", phone: "+90 555 000 0000", address: "Adres 1", items: [{ id: "p", qty: 1 }] };
  const catalogue = [product({ prices: { TRY: 890, EUR: 32 } })];
  it("prices in TRY kuruş even when the product has a EUR price", () => {
    const result = validateOrder(base, catalogue);
    expect(result.ok && result.order.totalKurus).toBe(89000);
  });
  it("refuses EUR/USD orders instead of converting", () => {
    for (const currency of ["EUR", "USD", "GBP", 1]) {
      const result = validateOrder({ ...base, currency }, catalogue);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.errors).toContainEqual({ field: "currency", code: "unsupported_currency" });
    }
    expect(validateOrder({ ...base, currency: "TRY" }, catalogue).ok).toBe(true);
  });
  it("defaults delivery to TR and rejects products that do not ship to the country", () => {
    expect(validateOrder(base, catalogue).ok).toBe(true);
    const de = validateOrder({ ...base, country: "DE" }, catalogue);
    expect(!de.ok && de.errors).toContainEqual({ field: "items.p", code: "not_shippable" });
    expect(validateOrder({ ...base, country: "DE" }, [product({ shipsTo: ["TR", "DE"] })]).ok).toBe(true);
    expect(validateOrder({ ...base, country: "germany" }, catalogue).ok).toBe(false);
  });
});

describe("CMS input: base currency is TRY; EUR/USD are optional explicit prices", () => {
  const valid = { category: "glass", size: "500 ml", priceKurus: 89000, stock: 0, tr: { name: "Test" } };
  it("rejects a non-TRY base currency (price_kurus is always TRY)", () => {
    expect(productInputSchema.safeParse({ ...valid, currency: "EUR" }).success).toBe(false);
    expect(productInputSchema.parse(valid)).toMatchObject({ currency: "TRY", priceEurCents: null, priceUsdCents: null, shipsTo: ["TR"], packaging: null });
  });
  it("validates packaging, net amounts, size family and ISO country codes", () => {
    expect(productInputSchema.safeParse({ ...valid, packaging: "bottle" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, netVolumeMl: 0 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, sizeFamily: "Glass 500" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, shipsTo: ["tr"] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, priceEurCents: 3200, packaging: "glass_bottle", netVolumeMl: 500, sizeFamily: "glass-evoo", shipsTo: ["TR"] }).success).toBe(true);
  });
});
