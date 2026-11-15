import { expect, noHorizontalScroll, test } from "./fixtures";

// Uses the E2E-only fixture content (lib/showcase-fixtures.ts), compiled only into the Vite test build.

test.describe("CMS collections (TR/EN)", () => {
  test("collection index lists published CMS collections next to the curated series", async ({ page }) => {
    await page.goto("/koleksiyon");
    const curated = page.getByRole("region", { name: "Seçkiler" });
    await expect(curated.getByRole("link", { name: "Test Hediye Seçkisi" })).toHaveAttribute("href", "/koleksiyon/test-hediye-seckisi");
    await expect(page.locator(".collection-series")).toHaveCount(5); // owner's curated series untouched
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/collection$/);
    await noHorizontalScroll(page);
  });

  test("collection detail shows products in CMS order with photo, volume, status and price, and filters", async ({ page }) => {
    await page.goto("/koleksiyon/test-hediye-seckisi");
    await expect(page.getByRole("heading", { level: 1, name: "Test Hediye Seçkisi" })).toBeVisible();
    const items = page.locator(".cms-collection-products > li");
    await expect(items.locator("h3")).toHaveText(["Tadım & Aromatik Set", "750 ml Cam Şişe", "Olive Club"]);
    const set = items.filter({ hasText: "Tadım & Aromatik Set" });
    await expect(set.locator("img")).toHaveAttribute("src", /aromatic-set\.webp/); // photo matches product
    await expect(set).toContainText("3 x 100 ml");
    await expect(set.locator(".cms-collection-status")).toContainText(/Satışta|Tükendi/);
    await expect(set.getByRole("link", { name: /Ürün detayı/ })).toHaveAttribute("href", "/urun/aromatic-set");
    await page.getByRole("link", { name: /Satışta olanlar/ }).click();
    await expect(page).toHaveURL(/durum=satista/);
    await expect(page.getByRole("link", { name: /Satışta olanlar/ })).toHaveAttribute("aria-current", "page");
    await noHorizontalScroll(page);
  });

  test("English collection page uses the EN slug, EN copy and links back to Turkish", async ({ page }) => {
    await page.goto("/en/collection/test-gift-edit");
    await expect(page.getByRole("heading", { level: 1, name: "Test Gift Edit" })).toBeVisible();
    await expect(page.locator("[lang=en]").first()).toBeVisible();
    await expect(page.getByText("Product details").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Türkçe" })).toHaveAttribute("href", "/koleksiyon/test-hediye-seckisi");
    await page.goto("/en/collection");
    await expect(page.getByRole("link", { name: "Test Gift Edit" })).toHaveAttribute("href", "/en/collection/test-gift-edit");
  });

  test("unknown or unpublished slugs return 404", async ({ page }) => {
    expect((await page.goto("/koleksiyon/olmayan-koleksiyon"))?.status()).toBe(404);
    expect((await page.goto("/en/collection/test-hediye-seckisi"))?.status()).toBe(404); // TR slug is not an EN slug
  });
});

test.describe("CMS experience sections (TR/EN)", () => {
  test("renders sections with lazy video (poster, no autoplay, preload none), image, safe body and related links", async ({ page }) => {
    await page.goto("/deneyim");
    const section = page.getByRole("region", { name: "Test Hasat Bölümü" });
    await expect(section).toBeVisible();
    const video = section.locator("video");
    await expect(video).toHaveAttribute("poster", "/hero-tetrapylon-grove.webp");
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).toHaveAttribute("aria-label", "Test hasat videosu");
    expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
    await expect(section.locator("img")).toHaveAttribute("loading", "lazy");
    // XSS: the <script> in the body is shown as text and never executed.
    await expect(section.getByText("<script>window.__xss = 1</script>", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(section.locator("strong")).toHaveText("Kalın");
    await expect(section.getByRole("link", { name: "Test Hediye Seçkisi" })).toHaveAttribute("href", "/koleksiyon/test-hediye-seckisi");
    await expect(section.getByRole("link", { name: "500 ml Cam Şişe" })).toHaveAttribute("href", "/urun/glass-500");
    // Owner's explorer still present and no booking offered.
    await expect(page.getByRole("button", { name: /Rezervasyon/i })).toHaveCount(0);
    await noHorizontalScroll(page);
  });

  test("video source attaches only when scrolled near", async ({ page }) => {
    await page.goto("/deneyim");
    const video = page.locator(".cms-experience video").first();
    await video.scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute("data-loaded", "true");
    await expect(video.locator("source")).toHaveAttribute("src", "/e2e-missing-video.mp4");
  });

  test("English experience page shows only EN-translated sections", async ({ page }) => {
    await page.goto("/en/experience");
    await expect(page.getByRole("heading", { name: "Test Harvest Section" })).toBeVisible();
    await expect(page.getByText("Harvest", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Türkçe" })).toHaveAttribute("href", "/deneyim");
    await noHorizontalScroll(page);
  });
});
