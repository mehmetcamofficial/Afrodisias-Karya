import { expect, noHorizontalScroll, test } from "./fixtures";

const CORE_PAGES = ["/", "/magaza", "/koleksiyon", "/urun/glass-500", "/urun/tin-5l", "/hikayemiz", "/hasat", "/deneyim", "/gunluk", "/gunluk/soguk-sikim-polifenol-degeri", "/olive-club", "/corporate-gifts", "/traceability/26-004"];

for (const path of CORE_PAGES) {
  test(`${path} renders without errors or horizontal scroll`, async ({ page, health }) => {
    void health;
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await noHorizontalScroll(page);
  });
}

test("every primary navigation link is clickable and lands on its page", async ({ page, health }) => {
  void health;
  await page.goto("/", { waitUntil: "networkidle" });
  const menuButton = page.locator(".brand-menu");
  const hrefs = await page.locator("#primary-navigation a").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(hrefs).toEqual(["/hikayemiz", "/hasat", "/gunluk", "/koleksiyon", "/deneyim", "/magaza"]);
  for (const href of hrefs) {
    await page.goto("/", { waitUntil: "networkidle" });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    }
    await page.locator(`#primary-navigation a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("public header does not advertise the admin area; footer keeps a discreet link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#primary-navigation a[href="/admin"]')).toHaveCount(0);
  await expect(page.locator('.brand-footer a[href="/admin"]')).toHaveCount(1);
});

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveClass(/skip-link/);
  await expect(page.locator("main#main")).toHaveCount(1);
});
