import { expect, test } from "@playwright/test";
import { expectSaved, identity, noHorizontalScroll, open, sql } from "./helpers";

test.describe.configure({ mode: "serial" });
test.use({ extraHTTPHeaders: identity("owner@e2e.test") });

test("empty finance shows an honest empty state, no figures", async ({ page }) => {
  await open(page, "/admin/finans");
  await expect(page.getByRole("heading", { name: "Henüz finans kaydı yok" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Finans bölümleri" }).getByRole("link")).toHaveCount(6);
  await expect(page.locator(".metric-grid")).toHaveCount(0);
});

test("owner sets up accounts and categories through the UI", async ({ page }) => {
  await open(page, "/admin/finans/hareketler");
  for (const [name, currency] of [["Ana Kasa", "TRY"], ["EUR Hesap", "EUR"]]) {
    await page.getByLabel("Hesap adı").fill(name);
    await page.getByRole("combobox", { name: /^Para birimi/ }).selectOption(currency);
    await page.getByRole("button", { name: "Hesap ekle" }).click();
    await expect(page.locator(".finance-list li").filter({ hasText: name })).toBeVisible(); // list re-read from the DB
  }
  for (const [name, direction] of [["Satış", "income"], ["Ambalaj", "expense"]]) {
    await page.getByLabel("Kategori adı").fill(name);
    await page.getByRole("combobox", { name: /^Yön/ }).selectOption(direction);
    await page.getByRole("button", { name: "Kategori ekle" }).click();
    await expect(page.locator(".finance-list li").filter({ hasText: name })).toBeVisible();
  }
  expect(await sql("SELECT name, currency FROM finance_accounts ORDER BY name")).toEqual([{ name: "Ana Kasa", currency: "TRY" }, { name: "EUR Hesap", currency: "EUR" }]);
  expect((await sql<{ n: number }>("SELECT count(*)::int AS n FROM audit_logs WHERE action LIKE 'finance.%'"))[0].n).toBe(4);
});

test("expense is stored in minor units; a double click posts it only once (idempotency)", async ({ page }) => {
  await open(page, "/admin/finans/hareketler");
  await page.getByLabel("Hesap", { exact: true }).selectOption({ label: "Ana Kasa (TRY)" });
  await page.getByLabel(/^Tutar/).fill("1.250,50");
  await page.getByLabel("Açıklama").fill("E2E şişe alımı");
  await page.getByRole("button", { name: "Gider kaydet" }).dblclick();
  await expectSaved(page, /kaydedildi|zaten kayıtlıydı/);
  await expect(page.getByRole("cell", { name: /1\.250,50/ }).first()).toBeVisible();
  const rows = await sql<{ amount_minor: string; kind: string; version: number }>("SELECT amount_minor, kind, version FROM finance_entries WHERE description = 'E2E şişe alımı'");
  expect(rows).toEqual([{ amount_minor: "125050", kind: "expense", version: 1 }]);
});

test("foreign-currency expense requires rate, source and date; base amount is computed server-side", async ({ page }) => {
  await open(page, "/admin/finans/hareketler");
  await page.getByLabel("Hesap", { exact: true }).selectOption({ label: "EUR Hesap (EUR)" });
  await page.getByLabel(/^Tutar/).fill("100");
  await page.getByLabel("Kur", { exact: true }).fill("35.25");
  await page.getByLabel("Kur kaynağı").fill("TCMB döviz satış");
  await page.getByLabel("Kur tarihi").fill("2026-11-14");
  await page.getByLabel("Açıklama").fill("E2E EUR etiket");
  await page.getByRole("button", { name: "Gider kaydet" }).click();
  await expectSaved(page, /Gider: veritabanına kaydedildi/);
  const [row] = await sql<Record<string, string>>("SELECT currency, amount_minor, fx_rate::text, fx_source, to_char(fx_date,'YYYY-MM-DD') AS fx_date, base_amount_minor FROM finance_entries WHERE description = 'E2E EUR etiket'");
  expect(row).toEqual({ currency: "EUR", amount_minor: "10000", fx_rate: "35.2500000000", fx_source: "TCMB döviz satış", fx_date: "2026-11-14", base_amount_minor: "352500" });
});

test("void posts a reversal (never deletes) and the report nets it out", async ({ page }) => {
  await open(page, "/admin/finans/hareketler");
  await page.getByLabel("Kayıt türü").selectOption("income");
  await page.getByLabel("Hesap", { exact: true }).selectOption({ label: "Ana Kasa (TRY)" });
  await page.getByLabel(/^Tutar/).fill("5.000");
  await page.getByLabel("Açıklama").fill("E2E hatalı gelir");
  await page.getByRole("button", { name: "Gelir kaydet" }).click();
  await expectSaved(page, /Gelir: veritabanına kaydedildi/);
  page.once("dialog", (dialog) => dialog.accept("E2E yanlış tutar"));
  await page.getByRole("row", { name: /Gelir.*5\.000,00/ }).first().getByRole("button", { name: "İptal et" }).click();
  await expectSaved(page, /İptal: veritabanına kaydedildi/);
  await expect.poll(() => sql("SELECT status, reversal_of IS NOT NULL AS reversal, version FROM finance_entries WHERE kind = 'income' ORDER BY created_at"))
    .toEqual([{ status: "voided", reversal: false, version: 2 }, { status: "posted", reversal: true, version: 1 }]);
  await open(page, "/admin/finans/raporlar");
  const pl = page.locator(".finance-pl");
  await expect(pl.getByRole("row", { name: /Toplam gelir/ })).toContainText("0,00");
  await expect(pl.getByRole("row", { name: /Toplam gider/ })).toContainText("4.775,50"); // 1.250,50 + 3.525,00
  await expect(pl.getByRole("row", { name: /Net kâr/ })).toContainText("-₺4.775,50");
});

test("collection linked to an order; the same POS reference is refused the second time", async ({ page }) => {
  await open(page, "/admin/finans/tahsilatlar");
  const post = async () => {
    await page.getByLabel("Hesap", { exact: true }).selectOption({ label: "Ana Kasa (TRY)" });
    await page.getByLabel(/^Tutar/).fill("1.000");
    await page.getByRole("combobox", { name: /^Sipariş/ }).selectOption({ index: 1 });
    await page.getByLabel(/Banka\/POS referansı/).fill("POS-E2E-0001");
    await page.getByRole("button", { name: "Tahsilat kaydet" }).click();
  };
  await post();
  await expectSaved(page, /Tahsilat: veritabanına kaydedildi/);
  await post();
  await expect(page.getByRole("alert").filter({ hasText: "çift kayıt engellendi" })).toBeVisible();
  await expect.poll(() => sql("SELECT order_id, amount_minor FROM finance_entries WHERE external_ref = 'POS-E2E-0001'")).toEqual([{ order_id: "E2E-ORDER-1", amount_minor: "100000" }]);
  await page.reload();
  await expect(page.getByRole("region", { name: "Sipariş bakiyeleri" }).getByRole("row", { name: /E2E-ORDER-1/ })).toContainText("500,00"); // 1.500 − 1.000 outstanding
});

test("counterparty and product cost components; unit cost rolls up", async ({ page }) => {
  await open(page, "/admin/finans/cariler");
  await page.getByLabel("Ad / unvan").fill("E2E Şişe Tedarikçisi");
  await page.getByLabel("Vergi / TC kimlik no").fill("1234567890");
  await page.getByRole("button", { name: "Cari ekle" }).click();
  await expectSaved(page, /Cari: veritabanına kaydedildi/);
  await expect(page.getByRole("cell", { name: /E2E Şişe Tedarikçisi/ })).toBeVisible();
  await open(page, "/admin/finans/maliyetler");
  await page.getByRole("combobox", { name: /^Ürün/ }).selectOption("glass-500");
  await page.getByRole("combobox", { name: /^Bileşen/ }).selectOption("bottle");
  await page.getByLabel(/^Birim tutar/).fill("25,00");
  await page.getByRole("button", { name: "Bileşen ekle" }).click();
  await expectSaved(page, /Maliyet bileşeni: veritabanına kaydedildi/);
  await expect(page.getByRole("row", { name: /500 ml Cam Şişe/ }).first()).toContainText("25,00");
  await expect.poll(() => sql("SELECT product_id, component, amount_minor FROM product_cost_components")).toEqual([{ product_id: "glass-500", component: "bottle", amount_minor: "2500" }]);
});

test.describe("roles", () => {
  test("accountant can open finance but not CMS user management", async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: identity("accountant@e2e.test") });
    const page = await context.newPage();
    await open(page, "/admin/finans/raporlar");
    await expect(page.getByRole("heading", { name: "Gelir tablosu (TRY)" })).toBeVisible();
    await open(page, "/admin/kullanicilar");
    await expect(page.getByText("yalnızca sahip (owner) hesaplarına açıktır")).toBeVisible();
    await context.close();
  });
  test("editor sees no finance data", async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: identity("editor@e2e.test") });
    const page = await context.newPage();
    await open(page, "/admin/finans");
    await expect(page.getByText("yalnızca sahip ve muhasebe rollerine açıktır")).toBeVisible();
    await expect(page.locator(".finance-list, .finance-table")).toHaveCount(0);
    const api = await context.request.get("/api/admin/finance/entries");
    expect(api.status()).toBe(403);
    await context.close();
  });
  test("anonymous API calls are rejected (plain fetch, no identity headers)", async ({ baseURL }) => {
    const post = await fetch(`${baseURL}/api/admin/finance/entries`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(post.status).toBe(401);
    expect((await fetch(`${baseURL}/api/admin/finance/reports`)).status).toBe(401);
    expect((await fetch(`${baseURL}/api/admin/finance/entries/x/void`, { method: "POST", body: "{}" })).status).toBe(401);
  });
});

test("audit trail covers every finance write", async () => {
  const actions = (await sql<{ action: string; n: number }>("SELECT action, count(*)::int AS n FROM audit_logs WHERE action LIKE 'finance.%' GROUP BY action ORDER BY action"));
  expect(actions).toEqual([
    { action: "finance.account.create", n: 2 }, { action: "finance.category.create", n: 2 }, { action: "finance.cost.create", n: 1 },
    { action: "finance.counterparty.create", n: 1 }, { action: "finance.entry.collection", n: 1 }, { action: "finance.entry.expense", n: 2 },
    { action: "finance.entry.income", n: 1 }, { action: "finance.entry.void", n: 1 },
  ]);
});

test("finance pages have no horizontal scroll on desktop", async ({ page }) => {
  for (const path of ["/admin/finans", "/admin/finans/hareketler", "/admin/finans/raporlar"]) { await open(page, path); await noHorizontalScroll(page); }
});
