import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { setCollectionProducts } from "../../../../../../../db/postgres/showcase-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import { collectionProductsSchema } from "../../../../../../../lib/showcase-validation";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";

/** Replaces the ordered product list of a collection (published collections return to draft). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = collectionProductsSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const { id } = await params;
  try { return NextResponse.json(await setCollectionProducts(requirePostgres(), id, parsed.data.expectedVersion, parsed.data.productIds, access.email, Date.now())); }
  catch (error) { return cmsErrorResponse(error); }
}
