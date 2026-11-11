import { describe, expect, it, vi } from "vitest";
import { createPendingOrder, listProducts, setOrderStatus, upsertProduct, type SqlDriver } from "./repository";

describe("PostgreSQL repository contract", () => {
  it("uses bound parameters for product writes", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 1 }));
    const driver = { query } as unknown as SqlDriver;
    await upsertProduct(driver, { id: "p1", name: "'); DROP TABLE orders;--", type: "oil", size: "5L", note: "", priceKurus: 100, stock: 1, active: true }, 123);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).not.toContain("DROP TABLE");
    expect(query.mock.calls[0][1]).toContain("'); DROP TABLE orders;--");
  });

  it("returns the stored total on an idempotent order retry", async () => {
    const query = vi.fn(async (sql: string) => sql.startsWith("SELECT")
      ? { rows: [{ totalKurus: 9900 }], rowCount: 1 }
      : { rows: [], rowCount: 0 });
    const amount = await createPendingOrder({ query } as unknown as SqlDriver, {
      id: "same-key", customerName: "A", email: "a@example.com", phone: "", address: "",
      itemsJson: "[]", totalKurus: 1, createdAt: 123,
    });
    expect(amount).toBe(9900);
    expect(query.mock.calls[0][0]).toContain("ON CONFLICT(id) DO NOTHING");
  });

  it("reports absent orders without inventing success", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    expect(await setOrderStatus({ query } as unknown as SqlDriver, "missing", "shipped")).toBe(false);
  });

  it("reads only active products", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    await listProducts({ query } as unknown as SqlDriver);
    expect(query.mock.calls[0][0]).toContain("WHERE active=true");
  });
});
