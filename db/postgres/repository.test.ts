import { describe, expect, it, vi } from "vitest";
import { createPendingOrder, OrderIdempotencyConflictError, listAllProducts, listProducts, publishReviewedProduct, setOrderStatus, upsertProduct, type SqlDriver } from "./repository";

describe("PostgreSQL repository contract", () => {
  it("uses bound parameters for product writes", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [], rowCount: 1 }));
    const driver = { query } as unknown as SqlDriver;
    await upsertProduct(driver, { id: "p1", name: "'); DROP TABLE orders;--", type: "oil", size: "5L", note: "", priceKurus: 100, stock: 1, active: true }, 123);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).not.toContain("DROP TABLE");
    expect(query.mock.calls[0][1]).toContain("'); DROP TABLE orders;--");
  });

  it("preserves inactive draft state on product upsert", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [], rowCount: 1 }));
    await upsertProduct({ query } as unknown as SqlDriver, {
      id: "draft-1", name: "Draft", type: "glass", size: "250 ml", note: "",
      priceKurus: 12300, stock: 0, active: false,
    }, 456);
    expect(query.mock.calls[0][0]).toContain("active=excluded.active");
    expect(query.mock.calls[0][1]).toContain(false);
  });

  it("allows admins to read drafts separately from the public inventory", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [], rowCount: 0 }));
    const driver = { query } as unknown as SqlDriver;
    await listAllProducts(driver);
    expect(query.mock.calls[0][0]).not.toContain("WHERE active=true");
    await listProducts(driver);
    expect(query.mock.calls[1][0]).toContain("WHERE active=true");
  });

  it("publishes only a reviewed inactive product with the expected price", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) =>
      ({ rows: [{ id: "glass-250" }], rowCount: 1 }));
    const result = await publishReviewedProduct({ query } as unknown as SqlDriver,
      { id: "glass-250", expectedPriceKurus: 55000, approvedStock: 4, actorUserId: "user_1", actorEmail: "a@example.test" }, 1234);
    expect(result).toBe(true);
    expect(query.mock.calls[0][0]).toContain("active=false AND price_kurus=$2");
    expect(query.mock.calls[0][0]).toContain("INSERT INTO product_publish_audit");
    expect(query.mock.calls[0][1]).toEqual(["glass-250", 55000, 4, 1234, "user_1", "a@example.test"]);
  });

  it("rejects publication when reviewed price or draft state no longer matches", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) =>
      ({ rows: [], rowCount: 0 }));
    expect(await publishReviewedProduct({ query } as unknown as SqlDriver,
      { id: "glass-250", expectedPriceKurus: 55000, approvedStock: 4, actorUserId: "user_1", actorEmail: "a@example.test" }, 1234)).toBe(false);
  });

  it("propagates audit insertion failures so no publication is acknowledged", async () => {
    const failure = new Error("audit relation missing");
    const query = vi.fn(async () => { throw failure; });
    await expect(publishReviewedProduct({ query } as unknown as SqlDriver,
      { id: "glass-250", expectedPriceKurus: 55000, approvedStock: 4,
        actorUserId: "user_1", actorEmail: "a@example.test" }, 1234)).rejects.toBe(failure);
    expect(query).toHaveBeenCalledOnce();
  });

  it("returns the original amount from a single atomic statement", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [{ totalKurus: 9900 }], rowCount: 1 }));
    const amount = await createPendingOrder({ query } as unknown as SqlDriver, {
      id: "same-key", customerName: "A", email: "a@example.com", phone: "", address: "",
      itemsJson: "[]", totalKurus: 9900, createdAt: 123,
    });
    expect(amount).toBe(9900);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain("ON CONFLICT(id) DO UPDATE");
    expect(query.mock.calls[0][0]).toContain("IS NOT DISTINCT FROM");
  });

  it("rejects conflicting payloads when atomic upsert returns no row", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    await expect(createPendingOrder({ query } as unknown as SqlDriver, {
      id: "same-key", customerName: "B", email: "a@example.com", phone: "", address: "",
      itemsJson: "[]", totalKurus: 9900, createdAt: 456,
    })).rejects.toBeInstanceOf(OrderIdempotencyConflictError);
    expect(query).toHaveBeenCalledOnce();
  });

  it("propagates database failures without a second read", async () => {
    const failure = new Error("database unavailable");
    const query = vi.fn(async () => { throw failure; });
    await expect(createPendingOrder({ query } as unknown as SqlDriver, {
      id: "failure", customerName: "A", email: "a@example.com", phone: "", address: "",
      itemsJson: "[]", totalKurus: 9900, createdAt: 123,
    })).rejects.toBe(failure);
    expect(query).toHaveBeenCalledOnce();
  });

  it("reports absent orders without inventing success", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [], rowCount: 0 }));
    expect(await setOrderStatus({ query } as unknown as SqlDriver, "missing", "shipped")).toBe(false);
  });

  it("reads only active products", async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [], rowCount: 0 }));
    await listProducts({ query } as unknown as SqlDriver);
    expect(query.mock.calls[0][0]).toContain("WHERE active=true");
  });
});
