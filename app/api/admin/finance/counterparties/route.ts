import { createCounterparty, listCounterparties } from "../../../../../db/postgres/finance-repository";
import { financeMutation, financeRoute, slugId } from "../../../../../lib/finance-http";
import { counterpartyInputSchema } from "../../../../../lib/finance-validation";

export const runtime = "nodejs";
export const GET = () => financeRoute("finance.read", async ({ db }) => ({ counterparties: await listCounterparties(db) }));
export const POST = (request: Request) => financeMutation(request, counterpartyInputSchema, ({ db, email, data }) => createCounterparty(db, { ...data, id: data.id ?? slugId(data.name) }, email, Date.now()), 201);
