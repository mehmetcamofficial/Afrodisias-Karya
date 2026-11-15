import { expect, test } from "./fixtures";

/**
 * Site-wide visual smoke (issue #6). For every public route at every project width it asserts
 * layout facts rather than text presence, and attaches top / middle / bottom screenshots.
 */
const ROUTES = [
  "/", "/magaza", "/koleksiyon", "/urun/glass-500", "/urun/tin-5l", "/hikayemiz", "/hasat", "/deneyim",
  "/gunluk", "/gunluk/tarifler", "/gunluk/soguk-sikim-polifenol-degeri", "/olive-club", "/corporate-gifts",
  "/traceability/26-004", "/en/collection", "/en/experience",
];

for (const route of [...ROUTES, "/olmayan-bir-sayfa"]) {
  test(`visual smoke ${route}`, async ({ page, baseURL }, testInfo) => {
    testInfo.setTimeout(90_000);
    const response = await page.goto(route, { waitUntil: "load" });
    const notFound = route === "/olmayan-bir-sayfa";
    expect(response?.status()).toBe(notFound ? 404 : 200);
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });

    // Every global stylesheet was parsed to its last rule (a dropped tail is how "unstyled" sections happen).
    const tails = await page.evaluate(() => ["globals", "foundation", "editorial"].map((f) => getComputedStyle(document.documentElement).getPropertyValue(`--css-tail-${f}`).trim()));
    expect(tails, "stylesheet tails applied (globals, foundation, editorial)").toEqual(["1", "1", "1"]);

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    expect((await h1.boundingBox())!.height).toBeGreaterThan(20);
    if (notFound) await expect(h1).toContainText("Bu patika");

    // Walk the page so lazy media load; then same-origin images that are shown must be decoded and sized.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) { await page.evaluate((top) => window.scrollTo(0, top), y); await page.waitForTimeout(80); }
    await page.waitForLoadState("load");
    await expect.poll(() => page.evaluate((origin) => [...document.querySelectorAll("main img")].filter((img) => {
      const el = img as HTMLImageElement; const src = el.currentSrc || el.src; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!src.startsWith(origin) || s.display === "none" || s.visibility === "hidden" || el.closest("[aria-hidden=true]")) return false;
      return !el.complete || el.naturalWidth === 0 || r.width < 2 || r.height < 2;
    }).map((img) => (img as HTMLImageElement).getAttribute("src")), baseURL!), { timeout: 20_000, message: "broken, unloaded or zero-size images" }).toEqual([]);

    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // Copy touching the viewport edge means a section lost its gutters.
      flush: [...document.querySelectorAll("main h1, main h2, main h3, main p")].filter((el) => {
        const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < 8 && getComputedStyle(el).visibility !== "hidden" && (el.textContent ?? "").trim().length > 3;
      }).slice(0, 3).map((el) => `${el.tagName}: ${(el.textContent ?? "").trim().slice(0, 40)}`),
    }));
    expect(layout.overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
    expect(layout.flush, "text without gutters").toEqual([]);

    for (const [name, fraction] of [["top", 0], ["middle", 0.5], ["bottom", 1]] as const) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), fraction);
      await page.waitForTimeout(250);
      await testInfo.attach(`${route} ${name}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  });
}
