import { updateAccount } from "../../../../../../db/postgres/finance-repository";
import { financeMutation } from "../../../../../../lib/finance-http";
import { accountPatchSchema } from "../../../../../../lib/finance-validation";

export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return financeMutation(request, accountPatchSchema, ({ db, email, data }) => updateAccount(db, id, data.expectedVersion, { name: data.name, archived: data.archived }, email, Date.now()));
}
