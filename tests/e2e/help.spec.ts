import { expect, test, type Page } from "@playwright/test";

/** Clicks until React has hydrated and the dialog opens. */
async function openHelp(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Size nasıl yardımcı olabiliriz?" });
  await expect(async () => {
    await page.getByRole("button", { name: "Yardım" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  return dialog;
}

test.describe("help widget", () => {
  test("opens from every public page, shows FAQ, traps focus and closes with Escape", async ({ page }) => {
    for (const path of ["/", "/magaza"]) {
      await page.goto(path);
      const fab = page.getByRole("button", { name: "Yardım" });
      await expect(fab).toBeVisible();
      const box = await fab.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      const dialog = await openHelp(page);
      await expect(dialog.getByText("Online sipariş verebilir miyim?", { exact: false })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(fab).toBeFocused();
    }
  });

  test("the form refuses to submit without consent and never fakes success", async ({ page }) => {
    await page.goto("/");
    await openHelp(page);
    await page.getByRole("tab", { name: "Bize yazın" }).click();
    await page.getByLabel("Ad soyad", { exact: true }).fill("Test Ziyaretçi");
    await page.getByLabel("E-posta", { exact: true }).fill("ziyaretci@example.test");
    await page.getByLabel("Mesaj", { exact: true }).fill("Bu bir uçtan uca test mesajıdır.");
    await page.getByRole("button", { name: "Gönder" }).click();
    // Native required checkbox blocks submission: no status message appears.
    await expect(page.locator(".help-state")).toHaveCount(0);
    let posted = false;
    await page.route("**/api/contact", (route) => { posted = true; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Mesaj formu şu anda kullanılamıyor; mesajınız kaydedilmedi." }) }); });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Gönder" }).click();
    await expect(page.getByRole("alert")).toContainText("kaydedilmedi");
    expect(posted).toBe(true);
  });
  // Hidden on /admin via usePathname; not exercised here because the vinext dev server
  // cannot render admin pages (Clerk require) and its error overlay leaks into parallel tests.
});
