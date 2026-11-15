import { expect, noHorizontalScroll, test } from "./fixtures";

const chapterButton = (n: number) => new RegExp(`^${n}\\. bölüm`);

test.describe("hero film", () => {
  test("plays one continuous film; chapters follow it and can be jumped to by keyboard", async ({ page, health }) => {
    void health;
    await page.goto("/");
    const hero = page.locator(".hero-film");
    await expect(hero).toHaveClass(/is-rendering/, { timeout: 20_000 }); // poster handed over only once frames render
    await expect(page.locator("video")).toHaveCount(1);
    const nav = page.getByRole("navigation", { name: "Film bölümleri" });
    await expect(nav.getByRole("button", { name: chapterButton(1) })).toHaveAttribute("aria-current", "step");

    // Keyboard: focus chapter 3 and press Enter.
    await nav.getByRole("button", { name: chapterButton(3) }).focus();
    await page.keyboard.press("Enter");
    await expect(nav.getByRole("button", { name: chapterButton(3) })).toHaveAttribute("aria-current", "step");
    await expect(page.locator(".hero-film-caption")).toContainText("Sıvı altın");
    expect(await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(17.5);
    await expect(page.getByRole("link", { name: /Sıvı altın hakkında/ })).toHaveAttribute("href", "/gunluk/uretim");
    await noHorizontalScroll(page);
  });

  test("visitor can pause and resume; the film pauses off-screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-film")).toHaveClass(/is-rendering/, { timeout: 20_000 });
    const video = page.locator("video");
    await page.getByRole("button", { name: "Filmi duraklat" }).click();
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(page.getByRole("button", { name: "Filmi oynat" })).toHaveAttribute("aria-pressed", "true");
    // A paused film stays paused when scrolling away and back.
    await page.mouse.wheel(0, 2500);
    await page.mouse.wheel(0, -2500);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByRole("button", { name: "Filmi oynat" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    // Off-screen → paused; back on screen → playing again.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  });

  test("reduced motion: no video is requested; chapter stills are navigable", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const videos: string[] = [];
    page.on("request", (r) => { if (/\.(mp4|webm)/.test(r.url())) videos.push(r.url()); });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator(".hero-film")).toHaveClass(/is-stills/);
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Filmi/ })).toHaveCount(0);
    await page.getByRole("navigation", { name: "Film bölümleri" }).getByRole("button", { name: chapterButton(4) }).click();
    await expect(page.locator(".hero-film-still.is-active")).toHaveAttribute("alt", /Altın Dal şişesi/);
    expect(videos).toEqual([]);
    await context.close();
  });

  test("if the film cannot load, the hero stays intact and usable", async ({ page }) => {
    await page.route(/altin-dal-journey\.(webm|mp4)/, (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("/");
    await expect(page.locator(".hero-film")).toHaveClass(/is-stills/, { timeout: 15_000 });
    await expect(page.locator(".hero-film-still.is-active")).toBeVisible();
    await expect(page.locator("#hero-title")).toBeVisible();
    await page.locator(".hero-ctas").getByRole("link", { name: "Koleksiyonu Keşfedin" }).click();
    await expect(page).toHaveURL(/\/koleksiyon$/);
  });

  test("the old 500svh scroll stage is gone; the hero is one viewport tall", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".immersive-film-journey")).toHaveCount(0);
    const { hero, vh } = await page.evaluate(() => ({ hero: document.querySelector(".hero-film")!.getBoundingClientRect().height, vh: innerHeight }));
    expect(hero).toBeLessThanOrEqual(vh * 1.05);
  });
});
