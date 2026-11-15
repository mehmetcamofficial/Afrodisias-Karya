import { expect, noHorizontalScroll, test } from "./fixtures";
import type { Page } from "@playwright/test";

const step = (page: Page, name: RegExp) => page.getByRole("navigation", { name: "Sahne bölümleri" }).getByRole("button", { name });

async function scrollToBeat(page: Page, fraction: number) {
  await page.evaluate((p) => {
    const track = document.querySelector<HTMLElement>(".cscene-track")!;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * p);
  }, fraction);
}

test.describe("collection scene", () => {
  test("bottle, tin and gift box share one lit set; every layer loads", async ({ page, health }) => {
    void health;
    await page.goto("/koleksiyon");
    await expect(page.locator(".cscene")).toHaveClass(/is-scroll/);
    const world = page.locator(".cscene-world");
    await expect(world.locator(".cscene-station")).toHaveCount(3);
    await expect(world.getByRole("button", { name: "Cam şişeyi incele" })).toBeVisible();
    await expect(world.getByRole("button", { name: "Mat tenekeyi incele" })).toBeVisible();
    await expect(world.getByRole("button", { name: "Hediye kutusunu incele" })).toBeVisible();
    for (const img of await world.locator("img").all()) {
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect(page.getByRole("heading", { level: 1, name: /Bir toprağın/ })).toBeVisible();
    await expect(step(page, /Koleksiyon/)).toHaveAttribute("aria-current", "step");
    await noHorizontalScroll(page);
  });

  test("scrolling moves the camera from product to product, with honest notes", async ({ page }) => {
    await page.goto("/koleksiyon");
    await expect(page.locator(".cscene")).toHaveClass(/is-scroll/);
    const transformAt = () => page.locator(".cscene-world").evaluate((el) => (el as HTMLElement).style.transform);
    const overview = await transformAt();

    await scrollToBeat(page, 0.34);
    await expect(step(page, /Cam şişe/)).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("heading", { level: 2, name: "Premium cam şişe" })).toBeVisible();
    await expect(page.locator(".cscene-note")).toContainText("doğrulanmadı");
    expect(await transformAt()).not.toBe(overview);

    await scrollToBeat(page, 0.65);
    await expect(page.getByRole("heading", { level: 2, name: "Mat teneke" })).toBeVisible();
    await expect(page.locator(".cscene-note")).toContainText("Yapay zekâyla hazırlanmış");

    await scrollToBeat(page, 0.95);
    await expect(page.getByRole("heading", { level: 2, name: "Premium hediye kutusu" })).toBeVisible();
    await expect(page.locator(".cscene-bottle .cscene-product")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".cscene-giftbox .cscene-product")).toHaveAttribute("aria-pressed", "true");
  });

  test("products and the chapter rail are clickable and keyboard operable", async ({ page }) => {
    await page.goto("/koleksiyon");
    await expect(page.locator(".cscene")).toHaveClass(/is-scroll/);
    // Overview: the bottle stands in front of the gift box's transparent corner; the click must reach the bottle.
    await expect(async () => {
      await page.getByRole("button", { name: "Cam şişeyi incele" }).click();
      await expect(step(page, /Cam şişe/)).toHaveAttribute("aria-current", "step", { timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await expect(async () => {
      await page.getByRole("button", { name: "Mat tenekeyi incele" }).click();
      await expect(step(page, /Mat teneke/)).toHaveAttribute("aria-current", "step", { timeout: 3000 });
    }).toPass({ timeout: 20_000 });

    await step(page, /Hediye kutusu/).focus();
    await page.keyboard.press("Enter");
    await expect(step(page, /Hediye kutusu/)).toHaveAttribute("aria-current", "step", { timeout: 5000 });

    // The call to action never points to a missing page: a live product page or the series on this page.
    const cta = page.locator(".cscene-cta");
    const href = (await cta.getAttribute("href"))!;
    expect(href).toMatch(/^(\/urun\/reserve-500|#seri-luxury)$/);
    if (href.startsWith("/urun/")) expect((await page.request.get(href)).status()).toBe(200);
    else await expect(page.locator(href)).toHaveCount(1);
  });

  test("reduced motion keeps a static set; products still switch the detail", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/koleksiyon");
    const scene = page.locator(".cscene");
    await expect(scene).toHaveClass(/is-static/);
    const { track, vh } = await page.evaluate(() => ({ track: document.querySelector<HTMLElement>(".cscene-track")!.offsetHeight, vh: innerHeight }));
    expect(track).toBeLessThanOrEqual(Math.max(vh, 560) + 2); // no tall scroll runway
    await expect(async () => {
      await page.getByRole("button", { name: "Cam şişeyi incele" }).click();
      await expect(page.getByRole("heading", { level: 2, name: "Premium cam şişe" })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5); // switching does not scroll the page
    await noHorizontalScroll(page);
    await context.close();
  });

  test("the series below the scene stay reachable", async ({ page }) => {
    await page.goto("/koleksiyon");
    await page.getByRole("link", { name: /Serileri keşfet/ }).click();
    await expect(page).toHaveURL(/#koleksiyonlar$/);
    await expect(page.getByRole("navigation", { name: "Koleksiyon serileri" })).toBeInViewport();
  });
});
