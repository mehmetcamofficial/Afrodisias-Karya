import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminAllowlist } from "./admin-access";

describe("admin RBAC fail-closed policy", () => {
  it("denies every identity without ADMIN_EMAILS", () => {
    expect(isAdminEmail("owner@example.com", parseAdminAllowlist(undefined))).toBe(false);
    expect(isAdminEmail("owner@example.com", parseAdminAllowlist(""))).toBe(false);
  });

  it("allows only explicit configured emails, case-insensitively", () => {
    const allowed = parseAdminAllowlist("Owner@Example.com; ops@example.com");
    expect(isAdminEmail("owner@example.com", allowed)).toBe(true);
    expect(isAdminEmail("OPS@example.com", allowed)).toBe(true);
    expect(isAdminEmail("other@example.com", allowed)).toBe(false);
  });

  it("rejects suffix and substring impersonation", () => {
    const allowed = parseAdminAllowlist("owner@example.com");
    expect(isAdminEmail("owner@example.com.attacker.test", allowed)).toBe(false);
    expect(isAdminEmail("fakeowner@example.com", allowed)).toBe(false);
    expect(isAdminEmail(null, allowed)).toBe(false);
  });
});
