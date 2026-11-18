import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

/**
 * A REAL Clerk session (Development instance) for a verified account that is NOT in ADMIN_EMAILS and
 * has no admin_users role. Every admin page and API must refuse it server-side, and nothing may change.
 */
const outsider = process.env.CLERK_TEST_OUTSIDER_EMAIL!;

test("a signed-in Clerk user outside ADMIN_EMAILS is refused by /admin/urunler and every admin API", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/admin/giris");
  await clerk.loaded({ page });
  await clerk.signIn({ page, signInParams: { strategy: "email_code", identifier: outsider } });

  // The page renders the server-side denial, never product data.
  await page.goto("/admin/urunler");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bu alana erişim yetkiniz yok");
  await expect(page.locator(".cms-list, .admin-data-table")).toHaveCount(0);

  // Same session cookies for the API: every admin endpoint answers 403 (authenticated, not authorised).
  const api = page.request;
  const calls: Array<[string, Promise<{ status(): number }>]> = [
    ["GET products", api.get("/api/admin/cms/products")],
    ["GET product", api.get("/api/admin/cms/products/glass-500")],
    ["PATCH product", api.patch("/api/admin/cms/products/glass-500", { data: { expectedVersion: 1 } })],
    ["POST action", api.post("/api/admin/cms/products/glass-500/actions", { data: { action: "submit", expectedVersion: 1 } })],
    ["POST price approval", api.post("/api/admin/cms/products/glass-500/prices", { data: { action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 } })],
    ["POST media", api.post("/api/admin/cms/products/glass-500/media", { data: { url: "/x.webp", truth: "concept", altTr: "x" } })],
    ["POST media approval", api.post("/api/admin/cms/media/m-1/approval", { data: { approve: true } })],
    ["GET users", api.get("/api/admin/cms/users")],
    ["POST users (self-promotion)", api.post("/api/admin/cms/users", { data: { email: outsider, role: "editor" } })],
    ["GET audit", api.get("/api/admin/cms/audit")],
    ["GET collections", api.get("/api/admin/cms/collections")],
    ["GET legacy products", api.get("/api/admin/products")],
    ["POST legacy publish", api.post("/api/admin/products/publish", { data: { id: "glass-500", expectedPriceKurus: 89000, approvedStock: 1, confirmation: "YAYINLA:glass-500" } })],
    ["GET orders", api.get("/api/orders")],
  ];
  for (const [name, pending] of calls) {
    const status = (await pending).status();
    console.log(`outsider ${name}: ${status}`);
    expect(status, name).toBe(403);
  }

  // Signed out, the same calls are anonymous (401) — the session, not a header, carried the identity.
  await clerk.signOut({ page });
  expect((await page.request.get("/api/admin/cms/products")).status()).toBe(401);
});
