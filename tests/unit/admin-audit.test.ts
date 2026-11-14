import { describe, expect, it, vi } from "vitest";
import { listPublishAudit, type SqlDriver } from "../../db/postgres/repository";

describe("publish audit read model", () => {
  it("is a bounded, parameterised, read-only query", async () => {
    const query = vi.fn<(sql: string, params?: readonly unknown[]) => Promise<{ rows: never[]; rowCount: number }>>(async () => ({ rows: [], rowCount: 0 }));
    const driver = { query } as unknown as SqlDriver;
    await listPublishAudit(driver, 5000);
    await listPublishAudit(driver, -3);
    const [sql, params] = query.mock.calls[0];
    expect(sql.trim().startsWith("SELECT")).toBe(true);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i);
    expect(sql).toContain("LIMIT $1");
    expect(params).toEqual([100]);
    expect(query.mock.calls[1][1]).toEqual([1]);
  });
});
