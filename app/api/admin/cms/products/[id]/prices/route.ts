import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { approveProductPrice, revokeProductPrice } from "../../../../../../../db/postgres/product-cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  // The approver states the exact amount they reviewed; it must equal the stored price.
  z.object({ action: z.literal("approve"), currency: z.enum(["TRY", "EUR", "USD"]), amountMinor: z.number().int().positive().max(100_000_000), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal("revoke"), currency: z.enum(["TRY", "EUR", "USD"]) }),
]);

/** Commercial price approval (owner only). Separate from the content workflow; a price change revokes it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("price.approve");
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const body = schema.parse(await readJsonBody(request));
    const db = requirePostgres();
    const now = Date.now();
    return NextResponse.json(body.action === "approve"
      ? await approveProductPrice(db, id, body.expectedVersion, body.currency, body.amountMinor, access.email, now)
      : await revokeProductPrice(db, id, body.currency, access.email, now));
  } catch (error) { return cmsErrorResponse(error); }
}
