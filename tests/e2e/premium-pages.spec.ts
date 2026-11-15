import { expect, noHorizontalScroll, test } from "./fixtures";

/** Faz 12: interactions on Hikâyemiz, Deneyim, Hasat and Mağaza. */

test("Hikâyemiz: chapters, keyboard journey and onward links", async ({ page, health }) => {
  void health;
  await page.goto("/hikayemiz");
  await expect(page.getByRole("heading", { level: 1, name: /Toprağın hafızası/ })).toBeVisible();
  await expect(page.locator(".story-scroller-copy article")).toHaveCount(4);
  if (page.viewportSize()!.width > 900) {
    // The sticky media follows the chapter in the reading zone.
    await page.locator("#story-bahce").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(page.locator(".story-scroller-media img.is-active")).toHaveAttribute("src", /story-grove/);
    expect(await page.locator(".story-scroller-media").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
  }
  const tabs = page.getByRole("tablist", { name: "Yolculuğun aşamaları" });
  await expect(async () => {
    await tabs.getByRole("tab", { name: /Toprak/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: /Hasat/ })).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("tabpanel").getByRole("link", { name: /Hasat sürecini incele/ })).toHaveAttribute("href", "/hasat");
  await page.keyboard.press("End");
  await expect(page.getByRole("tabpanel").getByRole("link", { name: /Koleksiyonu keşfet/ })).toHaveAttribute("href", "/koleksiyon");
  await expect(page.locator(".story-next-card")).toHaveCount(2);
  await noHorizontalScroll(page);
});

test("Deneyim: route panels open their route; arrow keys switch imagery", async ({ page, health }) => {
  void health;
  await page.goto("/deneyim");
  await expect(page.getByRole("navigation", { name: "Deneyim rotaları" }).getByRole("link")).toHaveCount(3);
  const tablist = page.getByRole("tablist", { name: "Deneyim rotaları" });
  await expect(async () => {
    await page.locator('a[href="#rota-tadim"]').click();
    await expect(tablist.getByRole("tab", { name: /Tadım ve Ege sofrası/ })).toHaveAttribute("aria-selected", "true", { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await expect(page.locator(".experience-explorer-media img.is-active")).toHaveAttribute("src", /route-table/);
  await expect(page.locator(".experience-explorer")).toBeInViewport();
  await tablist.getByRole("tab", { name: /Tadım/ }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(tablist.getByRole("tab", { name: /Zeytinlik ve hasat/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".experience-explorer-media img.is-active")).toHaveAttribute("src", /route-grove/);
  await expect(page.getByRole("tabpanel").getByRole("link", { name: /Hasat sürecini incele/ })).toHaveAttribute("href", "/hasat");
  await expect(page.getByText(/rezervasyon alınmıyor/)).toBeVisible();
  await noHorizontalScroll(page);
});

test("Hasat: six stages, rail jumps, loop is one lightweight video with a poster", async ({ page, health }) => {
  void health;
  const videos: string[] = [];
  page.on("request", (r) => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) videos.push(r.url().split("/").pop()!); });
  await page.goto("/hasat");
  await expect(page.locator(".harvest-stages article")).toHaveCount(6);
  await expect(page.locator(".harvest-loop img")).toBeVisible();
  await expect.poll(() => new Set(videos).size).toBeLessThanOrEqual(1);
  expect(videos.every((v) => v.startsWith("harvest-loop"))).toBe(true);
  if (page.viewportSize()!.width > 900) {
    await page.getByRole("navigation", { name: "Hasat aşamaları" }).getByRole("link", { name: /Sıkım ve üretim/ }).click();
    await expect(page).toHaveURL(/#asama-4$/);
    await expect(page.getByRole("heading", { level: 3, name: "Soğuk sıkım" })).toBeInViewport({ timeout: 10_000 });
    await expect(page.getByRole("navigation", { name: "Hasat aşamaları" }).getByRole("link", { name: /Sıkım ve üretim/ })).toHaveAttribute("aria-current", "step");
  }
  await expect(page.getByRole("link", { name: /Örnek lotu inceleyin/ })).toHaveAttribute("href", "/traceability/26-004");
  await noHorizontalScroll(page);
});

test("Hasat: reduced motion requests no video", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const videos: string[] = [];
  page.on("request", (r) => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) videos.push(r.url()); });
  await page.goto("/hasat", { waitUntil: "networkidle" });
  await expect(page.locator(".harvest-loop video")).toHaveCount(0);
  expect(videos).toEqual([]);
  await context.close();
});

test("Mağaza: showcase doors filter the list; filters can be cleared", async ({ page, health }) => {
  void health;
  await page.goto("/magaza");
  const doors = page.getByRole("navigation", { name: "Ambalaj aileleri" });
  await doors.getByRole("link", { name: /Aile boyları/ }).click();
  await expect(page).toHaveURL(/kategori=tin/);
  const cards = page.locator(".product-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("Teneke");
  await expect(async () => { // retry until React has hydrated the filter controls
    await page.getByRole("button", { name: "Filtreleri temizle" }).click({ timeout: 2000 });
    await expect(cards).toHaveCount(13, { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await page.getByLabel("Ürün ara").fill("zzzz-yok");
  await expect(page.getByRole("heading", { name: "Aradığınız ürün bulunamadı" })).toBeVisible();
  await noHorizontalScroll(page);
});
