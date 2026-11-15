import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { isLocalTestDatabase } = await import("../../db/postgres/driver");

describe("local test driver gate", () => {
  const local = "postgres://u:p@127.0.0.1:55432/altindal_e2e";
  it("needs the explicit flag, a localhost host and a non-Vercel runtime", () => {
    expect(isLocalTestDatabase(local, { LOCAL_PG_DRIVER: "1" })).toBe(true);
    expect(isLocalTestDatabase(local, {})).toBe(false);
    expect(isLocalTestDatabase(local, { LOCAL_PG_DRIVER: "1", VERCEL: "1" })).toBe(false);
    expect(isLocalTestDatabase("postgres://u:p@ep-x.neon.tech/altindal", { LOCAL_PG_DRIVER: "1" })).toBe(false);
    expect(isLocalTestDatabase("postgres://u:p@127.0.0.1.evil.example/db", { LOCAL_PG_DRIVER: "1" })).toBe(false);
    expect(isLocalTestDatabase("postgres://u:p@localhost:5432/db?host=evil", { LOCAL_PG_DRIVER: "1" })).toBe(false);
  });
});
