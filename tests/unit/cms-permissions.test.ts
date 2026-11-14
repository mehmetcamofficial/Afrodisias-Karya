import { describe, expect, it } from "vitest";
import { can, PERMISSIONS } from "../../lib/cms-permissions";
import { confirmationFor, inquirySchema, productActionSchema, productInputSchema } from "../../lib/cms-validation";

describe("CMS RBAC", () => {
  it("owner can do everything; nobody else can approve, publish, restore, delete or manage users", () => {
    for (const permission of PERMISSIONS) expect(can("owner", permission)).toBe(true);
    for (const role of ["editor", "viewer"] as const) {
      for (const permission of ["product.approve", "product.publish", "product.restore", "product.delete", "blog.publish", "users.manage"] as const) {
        expect(can(role, permission), `${role} ${permission}`).toBe(false);
      }
    }
  });
  it("viewer is read-only and anonymous has nothing", () => {
    expect(PERMISSIONS.filter((permission) => can("viewer", permission))).toEqual(["cms.read"]);
    expect(can(null, "cms.read")).toBe(false);
  });
});

describe("CMS validation", () => {
  const valid = { category: "tin", size: "5 L", priceKurus: 320000, stock: 0, tr: { name: "5 Litre Mat Teneke" } };
  it("accepts a minimal product and applies defaults", () => {
    const parsed = productInputSchema.parse(valid);
    expect(parsed).toMatchObject({ currency: "TRY", tags: [], en: {} });
  });
  it.each([
    [{ ...valid, priceKurus: 0 }], [{ ...valid, priceKurus: 1.5 }], [{ ...valid, stock: -1 }], [{ ...valid, category: "weapons" }],
    [{ ...valid, sku: "lower-case" }], [{ ...valid, id: "Bad Id" }], [{ ...valid, tr: { name: "" } }], [{ ...valid, currency: "GBP" }],
  ])("rejects invalid input %#", (body) => {
    expect(productInputSchema.safeParse(body).success).toBe(false);
  });
  it("publish and delete require an exact typed confirmation phrase", () => {
    expect(confirmationFor("publish", "tin-5l")).toBe("YAYINLA:tin-5l");
    expect(confirmationFor("delete", "tin-5l")).toBe("SIL:tin-5l");
    expect(productActionSchema.safeParse({ action: "drop_table", expectedVersion: 1 }).success).toBe(false);
  });
  it("inquiries need consent and reject the honeypot", () => {
    const base = { name: "A", email: "a@b.co", topic: "product", message: "Merhaba dünya", consent: true };
    expect(inquirySchema.safeParse(base).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, website: "spam.example" }).success).toBe(false);
  });
});
