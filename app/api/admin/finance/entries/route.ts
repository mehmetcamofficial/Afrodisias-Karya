import { baseCurrency, createEntry, listEntries } from "../../../../../db/postgres/finance-repository";
import { CmsError } from "../../../../../db/postgres/cms-repository";
import { financeMutation, financeRoute } from "../../../../../lib/finance-http";
import { entryInputSchema } from "../../../../../lib/finance-validation";
import { resolveFx } from "../../../../../lib/money";

export const runtime = "nodejs";
const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const kinds = (q.get("kind") ?? "").split(",").filter((k) => ["income", "expense", "collection", "payment"].includes(k));
  return financeRoute("finance.read", async ({ db }) => ({ entries: await listEntries(db, { kinds, from: date(q.get("from")), to: date(q.get("to")) }) }));
}

/** Posts a ledger entry. FX is resolved server-side against the company base currency. A replay returns the original id (replayed: true). */
export const POST = (request: Request) => financeMutation(request, entryInputSchema, async ({ db, email, data }) => {
  const currency = await baseCurrency(db);
  const fx = resolveFx({ currency: data.currency, amountMinor: data.amountMinor, rate: data.rate, rateSource: data.rateSource, rateDate: data.rateDate }, currency, data.occurredOn);
  if ("error" in fx) throw new CmsError("invalid_state", fx.error);
  return createEntry(db, { ...data, ...fx, id: crypto.randomUUID(), baseCurrency: currency }, email, Date.now());
}, (result) => (result.replayed ? 200 : 201));
