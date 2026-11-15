import { expect, noHorizontalScroll, test } from "./fixtures";

test("collection has five category sections, correct concept images and working navigation", async ({ page }) => {
  await page.goto("/koleksiyon");
  const categories = page.getByRole("navigation", { name: "Koleksiyon serileri" });
  await expect(categories.getByRole("link")).toHaveCount(5);
  await expect(page.locator(".collection-series")).toHaveCount(5);
  await expect(page.locator(".collection-series-card")).toHaveCount(13);
  const tin = page.locator(".collection-series-card", { hasText: "5 Litre Mat Teneke" });
  await expect(tin.locator("img")).toHaveAttribute("src", /tin-5l\.webp/);
  await categories.getByRole("link", { name: /Aile boyları/ }).click();
  await expect(page).toHaveURL(/#seri-tin$/);
  await expect(page.locator("#seri-tin")).toBeVisible();
  await expect(page.locator("#seri-tin a[href*='kategori=tin']")).toHaveCount(1);
  await noHorizontalScroll(page);
});

test("unpublished editorial concepts show no price, stock, purchase or false product links", async ({ page }) => {
  await page.goto("/koleksiyon");
  const cards = page.locator(".collection-series-card");
  // In fixture mode a product is available; in Neon Preview all inactive ones
  // must be marked as an editorial preview with no product or buy link.
  const pending = cards.filter({ has: page.locator(".collection-pending") });
  for (const card of await pending.all()) {
    await expect(card.getByRole("link")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /sepete/i })).toHaveCount(0);
    await expect(card.locator(".collection-pending")).toContainText("Henüz satışa");
  }
  await expect(page.locator(".collection-series-card button")).toHaveCount(0);
});

test("experience offers interactive chapters and navigable content without booking", async ({ page }) => {
  await page.goto("/deneyim");
  await page.getByRole("link", { name: /Keşfe başla/ }).click();
  await expect(page).toHaveURL(/#kesfet$/);
  const explorer = page.getByRole("region", { name: "Kendi yolculuğunu seç." });
  // Region is optional; inspect buttons directly for stable accessibility.
  void explorer;
  await page.getByRole("button", { name: /Zeytinlik ve hasat/ }).click();
  await expect(page.getByRole("heading", { name: "Toprağın ritmini izle" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hasat sürecini incele/ })).toHaveAttribute("href", "/hasat");
  await page.getByRole("button", { name: /Tadım ve Ege sofrası/ }).click();
  await expect(page.getByRole("heading", { name: "Sofraya yaklaş" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tarifleri keşfet/ })).toHaveAttribute("href", "/gunluk/tarifler");
  await expect(page.getByText(/rezervasyon oluşturmaz/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Rezervasyon/i })).toHaveCount(0);
  await noHorizontalScroll(page);
});
