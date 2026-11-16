import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../../../../db/postgres/driver";
import { unlinkProductMedia } from "../../../../../../../../db/postgres/product-cms-repository";
import { cmsErrorResponse } from "../../../../../../../../lib/cms-http";
import { requirePermission } from "../../../../../../../admin-auth";

export const runtime = "nodejs";

/** Detaches an image from a product. The asset and its audit history stay. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const access = await requirePermission("media.write");
  if (!access.ok) return access.response;
  try {
    const { id, mediaId } = await params;
    return NextResponse.json(await unlinkProductMedia(requirePostgres(), id, mediaId, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
