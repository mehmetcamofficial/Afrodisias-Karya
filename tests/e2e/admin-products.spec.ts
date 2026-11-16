import type { Page } from "@playwright/test";
import { e2eAdminCollections, e2eAdminProducts } from "../../lib/e2e-admin-fixtures";
import { expect, noHorizontalScroll, test } from "./fixtures";

/**
 * Faz 13C admin product CMS — UI acceptance against the fixture harness (/e2e/urun-yonetimi,
 * test build only). The API is mocked here; server-side RBAC, audit, version checks and the
 * database policy are covered by tests/unit/product-cms-api.test.ts and tests/integration/*.
 */
type Call = { method: string; url: string; body: unknown };

async function mockApi(page: Page) {
  const calls: Call[] = [];
  await page.route("**/api/admin/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postData() && (req.headers()["content-type"] ?? "").includes("json") ? req.postDataJSON() : req.postData() ? "<form-data>" : undefined;
    calls.push({ method: req.method(), url: url.pathname, body });
    const detail = url.pathname.match(/^\/api\/admin\/cms\/products\/([^/]+)$/);
    if (req.method() === "GET" && detail) {
      const product = e2eAdminProducts.find((p) => p.id === detail[1]);
      return route.fulfill({ json: { product, revisions: [{ version: product!.version, actorEmail: "owner@example.test", createdAt: 0, snapshot: {} }], audit: [] } });
    }
    if (req.method() === "GET" && url.pathname === "/api/admin/cms/products") return route.fulfill({ json: e2eAdminProducts });
    if (req.method() === "GET" && url.pathname === "/api/admin/cms/collections") return route.fulfill({ json: { collections: e2eAdminCollections } });
    return route.fulfill({ json: { ok: true } });
  });
  return calls;
}

const openProduct = async (page: Page, name: string) => {
  // Retry until hydration has attached the click handler (dev server).
  await expect(async () => {
    await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "Aç" }).click();
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
};

test("draft product: readiness lists every missing condition; concept can never be approved; owner approves the exact saved price", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/e2e/urun-yonetimi", { waitUntil: "networkidle" });
  await expect(page.getByRole("row", { name: /Test Taslak Ürün/ })).toContainText("7 eksik");
  await expect(page.getByRole("row", { name: /Test Hazır Ürün/ })).toContainText("Hazır");
  await openProduct(page, "Test Taslak Ürün");

  const readiness = page.getByRole("region", { name: "Yayına hazırlık" });
  await expect(readiness).toContainText("7 koşul eksik");
  for (const label of ["SKU", "ambalaj tipi", "TL fiyatının ticari onayı", "EUR fiyatının ticari onayı", "stok", "Türkçe ad ve açıklama", "onaylı gerçek ürün fotoğrafı"]) {
    await expect(readiness.locator("li.is-missing", { hasText: label })).toHaveCount(1);
  }
  await expect(readiness.locator("li", { hasText: "USD fiyatının" })).toHaveCount(0); // no USD price → nothing to approve

  const prices = page.getByRole("region", { name: "Fiyatlar ve ticari onay" });
  await expect(prices.locator('tr[data-currency="USD"]')).toContainText("Satış yok");
  await expect(prices.locator('tr[data-currency="TRY"]')).toContainText("Onay bekliyor");
  // Editing the price disables approval until the change is saved.
  await page.getByLabel("TL fiyatı (taban)").fill("1100");
  await expect(prices.getByRole("button", { name: /₺1\.000 onayla/ })).toBeDisabled();
  await page.getByLabel("TL fiyatı (taban)").fill("1000");
  await prices.getByRole("button", { name: /₺1\.000 onayla/ }).click();
  await expect.poll(() => calls.find((c) => c.url.endsWith("/prices"))?.body).toEqual({ action: "approve", currency: "TRY", amountMinor: 100000, expectedVersion: 3 });

  const media = page.getByRole("region", { name: "Ürün görselleri" });
  const concept = media.locator('li[data-truth="concept"]');
  await expect(concept).toContainText("AI konsept tasarım");
  await expect(concept.getByRole("button", { name: /onayla/i })).toHaveCount(0);
  const photo = media.locator('li[data-truth="photo"]');
  await expect(photo).toContainText("Onay bekliyor");
  await photo.getByRole("button", { name: "Gerçek görsel olarak onayla" }).click();
  await expect.poll(() => calls.find((c) => c.url.endsWith("/m-e2e-photo/approval"))?.body).toEqual({ approve: true });
  // Linking a repo path cannot be declared a real photo.
  await media.getByText("Sitedeki görseli bağla").click();
  await expect(media.getByLabel("Görsel türü").locator("option", { hasText: "Gerçek ürün fotoğrafı" })).toHaveCount(0);
});

test("TR/EN content tabs; collection membership goes through the collection API with its version", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/e2e/urun-yonetimi", { waitUntil: "networkidle" });
  await openProduct(page, "Test Hazır Ürün");
  await expect(page.getByRole("region", { name: "Yayına hazırlık" })).toContainText("Tüm koşullar sağlandı");
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue("Test Hazır Ürün");
  await page.getByRole("tab", { name: "English" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Test Ready Product");
  await expect(page.getByLabel("Ad", { exact: true })).toBeHidden();
  const collections = page.getByRole("region", { name: "Koleksiyonlar" });
  await collections.getByLabel(/Test Koleksiyonu/).click(); // controlled: state comes back from the server
  await expect.poll(() => calls.find((c) => c.method === "PUT")).toEqual({ method: "PUT", url: "/api/admin/cms/collections/e2e-koleksiyon/products", body: { expectedVersion: 2, productIds: [] } });
  // Approved + ready: publish is offered behind the typed confirmation.
  const publish = page.getByRole("button", { name: "Yayımla" });
  await expect(publish).toBeDisabled();
  await page.getByLabel(/YAYINLA:e2e-hazir/).fill("YAYINLA:e2e-hazir");
  await expect(publish).toBeEnabled();
});

test("editor: can manage media but sees no price/photo approval and no publish", async ({ page }) => {
  await mockApi(page);
  await page.goto("/e2e/urun-yonetimi?role=editor", { waitUntil: "networkidle" });
  await openProduct(page, "Test Taslak Ürün");
  const prices = page.getByRole("region", { name: "Fiyatlar ve ticari onay" });
  await expect(prices.getByRole("button", { name: /onayla/ })).toHaveCount(0);
  await expect(prices).toContainText("Yalnızca yetkili sahip onaylar");
  const media = page.getByRole("region", { name: "Ürün görselleri" });
  await expect(media.getByRole("button", { name: "Gerçek görsel olarak onayla" })).toHaveCount(0);
  await expect(media.getByRole("button", { name: /kaldır/i }).first()).toBeVisible();
  await expect(media.getByRole("button", { name: "Yükle" })).toBeVisible();
});

test("viewer: read-only — no write, approval or upload controls", async ({ page }) => {
  await mockApi(page);
  await page.goto("/e2e/urun-yonetimi?role=viewer", { waitUntil: "networkidle" });
  await openProduct(page, "Test Taslak Ürün");
  await expect(page.getByRole("button", { name: /Kaydet|kaydet/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /onayla|Yükle|Kaldır/ })).toHaveCount(0);
  await expect(page.getByLabel("SKU yayın için zorunlu")).toBeDisabled();
});

test("mobile admin: the editor fits the screen and every panel is reachable", async ({ page }) => {
  await mockApi(page);
  await page.goto("/e2e/urun-yonetimi", { waitUntil: "networkidle" });
  await openProduct(page, "Test Taslak Ürün");
  for (const name of ["Yayına hazırlık", "Fiyatlar ve ticari onay", "Ürün görselleri", "Koleksiyonlar"]) {
    const region = page.getByRole("region", { name });
    await region.scrollIntoViewIfNeeded();
    await expect(region).toBeVisible();
    const box = (await region.boundingBox())!;
    expect(box.x + box.width, `${name} fits the viewport`).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await noHorizontalScroll(page);
});
