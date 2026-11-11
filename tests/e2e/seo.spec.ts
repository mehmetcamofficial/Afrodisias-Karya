import { expect, test } from "./fixtures";

test("product page exposes title, canonical and valid Product/Breadcrumb JSON-LD", async ({ page }) => {
  await page.goto("/urun/tin-5l");
  await expect(page).toHaveTitle("5 Litre Mat Teneke · Altın Dal");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/urun\/tin-5l$/);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  const product = data.find((entry: { "@type": string }) => entry["@type"] === "Product");
  expect(product.offers).toMatchObject({ price: "3200.00", priceCurrency: "TRY" });
  expect(product.image).toBeUndefined(); // no truthful photo of the tin exists yet
  expect(data.some((entry: { "@type": string }) => entry["@type"] === "BreadcrumbList")).toBe(true);
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/urun/tin-5l");
});
