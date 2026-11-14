import { expect, test } from "./fixtures";

test("homepage uses each photograph only once and labels drawings", async ({ page, health }) => {
  void health;
  await page.goto("/", { waitUntil: "networkidle" });
  const sources = await page.locator("main img").evaluateAll((images) =>
    images.map((image) => decodeURIComponent((image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src)).map((src) => src.match(/\/[\w/-]+\.webp/)?.[0] ?? src),
  );
  const photos = sources.filter((src) => !src.includes("/products/illustrations/"));
  expect(photos.length).toBeGreaterThan(0);
  expect(new Set(photos).size, `duplicate photos: ${photos.join(", ")}`).toBe(photos.length);
  for (const section of ["Marka hikâyesi", "Koleksiyonlar", "Zeytinlik", "Üretim", "Olive Club", "Altın Dal Günlüğü"]) {
    await expect(page.locator(".eyebrow", { hasText: section }).first()).toBeAttached();
  }
  await expect(page.locator(".collection-tile.is-illustration .illustration-badge")).toHaveCount(2);
  await expect(page.locator(".home-club-status")).toContainText("henüz başvuru alınmıyor");
});

test("store category filter is driven by and written to the URL", async ({ page }) => {
  await page.goto("/magaza?kategori=tin", { waitUntil: "networkidle" });
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.locator('.category-pills [aria-pressed="true"]')).toContainText("Teneke");
  await page.locator(".category-pills button", { hasText: "Tümü" }).click();
  await expect(page).toHaveURL(/\/magaza$/);
  await page.locator(".category-pills button", { hasText: "Yan Ürünler" }).click();
  await expect(page).toHaveURL(/kategori=pantry/);
});

test("product page zoom dialog is keyboard accessible", async ({ page }) => {
  await page.goto("/urun/tin-5l", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Görseli büyüt" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "5 Litre Mat Teneke görseli" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Büyütülmüş görseli kapat" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("product page shows packaging, unverified packaging and distinct related items", async ({ page }) => {
  await page.goto("/urun/tin-5l", { waitUntil: "networkidle" });
  await expect(page.locator(".product-details")).toContainText("Mat teneke");
  await expect(page.locator(".product-details")).toContainText("Temsili çizim");
  const related = await page.locator(".product-related img").evaluateAll((images) => images.map((image) => decodeURIComponent((image as HTMLImageElement).src).match(/\/[\w/-]+\.webp/)?.[0]));
  expect(related.every(Boolean)).toBe(true);
  expect(new Set(related).size).toBe(related.length);
  await page.goto("/urun/green-olive", { waitUntil: "networkidle" });
  await expect(page.locator(".product-details")).toContainText("Ambalaj bilgisi doğrulanıyor");
});

test("journal lists published posts only; drafts are 404 and absent from the sitemap", async ({ page, request }) => {
  await page.goto("/gunluk", { waitUntil: "networkidle" });
  await expect(page.locator(".journal-featured")).toBeVisible();
  await expect(page.getByText("Zeytinyağlı Kereviz")).toHaveCount(0);
  expect((await request.get("/gunluk/zeytinyagli-kereviz")).status()).toBe(404);
  expect((await request.get("/gunluk/uretim")).status()).toBe(200);
  expect((await request.get("/gunluk/marka")).status()).toBe(200);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/gunluk/soguk-sikim-polifenol-degeri");
  expect(sitemap).not.toContain("zeytinyagli-kereviz");
  await page.goto("/gunluk/soguk-sikim-polifenol-degeri", { waitUntil: "networkidle" });
  await expect(page.locator(".article-page header")).toContainText("dk okuma");
  await expect(page.locator(".article-related .journal-card").first()).toBeVisible();
});
