import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Safety first: Development keys only, a Clerk TEST e-mail only (…+clerk_test@…, verification code
 * 424242 in Development instances), and the outsider account is created on demand in the Development
 * instance — it is never added to ADMIN_EMAILS or admin_users.
 */
export default async function globalSetup() {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? "";
  const sk = process.env.CLERK_SECRET_KEY ?? "";
  const outsider = process.env.CLERK_TEST_OUTSIDER_EMAIL ?? "";
  if (!pk.startsWith("pk_test_") || !sk.startsWith("sk_test_")) throw new Error("Refusing to run: Clerk Development keys (pk_test_/sk_test_) are required; Production keys are never used.");
  if (!/^[^@\s]+\+clerk_test@[^@\s]+$/.test(outsider)) throw new Error("Refusing to run: CLERK_TEST_OUTSIDER_EMAIL must be a Clerk test address (name+clerk_test@domain).");
  if (!process.env.PREVIEW_URL) throw new Error("PREVIEW_URL is required");
  await clerkSetup({ publishableKey: pk, secretKey: sk });
  // Ensure the outsider exists in the Development instance (idempotent).
  const api = "https://api.clerk.com/v1";
  const headers = { authorization: `Bearer ${sk}`, "content-type": "application/json" };
  const found = await fetch(`${api}/users?email_address=${encodeURIComponent(outsider)}`, { headers });
  if (!found.ok) throw new Error(`Clerk user lookup failed (${found.status})`);
  if (((await found.json()) as unknown[]).length === 0) {
    const created = await fetch(`${api}/users`, { method: "POST", headers, body: JSON.stringify({ email_address: [outsider], skip_password_requirement: true }) });
    if (!created.ok) throw new Error(`Clerk test user creation failed (${created.status})`);
  }
}
