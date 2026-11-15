import { baseCurrency, createCost, listCosts, unitCosts } from "../../../../../db/postgres/finance-repository";
import { CmsError } from "../../../../../db/postgres/cms-repository";
import { financeMutation, financeRoute } from "../../../../../lib/finance-http";
import { costInputSchema } from "../../../../../lib/finance-validation";
import { resolveFx } from "../../../../../lib/money";

export const runtime = "nodejs";
export const GET = () => financeRoute("finance.read", async ({ db }) => ({ costs: await listCosts(db), unitCosts: await unitCosts(db) }));
export const POST = (request: Request) => financeMutation(request, costInputSchema, async ({ db, email, data }) => {
  const currency = await baseCurrency(db);
  const fx = resolveFx({ currency: data.currency, amountMinor: data.amountMinor, rate: data.rate, rateSource: data.rateSource, rateDate: data.rateDate }, currency, data.effectiveFrom);
  if ("error" in fx) throw new CmsError("invalid_state", fx.error);
  return createCost(db, { ...data, ...fx, id: crypto.randomUUID(), baseCurrency: currency }, email, Date.now());
}, 201);
