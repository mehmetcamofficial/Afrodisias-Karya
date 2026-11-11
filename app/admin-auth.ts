import { NextResponse } from "next/server";
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { isAdminEmail, parseAdminAllowlist } from "../lib/admin-access";

export type AdminCheck =
  | { status: "admin"; user: ChatGPTUser }
  | { status: "forbidden"; user: ChatGPTUser; configured: boolean }
  | { status: "anonymous" };

export async function checkAdmin(): Promise<AdminCheck> {
  const user = await getChatGPTUser();
  if (!user) return { status: "anonymous" };
  // Vercel uses server-side environment configuration; Cloudflare supplies its binding separately.
  // Missing configuration must deny access, never grant it.
  const allowlist = parseAdminAllowlist(process.env.ADMIN_EMAILS);
  if (isAdminEmail(user.email, allowlist)) return { status: "admin", user };
  return { status: "forbidden", user, configured: allowlist.size > 0 };
}

/** For admin pages: redirects anonymous users to sign-in; returns the check otherwise. */
export async function requireAdminPage(returnTo: string): Promise<Exclude<AdminCheck, { status: "anonymous" }>> {
  await requireChatGPTUser(returnTo); // redirects to sign-in when anonymous
  return (await checkAdmin()) as Exclude<AdminCheck, { status: "anonymous" }>;
}

/** For admin API routes: returns an error response, or null when the caller is an admin. */
export async function adminApiGuard(): Promise<NextResponse | null> {
  const check = await checkAdmin();
  if (check.status === "admin") return null;
  return NextResponse.json(
    { error: check.status === "anonymous" ? "Yetkisiz" : "Bu işlem için yönetici yetkisi gerekir" },
    { status: check.status === "anonymous" ? 401 : 403 },
  );
}
