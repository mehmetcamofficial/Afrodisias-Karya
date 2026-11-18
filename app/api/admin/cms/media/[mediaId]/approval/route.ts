import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { setMediaApproval } from "../../../../../../../db/postgres/product-cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";
const schema = z.object({ approve: z.boolean() });

/** Owner confirms that an image truly shows the product (photo) — never possible for concept/range images. */
export async function POST(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const access = await requirePermission("media.approve");
  if (!access.ok) return access.response;
  try {
    const { mediaId } = await params;
    const { approve } = schema.parse(await readJsonBody(request));
    return NextResponse.json(await setMediaApproval(requirePostgres(), mediaId, approve, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
