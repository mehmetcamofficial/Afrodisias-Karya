import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** WCAG 2.0/2.1/2.2 A + AA scan of the public site (issue #6) at every project width. */
const ROUTES = [
  "/", "/magaza", "/koleksiyon", "/koleksiyon/test-hediye-seckisi", "/urun/glass-500", "/hikayemiz", "/hasat", "/deneyim",
  "/gunluk", "/gunluk/soguk-sikim-polifenol-degeri", "/olive-club", "/corporate-gifts", "/traceability/26-004",
  "/en/collection", "/en/collection/test-gift-edit", "/en/experience", "/olmayan-bir-sayfa",
];

for (const route of ROUTES) {
  test(`axe ${route}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? undefined, reducedMotion: "reduce" });
    const page = await context.newPage();
    // External covers are irrelevant to WCAG checks and make the scan network-dependent.
    await page.route(/wikimedia\.org/, (r) => r.abort());
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = result.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    await context.close();
    expect(summary, "axe violations").toEqual([]);
  });
}
