import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { INQUIRY_STATUSES, setInquiryStatus } from "../../../../../db/postgres/cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";
const schema = z.object({ id: z.string().uuid(), status: z.enum(INQUIRY_STATUSES) });

export async function PATCH(request: Request) {
  const access = await requirePermission("inquiry.manage");
  if (!access.ok) return access.response;
  try {
    const { id, status } = schema.parse(await readJsonBody(request));
    return NextResponse.json(await setInquiryStatus(requirePostgres(), id, status, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
