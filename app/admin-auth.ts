import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { chatGPTSignInPath, getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { isAdminEmail, parseAdminAllowlist } from "../lib/admin-access";
import { clerkPreviewConfigured } from "../lib/clerk-preview";

export type AdminCheck =
  | { status: "admin"; user: ChatGPTUser }
  | { status: "forbidden"; user: ChatGPTUser; configured: boolean }
  | { status: "anonymous" };

export async function checkAdmin(): Promise<AdminCheck> {
  // The showcase release has no Production admin identity provider yet.
  // Reject ALL Production admin operations rather than trusting legacy headers.
  if (process.env.VERCEL_ENV === "production") return { status: "anonymous" };
  const allowlist = parseAdminAllowlist(process.env.ADMIN_EMAILS);
  if (process.env.VERCEL_ENV === "preview") {
    if (!clerkPreviewConfigured()) return { status: "anonymous" };
    const { userId } = await auth({ acceptsToken: "session_token" });
    if (!userId) return { status: "anonymous" };
    const clerkUser = await currentUser();
    const primary = clerkUser?.primaryEmailAddress;
    const email = primary?.emailAddress ?? "";
    const fullName = clerkUser?.fullName ?? null;
    const user = { userId, email, fullName, displayName: fullName ?? email };
    if (clerkUser?.id === userId && primary?.verification?.status === "verified" && isAdminEmail(email, allowlist)) {
      return { status: "admin", user };
    }
    return { status: "forbidden", user, configured: allowlist.size > 0 };
  }

  const user = await getChatGPTUser();
  if (!user) return { status: "anonymous" };
  if (isAdminEmail(user.email, allowlist)) return { status: "admin", user };
  return { status: "forbidden", user, configured: allowlist.size > 0 };
}

/** For admin pages: redirects anonymous users to sign-in; returns the check otherwise. */
export async function requireAdminPage(returnTo: string): Promise<Exclude<AdminCheck, { status: "anonymous" }>> {
  const check = await checkAdmin();
  if (check.status === "anonymous") {
    if (process.env.VERCEL_ENV === "preview") {
      const target = /^\/admin(?:\/[a-z-]+)?$/.test(returnTo) ? returnTo : "/admin";
      redirect(`/admin/giris?redirect_url=${encodeURIComponent(target)}`);
    }
    redirect(chatGPTSignInPath(returnTo));
  }
  return check;
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
