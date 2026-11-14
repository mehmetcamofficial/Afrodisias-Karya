import { clearCart, expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => { await clearCart(page); });

test("5 L tin shows its own tin illustration, never a bottle photo; glass sizes disclose the range photo", async ({ page }) => {
  await page.goto("/urun/tin-5l");
  const image = page.locator(".product-page-image img");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute("src", /tin-5l\.webp/);
  await expect(image).toHaveAttribute("alt", /5 litrelik .*temsili çizim/);
  await expect(page.locator(".product-image-note")).toContainText("Temsili ambalaj çizimi");
  await page.goto("/urun/glass-500");
  await expect(page.locator(".product-image-note")).toContainText("serisini");
});

test("unverified packaging images are clearly disclosed on product cards", async ({ page }) => {
  await page.goto("/magaza");
  const tin = page.locator(".product-card", { hasText: "5 Litre Mat Teneke" });
  await expect(tin.locator("img")).toHaveAttribute("src", /tin-5l\.webp/);
  await expect(tin.locator(".product-card-image-disclosure")).toContainText("Temsili ambalaj");
  const tin3 = page.locator(".product-card", { hasText: "3 Litre Mat Teneke" });
  await expect(tin3.locator("img")).toHaveAttribute("src", /tin-3l\.webp/);
  const glass = page.locator(".product-card", { hasText: "500 ml Cam Şişe" });
  await expect(glass.locator(".product-card-image-disclosure")).toContainText("ürün serisini");
});

test("cart totals, quantity updates, Escape and persistence", async ({ page }) => {
  await page.goto("/urun/glass-500", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Adedi artır" }).click();
  await page.getByRole("button", { name: /Sepete ekle/ }).click();
  const cart = page.getByRole("dialog", { name: "Sepetiniz" });
  await expect(cart).toBeVisible();
  await expect(cart.locator(".cart-total strong")).toHaveText("₺1.780");
  await cart.getByRole("button", { name: "Adedi artır" }).click();
  await expect(cart.locator(".cart-total strong")).toHaveText("₺2.670");
  await page.keyboard.press("Escape");
  await expect(cart).toBeHidden();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".brand-bag").click();
  await expect(cart.locator(".cart-row")).toHaveCount(1);
  await expect(cart.locator(".cart-total strong")).toHaveText("₺2.670");
});

test("non-TRY display discloses the TRY amount that will be recorded", async ({ page }) => {
  await page.goto("/magaza", { waitUntil: "networkidle" });
  await page.locator(".shop-selects select").nth(1).selectOption("EUR");
  await page.locator(".product-card", { hasText: "5 Litre" }).getByRole("button", { name: /Sepete ekle/ }).click();
  await expect(page.locator(".cart-currency-note")).toContainText("₺3.200");
});

async function fillCheckout(page: import("@playwright/test").Page) {
  await page.goto("/urun/glass-250", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Sepete ekle/ }).click();
  await page.getByRole("button", { name: "Teslimat bilgilerine geç" }).click();
  await page.getByLabel("Ad soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("E-posta").fill("ayse@example.com");
  await page.getByLabel("Telefon").fill("0532 123 45 67");
  await page.getByLabel("Teslimat adresi").fill("Ataeymir, Karacasu");
}

test("checkout sends ids and quantities only, with an idempotency key", async ({ page }) => {
  let body: { items?: Array<Record<string, unknown>> } = {};
  let key: string | undefined;
  await page.route("**/api/orders", async (route) => {
    body = route.request().postDataJSON();
    key = route.request().headers()["idempotency-key"];
    await route.fulfill({ json: { ok: true, id: "AD-TEST00000001", totalKurus: 55000, currency: "TRY" } });
  });
  await fillCheckout(page);
  await page.getByRole("button", { name: "Siparişi güvenle oluştur" }).click();
  await expect(page.getByRole("status")).toContainText("AD-TEST00000001");
  expect(body.items).toEqual([{ id: "glass-250", qty: 1 }]);
  expect(key).toMatch(/^[0-9a-f-]{36}$/);
});

test("checkout failure keeps the cart and reuses the idempotency key on retry", async ({ page, health }) => {
  health.allow(/500|Failed to load resource/);
  const keys: string[] = [];
  let attempt = 0;
  await page.route("**/api/orders", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    attempt += 1;
    if (attempt === 1) await route.abort("failed");
    else await route.fulfill({ status: 500, json: { error: "Sunucu hatası" } });
  });
  await fillCheckout(page);
  await page.getByRole("button", { name: "Siparişi güvenle oluştur" }).click();
  await expect(page.getByRole("alert")).toContainText("Bağlantı sorunu");
  await page.getByRole("button", { name: "Siparişi güvenle oluştur" }).click();
  await expect(page.getByRole("alert")).toContainText("Sunucu hatası");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  expect(keys[0]).toBe(keys[1]);
});

test("server validation errors are shown on the matching fields", async ({ page }) => {
  await page.route("**/api/orders", (route) => route.fulfill({ status: 422, json: { error: "Sipariş bilgileri doğrulanamadı", errors: [{ field: "email", code: "invalid" }] } }));
  await fillCheckout(page);
  await page.getByRole("button", { name: "Siparişi güvenle oluştur" }).click();
  await expect(page.getByLabel("E-posta")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#email-error")).toBeVisible();
});
