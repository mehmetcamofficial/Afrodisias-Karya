import { expect, test } from "@playwright/test";
import { identity, noHorizontalScroll } from "./helpers";

test.use({ extraHTTPHeaders: identity("owner@e2e.test") });

// Runs after the desktop suite in the mobile-375 project (data already exists).
test("finance screens fit a 375 px phone without horizontal scroll", async ({ page }) => {
  for (const path of ["/admin/finans", "/admin/finans/hareketler", "/admin/finans/maliyetler", "/admin/finans/cariler", "/admin/finans/tahsilatlar", "/admin/finans/raporlar"]) {
    await page.goto(path);
    await expect(page.getByRole("navigation", { name: "Finans bölümleri" })).toBeVisible();
    await noHorizontalScroll(page);
  }
});
