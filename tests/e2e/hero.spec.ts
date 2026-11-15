import { expect, noHorizontalScroll, test } from "./fixtures";

test("hero text fits the viewport and CTAs reach the right pages", async ({ page, health }) => {
  void health;
  await page.goto("/", { waitUntil: "networkidle" });
  const viewport = page.viewportSize()!;
  const title = await page.locator("#hero-title").boundingBox();
  expect(title!.x).toBeGreaterThanOrEqual(0);
  expect(title!.x + title!.width).toBeLessThanOrEqual(viewport.width);
  await noHorizontalScroll(page);

  const ctas = [["Koleksiyonu Keşfedin", "/koleksiyon"], ["Toprağı Yürüyün", "/deneyim"], ["Hikâyemizi Keşfedin", "/hikayemiz"]] as const;
  for (const [label, href] of ctas) {
    await page.goto("/", { waitUntil: "networkidle" });
    const cta = page.locator(".hero-ctas").getByRole("link", { name: label });
    const box = (await cta.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    // The element under the CTA's centre must be the CTA itself (nothing overlays it).
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href"), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    expect(hit).toBe(href);
    await cta.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }
});

test("hero loads only the single journey film, in one format, and it exists", async ({ page }) => {
  const videoResponses: Array<{ url: string; status: number }> = [];
  page.on("response", (response) => { if (/\.(mp4|webm)(\?|$)/.test(response.url())) videoResponses.push({ url: response.url(), status: response.status() }); });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(500);
  const files = [...new Set(videoResponses.map((r) => r.url.split("/").pop()!.split("?")[0]))];
  expect(files.length).toBe(1);
  expect(files[0]).toMatch(/^altin-dal-journey\.(webm|mp4)$/);
  expect(videoResponses.every((r) => r.status === 200 || r.status === 206)).toBe(true);
  await expect(page.locator(".hero-film-poster")).toBeVisible();
});
