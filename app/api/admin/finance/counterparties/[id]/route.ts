import { z } from "zod";
import { updateCounterparty } from "../../../../../../db/postgres/finance-repository";
import { financeMutation } from "../../../../../../lib/finance-http";
import { counterpartyInputSchema } from "../../../../../../lib/finance-validation";

export const runtime = "nodejs";
const schema = counterpartyInputSchema.extend({ expectedVersion: z.number().int().positive(), archived: z.boolean().default(false) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return financeMutation(request, schema, ({ db, email, data: { expectedVersion, ...input } }) => updateCounterparty(db, id, expectedVersion, input, email, Date.now()));
}
