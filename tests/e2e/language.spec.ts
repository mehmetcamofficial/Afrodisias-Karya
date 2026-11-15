import { expect, noHorizontalScroll, test } from "./fixtures";

/** Turkish ↔ English switching on the pages that have an English version (issue #6, P2). */
const PAIRS = [
  { tr: "/koleksiyon", en: "/en/collection", toEn: /English version/, toTr: "Türkçe" },
  { tr: "/deneyim", en: "/en/experience", toEn: /^English$/, toTr: "Türkçe" },
  { tr: "/koleksiyon/test-hediye-seckisi", en: "/en/collection/test-gift-edit", toEn: /^English$/, toTr: "Türkçe" },
];

for (const pair of PAIRS) {
  test(`language round trip ${pair.tr} ↔ ${pair.en}`, async ({ page, health }) => {
    void health;
    await page.goto(pair.tr);
    const toEn = page.getByRole("link", { name: pair.toEn });
    await expect(toEn).toHaveAttribute("hreflang", "en");
    await expect(toEn).toHaveAttribute("href", pair.en);
    await toEn.click();
    await expect(page).toHaveURL(new RegExp(`${pair.en}$`));
    await expect(page.locator("[lang=en]").first()).toBeAttached();
    await expect(page.locator(`link[rel=alternate][hreflang="tr-TR"]`)).toHaveAttribute("href", new RegExp(`${pair.tr}$`));
    await noHorizontalScroll(page);
    await page.getByRole("link", { name: pair.toTr, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${pair.tr}$`));
  });
}
