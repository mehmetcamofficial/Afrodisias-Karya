import { expect, noHorizontalScroll, test } from "./fixtures";
import type { Page, TestInfo } from "@playwright/test";

/** Visual regression for the catalogue below the /koleksiyon scene: computed layout, real image boxes, screenshots. */

const expectedColumns = (width: number) => (width >= 1100 ? 3 : width > 700 ? 2 : 1);

async function assertCatalogueLayout(page: Page) {
  const width = page.viewportSize()!.width;
  const layout = await page.evaluate(() => {
    const grid = document.querySelector(".collection-series-grid")!;
    const gs = getComputedStyle(grid);
    const section = getComputedStyle(document.querySelector(".collection-series")!);
    const nav = document.querySelector(".collection-category-nav")!;
    const link = nav.querySelector("a")!;
    return {
      display: gs.display,
      columns: gs.gridTemplateColumns.split(" ").filter(Boolean).length,
      padTop: parseFloat(section.paddingTop), padLeft: parseFloat(section.paddingLeft),
      navDisplay: getComputedStyle(nav).display, linkHeight: link.getBoundingClientRect().height, linkRadius: parseFloat(getComputedStyle(link).borderTopLeftRadius),
      cardBg: getComputedStyle(document.querySelector(".collection-series-card")!).backgroundColor,
    };
  });
  expect(layout.display).toBe("grid");
  expect(layout.columns).toBe(expectedColumns(width));
  expect(layout.padTop).toBeGreaterThanOrEqual(40);
  expect(layout.padLeft).toBeGreaterThanOrEqual(18);
  expect(layout.navDisplay).toBe("flex");
  expect(layout.linkHeight).toBeGreaterThanOrEqual(44);
  expect(layout.linkRadius).toBeGreaterThan(10);
  expect(layout.cardBg).not.toBe("rgba(0, 0, 0, 0)");
}

/** Every card's media box has real dimensions and its image is decoded and fills it. */
async function assertCardMedia(page: Page, sectionId: string) {
  const section = page.locator(sectionId);
  await section.scrollIntoViewIfNeeded();
  for (const media of await section.locator(".collection-series-media").all()) {
    await media.scrollIntoViewIfNeeded();
    const box = (await media.boundingBox())!;
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(200);
    const img = media.locator("img");
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    const imgBox = (await img.boundingBox())!;
    expect(imgBox.width).toBeGreaterThanOrEqual(box.width * 0.95);
    expect(imgBox.height).toBeGreaterThanOrEqual(box.height * 0.95);
  }
}

async function shoot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot(), contentType: "image/png" });
}

test.describe("collection catalogue below the scene", () => {
  test("series use the styled grid with real image boxes, first section and further down", async ({ page, health }, testInfo) => {
    void health;
    await page.goto("/koleksiyon");
    await assertCatalogueLayout(page);
    await page.locator("#seri-glass").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "instant" }));
    await assertCardMedia(page, "#seri-glass");
    await shoot(page, testInfo, "first-series");
    await page.locator("#seri-pantry").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "instant" }));
    await assertCardMedia(page, "#seri-pantry");
    await shoot(page, testInfo, "further-down");
    await noHorizontalScroll(page);
  });

  test("the catalogue anchor lands on the threshold, with the stage's rail out of view", async ({ page }, testInfo) => {
    await page.goto("/koleksiyon");
    await page.getByRole("link", { name: /Serileri keşfet/ }).click();
    await expect(page).toHaveURL(/#koleksiyonlar$/);
    await expect.poll(() => page.locator("#koleksiyonlar").evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 5000 }).toBeLessThanOrEqual(2);
    await expect(page.locator(".cscene-nav")).not.toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Koleksiyon serileri" })).toBeInViewport();
    await shoot(page, testInfo, "threshold");
    // Category links land on their series below the fixed header.
    await page.getByRole("navigation", { name: "Koleksiyon serileri" }).getByRole("link", { name: /Aile boyları/ }).click();
    await expect(page).toHaveURL(/#seri-tin$/);
    await expect.poll(() => page.locator("#seri-tin").evaluate((el) => el.getBoundingClientRect().top), { timeout: 5000 }).toBeGreaterThanOrEqual(60);
    await expect(page.locator("#seri-tin h2")).toBeInViewport();
  });

  test("a deep link to a series still lands on it after hydration (no layout jump from the scene)", async ({ page }) => {
    await page.goto("/koleksiyon#seri-tin");
    await expect(page.locator(".cscene")).toHaveAttribute("class", /is-(scroll|static)/); // hydrated
    // The site scrolls smoothly to fragments (~2 s over the scene); the page height never changes meanwhile.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await expect.poll(() => page.locator("#seri-tin").evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThan(200);
    expect(await page.locator("#seri-tin").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
  });

  test("styles hold after a client-side route change into /koleksiyon", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "load" });
    const menu = page.locator(".brand-menu");
    await expect(async () => {
      if (await menu.isVisible()) {
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
      }
      await page.locator('#primary-navigation > a[href="/koleksiyon"]').click({ timeout: 2000 });
      await expect(page).toHaveURL(/\/koleksiyon$/, { timeout: 5000 });
    }).toPass({ timeout: 30_000 });
    // PageTransition (AnimatePresence mode="wait") briefly renders the new route inside the exiting wrapper;
    // wait until only the settled wrapper remains before measuring.
    // Generous timeouts: on a cold dev server the first client-side /koleksiyon render compiles on demand.
    await expect(page.locator(".route-transition")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(".route-transition")).toHaveCSS("opacity", "1", { timeout: 15_000 });
    await assertCatalogueLayout(page);
    await page.locator("#seri-tin").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "instant" }));
    await assertCardMedia(page, "#seri-tin");
    await shoot(page, testInfo, "after-route-change");
  });
});
