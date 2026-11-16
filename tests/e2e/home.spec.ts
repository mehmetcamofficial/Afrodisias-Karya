import { expect, noHorizontalScroll, test } from "./fixtures";

/** Faz 12B homepage: everything after the hero film. */
test("vitrine: each product's name, size and price come from the catalogue and link to it", async ({ page, health }) => {
  void health;
  const external: string[] = [];
  page.on("request", (r) => { if (!r.url().startsWith(new URL(page.url() || "http://x").origin) && /\.(jpe?g|png|webp|avif)(\?|$)|Special:FilePath/.test(r.url())) external.push(r.url()); });
  await page.goto("/");
  const items = page.locator(".home-vitrine-item");
  await expect(items).toHaveCount(3);
  const expected = [
    { name: "500 ml Cam Şişe", size: "500 ml", href: "/urun/glass-500", img: /scene-bottle/ },
    { name: "3 Litre Mat Teneke", size: "3 L", href: "/urun/tin-3l", img: /scene-tin/ },
    { name: "Aphrodisias Special Reserve", size: "500 ml", href: "/urun/reserve-500", img: /scene-giftbox/ },
  ];
  for (const [i, e] of expected.entries()) {
    const item = items.nth(i);
    await expect(item.locator("b")).toHaveText(e.name);
    await expect(item.locator("small")).toContainText(e.size);
    await expect(item.locator(".home-vitrine-price")).toHaveText(/₺\s?[\d.]+/);
    await expect(item.locator("a")).toHaveAttribute("href", e.href);
    await expect(item.locator("img")).toHaveAttribute("src", e.img);
    await expect(item.locator(".home-vitrine-note")).toContainText(/temsili/i);
  }
  expect(external, "no third-party images on the homepage").toEqual([]);
  await items.nth(1).locator("a").click();
  await expect(page).toHaveURL(/\/urun\/tin-3l$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("3 Litre Mat Teneke");
});

test("grove-to-table rail: buttons and swipe-scroll move it; each stage opens its Hasat section", async ({ page }) => {
  await page.goto("/");
  const rail = page.getByRole("list", { name: "Topraktan sofraya aşamalar" });
  await expect(rail.getByRole("listitem")).toHaveCount(5);
  const before = await rail.evaluate((el) => el.scrollLeft);
  await expect(async () => {
    await page.getByRole("button", { name: "Sonraki aşama" }).click();
    await expect.poll(() => rail.evaluate((el) => el.scrollLeft), { timeout: 1500 }).toBeGreaterThan(before);
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Önceki aşama" })).toBeEnabled();
  const hrefs = await rail.getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(hrefs).toEqual(["/hasat#asama-1", "/hasat#asama-2", "/hasat#asama-3", "/hasat#asama-4", "/hasat#asama-6"]);
  // The page itself never scrolls sideways.
  await noHorizontalScroll(page);
});

test("experience routes, values and finale link to real pages", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Deneyim rotaları" });
  await expect(async () => {
    await tabs.getByRole("tab", { name: /Kültürel miras/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: /Zeytinlik/ })).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("tabpanel").getByRole("link", { name: "Zeytinlik rotası" })).toHaveAttribute("href", "/deneyim#rota-hasat");
  const proofs = await page.locator(".home-values li a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(proofs).toEqual(["/hikayemiz", "/traceability/26-004", "/hasat", "/magaza"]);
  for (const href of [...proofs, "/deneyim"]) expect((await page.request.get(href!)).status(), href!).toBe(200);
  const finale = page.getByRole("navigation", { name: "Son adım" });
  await expect(finale.getByRole("link", { name: /Koleksiyonu keşfedin/ })).toHaveAttribute("href", "/koleksiyon");
  await expect(finale.getByRole("link", { name: /Mağazaya gidin/ })).toHaveAttribute("href", "/magaza");
  // The homepage has no English twin, so it must not advertise one.
  await expect(page.locator('link[rel=alternate][hreflang="en"]')).toHaveCount(0);
});
