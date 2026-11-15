import { createAccount, listAccounts } from "../../../../../db/postgres/finance-repository";
import { financeMutation, financeRoute, slugId } from "../../../../../lib/finance-http";
import { accountInputSchema } from "../../../../../lib/finance-validation";

export const runtime = "nodejs";
export const GET = () => financeRoute("finance.read", async ({ db }) => ({ accounts: await listAccounts(db) }));
export const POST = (request: Request) => financeMutation(request, accountInputSchema, ({ db, email, data }) => createAccount(db, { ...data, id: data.id ?? slugId(data.name) }, email, Date.now()), 201);
