import { NextResponse } from "next/server";
import { z } from "zod";
import { listAuditLogs } from "../../../../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../../../../db/postgres/driver";
import { getCollection, updateCollection } from "../../../../../../db/postgres/showcase-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../lib/cms-http";
import { collectionInputSchema } from "../../../../../../lib/showcase-validation";
import { requirePermission } from "../../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  const { id } = await params;
  try {
    const db = requirePostgres();
    const collection = await getCollection(db, id);
    if (!collection) return NextResponse.json({ error: "Koleksiyon bulunamadı" }, { status: 404 });
    return NextResponse.json({ collection, audit: await listAuditLogs(db, { entityId: id, limit: 30 }) });
  } catch (error) { return cmsErrorResponse(error); }
}

const patchSchema = collectionInputSchema.and(z.object({ expectedVersion: z.number().int().positive() }));

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = patchSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const { id } = await params;
  const { expectedVersion, ...input } = parsed.data;
  try { return NextResponse.json(await updateCollection(requirePostgres(), id, expectedVersion, input, access.email, Date.now())); }
  catch (error) { return cmsErrorResponse(error); }
}
