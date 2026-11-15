import { expect, test, type Page } from "@playwright/test";

/** On the real Preview: which stylesheets loaded, were they parsed to the end, and do the sections lay out? */
async function report(page: Page) {
  return page.evaluate(() => ({
    sheets: [...document.styleSheets].map((s) => { let rules = -1; try { rules = s.cssRules.length; } catch { /* cross-origin */ } return { href: (s.href ?? "inline").replace(location.origin, ""), rules }; }),
    tails: ["globals", "foundation", "editorial"].map((f) => getComputedStyle(document.documentElement).getPropertyValue(`--css-tail-${f}`).trim()),
  }));
}

test("/koleksiyon on Preview", async ({ page }, testInfo) => {
  await page.goto("/koleksiyon", { waitUntil: "load" });
  const r = await report(page);
  testInfo.annotations.push({ type: "stylesheets", description: JSON.stringify(r) });
  console.log(`[${testInfo.project.name}] /koleksiyon ${JSON.stringify(r)}`);
  await page.locator("#seri-glass").scrollIntoViewIfNeeded();
  await testInfo.attach("koleksiyon first series", { body: await page.screenshot(), contentType: "image/png" });
  expect(r.tails).toEqual(["1", "1", "1"]);
  expect(await page.locator(".collection-series-grid").first().evaluate((el) => getComputedStyle(el).display)).toBe("grid");
});

test("/deneyim on Preview", async ({ page }, testInfo) => {
  await page.goto("/deneyim", { waitUntil: "load" });
  const r = await report(page);
  testInfo.annotations.push({ type: "stylesheets", description: JSON.stringify(r) });
  console.log(`[${testInfo.project.name}] /deneyim ${JSON.stringify(r)}`);
  await page.locator("#kesfet").scrollIntoViewIfNeeded();
  await testInfo.attach("deneyim explorer", { body: await page.screenshot(), contentType: "image/png" });
  expect(r.tails).toEqual(["1", "1", "1"]);
  expect(await page.locator(".experience-explorer-layout").evaluate((el) => getComputedStyle(el).display)).toBe("grid");
});
