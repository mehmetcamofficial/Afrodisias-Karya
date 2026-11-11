import { expect, test as base, type Page } from "@playwright/test";

/** Fails the test on uncaught page errors, console errors and failed same-origin requests. */
export const test = base.extend<{ health: { allow: (pattern: RegExp) => void } }>({
  health: async ({ page, baseURL }, provide) => {
    const problems: string[] = [];
    const allowed: RegExp[] = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") problems.push(`console: ${message.text()}`); });
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().startsWith(baseURL!)) problems.push(`${response.status()} ${response.url()}`);
    });
    await provide({ allow: (pattern) => allowed.push(pattern) });
    expect(problems.filter((problem) => !allowed.some((pattern) => pattern.test(problem)))).toEqual([]);
  },
});
export { expect };

export async function noHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth, "page should not scroll horizontally").toBeLessThanOrEqual(clientWidth);
}

export async function clearCart(page: Page) {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("e2e-init")) { localStorage.clear(); sessionStorage.setItem("e2e-init", "1"); } } catch { /* ignore */ } });
}
