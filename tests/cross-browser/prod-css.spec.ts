import { expect, test, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Does each browser apply the production CSS to the end? Owner report (#6): sections styled by rules
 * at the END of globals.css were unstyled on Preview while rules at its START applied.
 */
const dir = path.resolve(".prod-css");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => ({ name: f, css: readFileSync(path.join(dir, f), "utf8") })) : [];
// Same order as the layout: globals first, then foundation/editorial, then route chunks.
const rank = (css: string) => (css.includes("--css-tail-globals") ? 0 : css.includes("--css-tail-foundation") ? 1 : 2);
const ordered = [...files].sort((a, b) => rank(a.css) - rank(b.css));

async function useProductionCss(page: Page) {
  return page.evaluate((sheets) => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { if ((l as HTMLLinkElement).href.startsWith(location.origin)) l.remove(); });
    document.querySelectorAll("style").forEach((s) => s.remove());
    return sheets.map(({ name, css }) => {
      const style = document.createElement("style"); style.dataset.prodCss = name; style.textContent = css; document.head.appendChild(style);
      let count = 0; const walk = (rules: CSSRuleList) => { for (const r of Array.from(rules)) { count += 1; if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules); } };
      walk(style.sheet!.cssRules);
      return { name, rules: count, bytes: css.length };
    });
  }, ordered);
}

const tails = (page: Page) => page.evaluate(() => ["globals", "foundation", "editorial"].map((f) => getComputedStyle(document.documentElement).getPropertyValue(`--css-tail-${f}`).trim()));

test.beforeAll(() => { expect(ordered.length, "run `pnpm exec next build` and copy .next/static/chunks/*.css to .prod-css/").toBeGreaterThan(0); });

test("/koleksiyon: production CSS parses to its end and lays out the catalogue", async ({ page }, testInfo) => {
  await page.goto("/koleksiyon", { waitUntil: "load" });
  const parsed = await useProductionCss(page);
  testInfo.annotations.push({ type: "parsed rules", description: JSON.stringify(parsed) });
  expect(await tails(page)).toEqual(["1", "1", "1"]);
  const width = page.viewportSize()!.width;
  const s = await page.evaluate(() => {
    const grid = getComputedStyle(document.querySelector(".collection-series-grid")!);
    const link = getComputedStyle(document.querySelector(".collection-category-nav a")!);
    return { display: grid.display, cols: grid.gridTemplateColumns.split(" ").length, pad: parseFloat(getComputedStyle(document.querySelector(".collection-series")!).paddingLeft), radius: parseFloat(link.borderTopLeftRadius) };
  });
  expect(s.display).toBe("grid");
  expect(s.cols).toBe(width >= 1100 ? 3 : width > 700 ? 2 : 1);
  expect(s.pad).toBeGreaterThanOrEqual(18);
  expect(s.radius).toBeGreaterThan(10);
  await page.locator("#seri-glass").evaluate((el) => el.scrollIntoView());
  await testInfo.attach("koleksiyon first series (prod css)", { body: await page.screenshot(), contentType: "image/png" });
});

test("/deneyim: production CSS parses to its end and lays out the explorer", async ({ page }, testInfo) => {
  await page.goto("/deneyim", { waitUntil: "load" });
  const parsed = await useProductionCss(page);
  testInfo.annotations.push({ type: "parsed rules", description: JSON.stringify(parsed) });
  expect(await tails(page)).toEqual(["1", "1", "1"]);
  const s = await page.evaluate(() => ({
    layout: getComputedStyle(document.querySelector(".experience-explorer-layout")!).display,
    tab: getComputedStyle(document.querySelector(".experience-explorer-tabs button")!).display,
    panelBg: getComputedStyle(document.querySelector(".experience-explorer-panel")!).backgroundColor,
    pad: parseFloat(getComputedStyle(document.querySelector(".experience-explorer")!).paddingLeft),
  }));
  expect(s).toMatchObject({ layout: "grid", tab: "grid", panelBg: "rgb(23, 48, 36)" });
  expect(s.pad).toBeGreaterThanOrEqual(18);
  await page.locator("#kesfet").evaluate((el) => el.scrollIntoView());
  await testInfo.attach("deneyim explorer (prod css)", { body: await page.screenshot(), contentType: "image/png" });
});
