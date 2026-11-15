import { voidEntry } from "../../../../../../../db/postgres/finance-repository";
import { financeMutation } from "../../../../../../../lib/finance-http";
import { voidSchema } from "../../../../../../../lib/finance-validation";

export const runtime = "nodejs";
/** Finance records are never deleted: this posts a reversal entry and flags the original. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return financeMutation(request, voidSchema, ({ db, email, data }) => voidEntry(db, id, data.expectedVersion, data.reason, email, Date.now()));
}
