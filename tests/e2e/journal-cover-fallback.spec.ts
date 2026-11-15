import { expect, test } from "@playwright/test";

/** External cover photos (Wikimedia) can fail; the card must show the brand's typographic cover, not alt text. */
test("journal covers fall back to the typographic cover when an external photo fails", async ({ page }) => {
  await page.route(/upload\.wikimedia\.org|commons\.wikimedia\.org/, (route) => route.abort());
  await page.goto("/gunluk");
  const covers = page.locator(".journal-cover");
  await expect(covers.first()).toBeVisible();
  // Every cover shows either a decoded photo or the graphic; no failed <img> remains visible.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".journal-cover img")].filter((img) => {
    const el = img as HTMLImageElement; return el.complete && el.naturalWidth === 0;
  }).length), { timeout: 15_000 }).toBe(0);
  await expect(page.locator(".journal-cover .journal-cover-graphic").first()).toBeVisible();
  // Local editorial photos still render as photos.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".journal-cover img")].some((img) => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
});
