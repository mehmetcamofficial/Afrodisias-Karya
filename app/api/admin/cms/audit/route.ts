import { NextResponse } from "next/server";
import { listAuditLogs } from "../../../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { cmsErrorResponse } from "../../../../../lib/cms-http";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

/** Read-only, paginated audit log (the table itself is append-only). */
export async function GET(request: Request) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  const q = new URL(request.url).searchParams;
  const clean = (value: string | null, pattern: RegExp) => (value && pattern.test(value) ? value : undefined);
  try {
    const rows = await listAuditLogs(requirePostgres(), {
      entityType: clean(q.get("type"), /^[a-z_]{2,30}$/), actionPrefix: clean(q.get("action"), /^[a-z_.]{2,40}$/),
      before: Number(q.get("before")) || undefined, limit: 50,
    });
    return NextResponse.json({ rows, next: rows.length === 50 ? rows[rows.length - 1].id : null });
  } catch (error) { return cmsErrorResponse(error); }
}
