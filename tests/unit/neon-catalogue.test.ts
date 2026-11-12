import { describe, expect, it } from "vitest";
import { hydrateProducts } from "../../lib/live-products";
import { validateOrder } from "../../lib/orders";
import type { ProductRow } from "../../db/postgres/repository";

const row: ProductRow = {
  id: "tin-5l", name: "5 Litre Mat Teneke", type: "tin", size: "5 L",
  note: "Preview test", priceKurus: 490000, stock: 0, active: true,
};

describe("Neon catalogue is authoritative", () => {
  it("never falls back to demo products for an empty table", () => {
    expect(hydrateProducts([])).toEqual([]);
  });
  it("uses Neon TRY price and stock instead of checked-in demo data", () => {
    const [p] = hydrateProducts([row]);
    expect(p.prices.TRY).toBe(4900);
    expect(p.stock).toBe(0);
    expect(p.category).toBe("tin");
    expect(p.image).toBeUndefined(); // A tin must not silently display a glass bottle.
  });
  it("does not allow an order when the stock has not been approved", () => {
    const inventory = hydrateProducts([row]);
    const validation = validateOrder({
      customerName: "Example", email: "example@example.com", phone: "05321234567",
      address: "Test address", items: [{ id: row.id, qty: 1 }],
    }, inventory);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors).toContainEqual({
      field: "items.tin-5l", code: "insufficient_stock",
    });
  });
  it("rejects a product missing from the database even when in demo catalogue", () => {
    const validation = validateOrder({
      customerName: "Example", email: "example@example.com", phone: "05321234567",
      address: "Test address", items: [{ id: "glass-250", qty: 1 }],
    }, []);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors).toContainEqual({
      field: "items.glass-250", code: "unknown_product",
    });
  });
});
