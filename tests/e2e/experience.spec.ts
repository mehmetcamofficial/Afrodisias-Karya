import { expect, test, type Page } from "@playwright/test";

async function openNavIfCollapsed(page: Page) {
  const burger = page.getByRole("button", { name: "Menüyü aç veya kapat" });
  if (await burger.isVisible()) await expect(async () => { await burger.click(); await expect(page.locator("#primary-navigation.open")).toBeVisible({ timeout: 1000 }); }).toPass({ timeout: 30_000 });
}

test.describe("immersive navigation and store", () => {
  test("megamenu opens with keyboard, links to real store filters and closes with Escape", async ({ page }) => {
    await page.goto("/");
    await openNavIfCollapsed(page);
    const toggle = page.getByRole("button", { name: "Mağaza alt menüsü" });
    await expect(async () => { await toggle.click(); await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 }); }).toPass({ timeout: 30_000 });
    const panel = page.locator("#menu-magaza");
    await expect(panel.getByRole("link", { name: "Tüm ürünler" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Koleksiyonlar" })).toHaveAttribute("href", "/koleksiyon");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("store search and sort live in the URL and survive reload", async ({ page }) => {
    await page.goto("/magaza?q=teneke");
    const search = page.getByRole("textbox", { name: "Ürün ara" });
    await expect(search).toHaveValue("teneke");
    await expect(page.locator(".shop-grid article, .product-card").first()).toBeVisible();
    await expect(async () => { await search.fill("cam"); await expect(page).toHaveURL(/q=cam/, { timeout: 1000 }); }).toPass({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Ürün ara" })).toHaveValue("cam");
  });

  test("product page offers real size siblings", async ({ page }) => {
    await page.goto("/urun/glass-500");
    const sizes = page.getByRole("navigation", { name: "Boy seçenekleri" });
    await expect(sizes.locator("[aria-current=page]")).toHaveText("500 ml");
    await sizes.getByRole("link", { name: "750 ml" }).click();
    await expect(page).toHaveURL(/\/urun\/glass-750$/);
  });

  test("reduced motion disables the scroll parallax", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const motion = await page.locator(".home-vitrine-media img").first().evaluate((img) => ({ animation: getComputedStyle(img).animationName, transition: parseFloat(getComputedStyle(img).transitionDuration) }));
    expect(motion.animation).toBe("none");
    expect(motion.transition).toBeLessThan(0.001); // effectively off
    await context.close();
  });
});
