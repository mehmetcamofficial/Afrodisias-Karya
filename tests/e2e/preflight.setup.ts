import { expect, test } from "@playwright/test";

// Must pass before the full responsive-browser suite starts.
// If the isolated catalog is missing, this fails immediately rather than
// running 100+ redundant UI failures with no actionable information.
test("E2E fixture catalogue is available to the local server", async ({ request }) => {
  const store = await request.get("/magaza");
  expect(store.status(), "Store must render before UI tests").toBe(200);
  const html = await store.text();
  expect(html).toContain("5 Litre Mat Teneke");

  const product = await request.get("/urun/glass-500");
  expect(product.status(), "Product details must render before UI tests").toBe(200);
  expect(await product.text()).toContain("500");
});
