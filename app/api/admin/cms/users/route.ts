import { NextResponse } from "next/server";
import { z } from "zod";
import { listAdminUsers, upsertAdminUser } from "../../../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { parseAdminAllowlist } from "../../../../../lib/admin-access";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const access = await requirePermission("users.manage");
  if (!access.ok) return access.response;
  try { return NextResponse.json({ users: await listAdminUsers(requirePostgres()) }); } catch (error) { return cmsErrorResponse(error); }
}

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), role: z.enum(["editor", "viewer"]), disabled: z.boolean().default(false) });

/** Owner-only. Cannot touch ADMIN_EMAILS owners or the caller's own account. */
export async function POST(request: Request) {
  const access = await requirePermission("users.manage");
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const { email, role, disabled } = parsed.data;
  if (email === access.email || parseAdminAllowlist(process.env.ADMIN_EMAILS).has(email)) {
    return NextResponse.json({ error: "Sahip hesapları ve kendi hesabınız buradan değiştirilemez (ADMIN_EMAILS ile yönetilir)" }, { status: 409 });
  }
  try { return NextResponse.json(await upsertAdminUser(requirePostgres(), email, role, disabled, access.email, Date.now())); }
  catch (error) { return cmsErrorResponse(error); }
}
