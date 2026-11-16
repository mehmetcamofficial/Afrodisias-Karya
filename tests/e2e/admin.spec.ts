import { expect, test } from "./fixtures";

// Admin APIs must never answer anonymous callers (real server, no mocks).
test("admin APIs reject anonymous requests", async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  expect((await anonymous.get("/api/orders")).status()).toBe(401);
  expect((await anonymous.patch("/api/orders", { data: { id: "x", status: "cancelled" } })).status()).toBe(401);
  expect((await anonymous.post("/api/products", { data: { name: "x", priceKurus: 100 } })).status()).toBe(401);
  for (const path of ["/api/admin/cms/blog", "/api/admin/cms/users", "/api/admin/cms/audit", "/api/admin/ai/draft", "/api/admin/cms/collections", "/api/admin/cms/experience"]) {
    expect((await anonymous.get(path)).status(), path).toBe(401);
  }
  expect((await anonymous.post("/api/admin/cms/blog/import", { data: { slug: "zeytinyagli-kereviz" } })).status()).toBe(401);
  expect((await anonymous.post("/api/admin/cms/users", { data: { email: "a@b.co", role: "editor" } })).status()).toBe(401);
  expect((await anonymous.post("/api/admin/cms/collections", { data: { slugTr: "x-y", tr: { title: "XSS <script>" } } })).status()).toBe(401);
  expect((await anonymous.put("/api/admin/cms/collections/x/products", { data: { expectedVersion: 1, productIds: [] } })).status()).toBe(401);
  expect((await anonymous.post("/api/admin/cms/experience/x/actions", { data: { action: "publish", expectedVersion: 1, confirmation: "YAYINLA:x" } })).status()).toBe(401);
  // Faz 13C: commercial price approval, media and photo approval are admin-only too.
  expect((await anonymous.post("/api/admin/cms/products/glass-500/prices", { data: { action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 } })).status()).toBe(401);
  expect((await anonymous.post("/api/admin/cms/products/glass-500/media", { data: { url: "/x.webp", truth: "concept", altTr: "x" } })).status()).toBe(401);
  expect((await anonymous.delete("/api/admin/cms/products/glass-500/media/m-1")).status()).toBe(401);
  expect((await anonymous.post("/api/admin/cms/media/m-1/approval", { data: { approve: true } })).status()).toBe(401);
  expect((await anonymous.get("/media/not-an-id")).status()).toBe(404);
  await anonymous.dispose();
});

// Requires the local mock user to be allowlisted (.dev.vars: ADMIN_EMAILS=seedy@sites.test).
test("allowlisted admin sees the full admin navigation", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN, "set E2E_ADMIN=1 with the dev user allowlisted");
  await page.goto("/admin", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Mağaza Yönetimi" })).toBeVisible();
  // Desktop shows the sidebar; small screens show the mobile tab strip instead.
  const nav = page.getByRole("navigation", { name: /^Yönetim navigasyonu/ }).filter({ visible: true });
  await expect(nav).toHaveCount(1);
  for (const label of ["Genel Bakış", "Ürünler", "Siparişler", "QR & Lot", "Blog & Tarifler"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  await nav.getByRole("link", { name: "Siparişler" }).click();
  await expect(page).toHaveURL(/\/admin\/siparisler$/);
});
