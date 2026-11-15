import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { createCollection, listCollections } from "../../../../../db/postgres/showcase-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { collectionInputSchema } from "../../../../../lib/showcase-validation";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  try { return NextResponse.json({ collections: await listCollections(requirePostgres(), { includeArchived: new URL(request.url).searchParams.get("archived") === "1" }) }); }
  catch (error) { return cmsErrorResponse(error); }
}

/** Creates a DRAFT collection. */
export async function POST(request: Request) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = collectionInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  try { return NextResponse.json(await createCollection(requirePostgres(), { ...parsed.data, id: parsed.data.id ?? parsed.data.slugTr }, access.email, Date.now()), { status: 201 }); }
  catch (error) { return cmsErrorResponse(error); }
}
