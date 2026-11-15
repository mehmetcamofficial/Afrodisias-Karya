import { loadFinanceReport } from "../../../../../lib/finance-report";
import { financeRoute } from "../../../../../lib/finance-http";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  return financeRoute("finance.read", ({ db }) => loadFinanceReport(db, q.get("from"), q.get("to")));
}
