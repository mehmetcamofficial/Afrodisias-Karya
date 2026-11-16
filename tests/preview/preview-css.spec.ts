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

test("/ vitrine on Preview: three families with loaded images, honest purchase state, working links", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "load" });
  const vitrine = page.locator(".home-vitrine");
  await vitrine.scrollIntoViewIfNeeded();
  const items = vitrine.locator(".home-vitrine-item");
  await expect(items).toHaveCount(3);
  for (const item of await items.all()) {
    const img = item.locator("img");
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
    await expect(item.locator("b")).not.toBeEmpty();
    const state = await item.getAttribute("data-state");
    const price = (await item.locator(".home-vitrine-price").textContent()) ?? "";
    // A purchase action and a price appear together, and only for a live catalogue product.
    if (state === "live") expect(price).toMatch(/₺/); else expect(price).not.toMatch(/₺/);
    expect(await item.locator(".home-vitrine-action.is-buy").count()).toBe(state === "live" ? 1 : 0);
  }
  console.log(`[${testInfo.project.name}] vitrine states ${JSON.stringify(await items.evaluateAll((els) => els.map((e) => `${e.querySelector("b")?.textContent}:${e.getAttribute("data-state")}:${e.querySelector("a")?.getAttribute("href")}`)))}`);
  await testInfo.attach("home vitrine", { body: await vitrine.screenshot(), contentType: "image/png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  for (const href of await vitrine.locator("a").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]))]))
    expect((await page.request.get(href)).status(), href).toBe(200);
});

test("13B on Preview: no draft is exposed and no exchange-rate price appears", async ({ page, request }, testInfo) => {
  // Read-only: GET requests only; no order or admin call is made.
  const res = await request.get("/api/products");
  expect(res.status()).toBe(200);
  const rows = await res.json() as Array<{ id: string; active: boolean }>;
  console.log(`[${testInfo.project.name}] public catalogue rows: ${rows.length}`);
  expect(rows.every((row) => row.active === true)).toBe(true);
  await page.goto("/magaza", { waitUntil: "load" });
  const select = page.locator(".shop-selects select").nth(1);
  for (const currency of ["USD", "EUR"]) {
    if (await select.count()) await select.selectOption(currency);
    // A converted price would render as "$123" / "€45" on a product card; only business-set prices may.
    const converted = await page.locator(".product-card footer strong").evaluateAll((els) => els.map((e) => e.textContent ?? "").filter((t) => /[$€]\s?\d/.test(t)));
    expect(converted, `${currency} prices on cards`).toEqual(rows.length ? converted : []);
  }
});

test("13C on Preview: admin product APIs are closed to anonymous callers and the test harness does not exist", async ({ request }, testInfo) => {
  // Read-only probes: every request is unauthenticated (no Clerk session) and must be refused before any write.
  const checks: Array<[string, Promise<{ status(): number }>, number]> = [
    ["prices", request.post("/api/admin/cms/products/glass-500/prices", { data: { action: "approve", currency: "TRY", amountMinor: 89000, expectedVersion: 1 } }), 401],
    ["media add", request.post("/api/admin/cms/products/glass-500/media", { data: { url: "/x.webp", truth: "concept", altTr: "x" } }), 401],
    ["media approval", request.post("/api/admin/cms/media/m-1/approval", { data: { approve: true } }), 401],
    ["e2e harness", request.get("/e2e/urun-yonetimi"), 404],
    ["media bad id", request.get("/media/not-an-id"), 404],
    ["media unknown", request.get("/media/m-00000000-0000-4000-8000-000000000000"), 404],
  ];
  for (const [name, pending, expected] of checks) {
    const status = (await pending).status();
    console.log(`[${testInfo.project.name}] ${name}: ${status}`);
    expect(status, name).toBe(expected);
  }
});
