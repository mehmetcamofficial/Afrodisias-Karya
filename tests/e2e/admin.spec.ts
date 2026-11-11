import { expect, test } from "./fixtures";

// Admin APIs must never answer anonymous callers (real server, no mocks).
test("admin APIs reject anonymous requests", async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  expect((await anonymous.get("/api/orders")).status()).toBe(401);
  expect((await anonymous.patch("/api/orders", { data: { id: "x", status: "cancelled" } })).status()).toBe(401);
  expect((await anonymous.post("/api/products", { data: { name: "x", priceKurus: 100 } })).status()).toBe(401);
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
