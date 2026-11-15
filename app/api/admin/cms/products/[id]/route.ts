import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePostgres } from "../../../../../../db/postgres/driver";
import { getCmsProduct, listAuditLogs, listProductRevisions, updateCmsProduct } from "../../../../../../db/postgres/cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../lib/cms-http";
import { productInputSchema } from "../../../../../../lib/cms-validation";
import { requirePermission } from "../../../../../admin-auth";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const db = requirePostgres();
    const product = await getCmsProduct(db, id);
    if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    const [revisions, audit] = await Promise.all([listProductRevisions(db, id), listAuditLogs(db, { entityId: id, limit: 30 })]);
    return NextResponse.json({ product, revisions, audit, role: access.role });
  } catch (error) { return cmsErrorResponse(error); }
}

const patchSchema = productInputSchema.extend({ expectedVersion: z.number().int().positive() });

export async function PATCH(request: Request, { params }: Context) {
  const access = await requirePermission("product.write");
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const { expectedVersion, ...input } = patchSchema.parse(await readJsonBody(request));
    return NextResponse.json(await updateCmsProduct(requirePostgres(), id, expectedVersion, input, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
