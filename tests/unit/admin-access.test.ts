import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminAllowlist } from "../../lib/admin-access";

describe("admin allowlist", () => {
  it("fails closed when unset or empty", () => {
    expect(isAdminEmail("owner@example.com", parseAdminAllowlist(undefined))).toBe(false);
    expect(isAdminEmail("owner@example.com", parseAdminAllowlist("  "))).toBe(false);
  });
  it("matches case-insensitively across separators", () => {
    const list = parseAdminAllowlist("Owner@Example.com, ops@example.com;\nshop@example.com");
    expect(isAdminEmail("owner@example.com", list)).toBe(true);
    expect(isAdminEmail("OPS@example.com", list)).toBe(true);
    expect(isAdminEmail("shop@example.com", list)).toBe(true);
    expect(isAdminEmail("stranger@example.com", list)).toBe(false);
  });
  it("rejects missing e-mail and ignores junk entries", () => {
    const list = parseAdminAllowlist("not-an-email, ,");
    expect(list.size).toBe(0);
    expect(isAdminEmail(null, list)).toBe(false);
  });
});
