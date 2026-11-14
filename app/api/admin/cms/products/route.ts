import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { createCmsProduct, listCmsProducts } from "../../../../../db/postgres/cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { productInputSchema } from "../../../../../lib/cms-validation";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  try {
    const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
    return NextResponse.json(await listCmsProducts(requirePostgres(), { includeArchived }));
  } catch (error) { return cmsErrorResponse(error); }
}

export async function POST(request: Request) {
  const access = await requirePermission("product.write");
  if (!access.ok) return access.response;
  try {
    const input = productInputSchema.parse(await readJsonBody(request));
    if (!input.id) return NextResponse.json({ error: "Ürün kimliği (id) zorunlu" }, { status: 400 });
    const saved = await createCmsProduct(requirePostgres(), { ...input, id: input.id }, access.email, Date.now());
    return NextResponse.json(saved, { status: 201 });
  } catch (error) { return cmsErrorResponse(error); }
}
