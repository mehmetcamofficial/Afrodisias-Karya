import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { chatGPTSignInPath, getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { isAdminEmail, parseAdminAllowlist } from "../lib/admin-access";
import { clerkPreviewConfigured } from "../lib/clerk-preview";
import { can, type Permission, type Role } from "../lib/cms-permissions";

export type AdminCheck =
  | { status: "admin"; user: ChatGPTUser; role: Role }
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
    if (clerkUser?.id !== userId || primary?.verification?.status !== "verified") return { status: "forbidden", user, configured: allowlist.size > 0 };
    if (isAdminEmail(email, allowlist)) return { status: "admin", user, role: "owner" };
    const role = await lookupRole(email);
    return role ? { status: "admin", user, role } : { status: "forbidden", user, configured: allowlist.size > 0 };
  }

  const user = await getChatGPTUser();
  if (!user) return { status: "anonymous" };
  if (isAdminEmail(user.email, allowlist)) return { status: "admin", user, role: "owner" };
  const role = await lookupRole(user.email);
  return role ? { status: "admin", user, role } : { status: "forbidden", user, configured: allowlist.size > 0 };
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

/**
 * Editors/viewers granted in admin_users (migration 0003). Fails closed: if the
 * table or database is unavailable, the account simply has no role.
 */
async function lookupRole(email: string): Promise<Role | null> {
  if (!email) return null;
  try {
    const [{ requirePostgres }, { findAdminRole }] = await Promise.all([import("../db/postgres/driver"), import("../db/postgres/cms-repository")]);
    const role = await findAdminRole(requirePostgres(), email);
    return role === "owner" ? null : role; // owners only come from ADMIN_EMAILS
  } catch {
    return null;
  }
}

/** For CMS API routes: the caller's identity and role, or an error response. */
export async function requirePermission(permission: Permission): Promise<{ ok: true; email: string; role: Role } | { ok: false; response: NextResponse }> {
  const check = await checkAdmin();
  if (check.status === "admin" && can(check.role, permission)) return { ok: true, email: check.user.email.toLowerCase(), role: check.role };
  const anonymous = check.status === "anonymous";
  return {
    ok: false,
    response: NextResponse.json(
      { error: anonymous ? "Yetkisiz" : `Bu işlem için yetkiniz yok (${permission})` },
      { status: anonymous ? 401 : 403 },
    ),
  };
}

/** For legacy admin API routes (orders, legacy product save): owners only, as before 0003. */
export async function adminApiGuard(): Promise<NextResponse | null> {
  const check = await checkAdmin();
  if (check.status === "admin" && check.role === "owner") return null;
  return NextResponse.json(
    { error: check.status === "anonymous" ? "Yetkisiz" : "Bu işlem için yönetici yetkisi gerekir" },
    { status: check.status === "anonymous" ? 401 : 403 },
  );
}
