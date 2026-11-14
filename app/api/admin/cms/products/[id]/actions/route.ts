import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { deleteCmsProduct, duplicateCmsProduct, transitionCmsProduct } from "../../../../../../../db/postgres/cms-repository";
import { adminEnvironment } from "../../../../../../../lib/admin-environment";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import type { Permission } from "../../../../../../../lib/cms-permissions";
import { confirmationFor, productActionSchema, type ProductAction } from "../../../../../../../lib/cms-validation";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";

const PERMISSION: Record<ProductAction["action"], Permission> = {
  submit: "product.submit", approve: "product.approve", reject: "product.approve",
  publish: "product.publish", unpublish: "product.publish", archive: "product.archive",
  restore: "product.restore", delete: "product.delete", duplicate: "product.write",
};

/** Workflow transitions. Every one is a human action: AI never calls this route. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = productActionSchema.safeParse(await readJsonBody(request));
  if (!body.success) return cmsErrorResponse(body.error);
  const { action, expectedVersion, note, confirmation, newId } = body.data;
  const access = await requirePermission(PERMISSION[action]);
  if (!access.ok) return access.response;
  const { id } = await params;
  if (action === "publish") {
    if (!adminEnvironment().publishing) return NextResponse.json({ error: "Yayımlama bu ortamda kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED)" }, { status: 403 });
    if (confirmation !== confirmationFor("publish", id)) return NextResponse.json({ error: `Onay için ${confirmationFor("publish", id)} yazın` }, { status: 400 });
  }
  if (action === "delete" && confirmation !== confirmationFor("delete", id)) {
    return NextResponse.json({ error: `Kalıcı silme için ${confirmationFor("delete", id)} yazın` }, { status: 400 });
  }
  try {
    const db = requirePostgres();
    const now = Date.now();
    if (action === "delete") return NextResponse.json(await deleteCmsProduct(db, id, expectedVersion, access.email, now));
    if (action === "duplicate") {
      if (!newId) return NextResponse.json({ error: "Kopya için yeni kimlik (newId) zorunlu" }, { status: 400 });
      return NextResponse.json(await duplicateCmsProduct(db, id, newId, access.email, now), { status: 201 });
    }
    return NextResponse.json(await transitionCmsProduct(db, id, expectedVersion, action, access.email, note, now));
  } catch (error) { return cmsErrorResponse(error); }
}
