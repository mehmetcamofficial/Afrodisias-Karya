import { describe, expect, it } from "vitest";
import { MAX_QTY_PER_LINE, orderIdFor, validateOrder } from "../../lib/orders";
import { products } from "../../lib/products";

const customer = { customerName: "Ayşe Yılmaz", email: "Ayse@Example.com", phone: "0532 123 45 67", address: "Ataeymir, Karacasu / Aydın" };
const tin5 = products.find((p) => p.id === "tin-5l")!;

describe("validateOrder", () => {
  it("prices lines from the catalogue and ignores client prices", () => {
    const result = validateOrder({ ...customer, items: [{ id: "tin-5l", qty: 2, priceKurus: 1, name: "fake" }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.items).toEqual([{ id: "tin-5l", name: tin5.name, size: tin5.size, qty: 2, unitKurus: 320000, lineKurus: 640000 }]);
    expect(result.order.totalKurus).toBe(640000);
    expect(result.order.email).toBe("ayse@example.com");
  });

  it("totals multiple lines correctly", () => {
    const result = validateOrder({ ...customer, items: [{ id: "glass-250", qty: 3 }, { id: "glass-500", qty: 1 }] });
    expect(result.ok && result.order.totalKurus).toBe(3 * 55000 + 89000);
  });

  it.each([0, -1, 1.5, "2", null])("rejects quantity %s", (qty) => {
    const result = validateOrder({ ...customer, items: [{ id: "glass-500", qty }] });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown products", () => {
    const result = validateOrder({ ...customer, items: [{ id: "does-not-exist", qty: 1 }] });
    expect(!result.ok && result.errors).toContainEqual({ field: "items.does-not-exist", code: "unknown_product" });
  });

  it("merges duplicate lines before enforcing limits", () => {
    const result = validateOrder({ ...customer, items: [{ id: "glass-500", qty: MAX_QTY_PER_LINE }, { id: "glass-500", qty: 1 }] });
    expect(!result.ok && result.errors).toContainEqual({ field: "items.glass-500", code: "quantity_limit" });
  });

  it("enforces catalogue stock", () => {
    const lowStock = [{ ...tin5, stock: 2 }];
    const result = validateOrder({ ...customer, items: [{ id: "tin-5l", qty: 3 }] }, lowStock);
    expect(!result.ok && result.errors).toContainEqual({ field: "items.tin-5l", code: "insufficient_stock" });
  });

  it("validates contact fields", () => {
    const result = validateOrder({ customerName: " ", email: "nope", phone: "12", address: "", items: [{ id: "glass-500", qty: 1 }] });
    expect(!result.ok && result.errors.map((e) => e.field).sort()).toEqual(["address", "customerName", "email", "phone"]);
  });

  it("rejects empty or non-object bodies", () => {
    expect(validateOrder(null).ok).toBe(false);
    expect(validateOrder({ ...customer, items: [] }).ok).toBe(false);
  });
});

describe("orderIdFor", () => {
  it("is stable for the same idempotency key", () => {
    const key = "3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b";
    expect(orderIdFor(key)).toBe(orderIdFor(key));
    expect(orderIdFor(key)).toBe("AD-3F2B8C1E9A4D");
  });
  it("ignores malformed keys and falls back to a random id", () => {
    expect(orderIdFor("not-a-uuid", () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")).toBe("AD-AAAAAAAABBBB");
  });
});
