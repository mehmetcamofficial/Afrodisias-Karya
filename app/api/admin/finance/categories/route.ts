import { createCategory, listCategories } from "../../../../../db/postgres/finance-repository";
import { financeMutation, financeRoute, slugId } from "../../../../../lib/finance-http";
import { categoryInputSchema } from "../../../../../lib/finance-validation";

export const runtime = "nodejs";
export const GET = () => financeRoute("finance.read", async ({ db }) => ({ categories: await listCategories(db) }));
export const POST = (request: Request) => financeMutation(request, categoryInputSchema, ({ db, email, data }) => createCategory(db, { ...data, id: data.id ?? slugId(data.name) }, email, Date.now()), 201);
