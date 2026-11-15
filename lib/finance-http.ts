import "server-only";
import { NextResponse } from "next/server";
import type { ZodTypeAny, z } from "zod";
import { requirePermission } from "../app/admin-auth";
import { requirePostgres } from "../db/postgres/driver";
import type { SqlDriver } from "../db/postgres/repository";
import { cmsErrorResponse, readJsonBody } from "./cms-http";
import type { Permission } from "./cms-permissions";

/** Auth + DB + error mapping for finance routes. Writes require finance.write; reads finance.read. */
export async function financeRoute<T>(permission: Permission, work: (ctx: { db: SqlDriver; email: string }) => Promise<T>, status = 200) {
  const access = await requirePermission(permission);
  if (!access.ok) return access.response;
  try { return NextResponse.json(await work({ db: requirePostgres(), email: access.email }), { status }); }
  catch (error) { return cmsErrorResponse(error); }
}

/**
 * Write helper: permission FIRST (anonymous → 401, no validation details leak),
 * then schema validation (400), then the DB work.
 */
export async function financeMutation<S extends ZodTypeAny, T>(request: Request, schema: S, work: (ctx: { db: SqlDriver; email: string; data: z.infer<S> }) => Promise<T>, status: number | ((result: T) => number) = 200) {
  const access = await requirePermission("finance.write");
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  try {
    const result = await work({ db: requirePostgres(), email: access.email, data: parsed.data });
    return NextResponse.json(result, { status: typeof status === "function" ? status(result) : status });
  }
  catch (error) { return cmsErrorResponse(error); }
}

export const slugId = (name: string) => `${name.toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "kayit"}-${Date.now().toString(36)}`;
