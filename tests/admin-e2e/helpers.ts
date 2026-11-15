import { expect, type Page } from "@playwright/test";
import pg from "pg";

export const DB_URL = process.env.DATABASE_URL_E2E ?? "postgres://test_admin:test_only_local@127.0.0.1:55432/altindal_e2e";
export const identity = (email: string) => ({ "oai-authenticated-user-id": `e2e-${email}`, "oai-authenticated-user-email": email });

/** Independent DB session used to verify what the UI claims (persistence, versions, audit). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try { return (await client.query(text, params)).rows as T[]; } finally { await client.end(); }
}

/** Fills and submits, then waits for the server's confirmation message. */
export async function expectSaved(page: Page, text = /veritabanına kaydedildi/) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible({ timeout: 15_000 });
}

export async function noHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw);
}

/** Navigate and wait until client components have hydrated (forms must not fall back to a native GET submit). */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
