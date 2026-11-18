import { expect, test } from "./fixtures";

/**
 * Faz 13D: one catalogue → the same product reads the same everywhere. In the local test build the
 * fixture catalogue is published (live); the all-preview state is checked on the real Preview
 * (tests/preview), where no product is published.
 */
test("glass-500: name, size, image and price agree across home, collection, store and product page", async ({ page }) => {
  const pageOf = async (path: string) => { await page.goto(path, { waitUntil: "networkidle" }); };

  await pageOf("/");
  const home = page.locator(".home-vitrine-item", { hasText: "500 ml Cam Şişe" });
  await expect(home.locator("b")).toHaveText("500 ml Cam Şişe");
  await expect(home.locator("small")).toContainText("500 ml");
  await expect(home.locator(".home-vitrine-price")).toHaveText("₺890");
  await expect(home.locator("a")).toHaveAttribute("href", "/urun/glass-500");

  await pageOf("/koleksiyon");
  const card = page.locator('#seri-glass .collection-series-card', { hasText: "500 ml Cam Şişe" });
  await expect(card).toHaveAttribute("data-state", "live");
  await expect(card.locator("small")).toContainText("500 ml · Satışta");
  await expect(card.getByRole("link", { name: /Ürün detayını incele/ })).toHaveAttribute("href", "/urun/glass-500");
  const collectionImg = await card.locator("img").getAttribute("src");

  await pageOf("/magaza");
  const store = page.locator(".product-card", { hasText: "500 ml Cam Şişe" });
  await expect(store.locator("footer strong")).toContainText("₺890");
  expect(decodeURIComponent((await store.locator("img").getAttribute("src"))!)).toContain(decodeURIComponent(collectionImg!).match(/altin-dal-bottle-collection\.webp/)![0]);

  await pageOf("/urun/glass-500");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("500 ml Cam Şişe");
  await expect(page.locator(".product-purchase strong").first()).toContainText("₺890");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)).toEqual(expect.arrayContaining([expect.objectContaining({ "@type": "Product", name: "500 ml Cam Şişe", offers: expect.objectContaining({ price: "890.00", priceCurrency: "TRY" }) })]));
});

test("journal product links resolve (no 404) and the sitemap lists only published product pages", async ({ page, request }) => {
  await page.goto("/gunluk", { waitUntil: "networkidle" });
  const posts = await page.locator('a[href^="/gunluk/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))].filter((h) => h.split("/").length === 3));
  let checked = 0;
  for (const href of posts.slice(0, 8)) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    for (const link of await page.locator(".article-products a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      expect((await request.get(link.split("#")[0])).status(), `${href} → ${link}`).toBe(200);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(0);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const urls = [...sitemap.matchAll(/\/urun\/([a-z0-9-]+)/g)].map((m) => m[1]);
  expect(urls.length).toBeGreaterThan(0);
  for (const id of urls) expect((await request.get(`/urun/${id}`)).status(), id).toBe(200);
});
