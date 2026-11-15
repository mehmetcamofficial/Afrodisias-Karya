import { z } from "zod";
import { archiveCost } from "../../../../../../../db/postgres/finance-repository";
import { financeMutation } from "../../../../../../../lib/finance-http";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return financeMutation(request, z.object({ expectedVersion: z.number().int().positive() }), ({ db, email, data }) => archiveCost(db, id, data.expectedVersion, email, Date.now()));
}
