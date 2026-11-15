import "server-only";
import { NextResponse } from "next/server";
import { requirePermission } from "../app/admin-auth";
import { requirePostgres } from "../db/postgres/driver";
import type { SqlDriver } from "../db/postgres/repository";
import { adminEnvironment } from "./admin-environment";
import { cmsErrorResponse, readJsonBody } from "./cms-http";
import type { Permission } from "./cms-permissions";
import { confirmationFor } from "./cms-validation";
import { showcaseActionSchema, UNVERIFIED_CLAIM } from "./showcase-validation";

type Action = "publish" | "unpublish" | "archive" | "restore";
const PERMISSION: Record<Action, Permission> = { publish: "blog.publish", unpublish: "blog.publish", restore: "blog.publish", archive: "blog.write" };

/**
 * Shared workflow endpoint for collections and experience sections.
 * Publishing: owner + Preview publish gate + typed confirmation + no unverified claims in the text.
 */
export async function handleShowcaseAction(request: Request, id: string, ops: {
  transition: (db: SqlDriver, id: string, v: number, action: Action, actor: string, now: number) => Promise<unknown>;
  publishedText: (db: SqlDriver, id: string) => Promise<string | null>;
}) {
  const parsed = showcaseActionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const body = parsed.data;
  const access = await requirePermission(PERMISSION[body.action]);
  if (!access.ok) return access.response;
  if (body.action === "publish") {
    if (!adminEnvironment().publishing) return NextResponse.json({ error: "Yayımlama bu ortamda kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED)" }, { status: 403 });
    if (body.confirmation !== confirmationFor("publish", id)) return NextResponse.json({ error: `Onay için ${confirmationFor("publish", id)} yazın` }, { status: 400 });
  }
  try {
    const db = requirePostgres();
    if (body.action === "publish") {
      const text = await ops.publishedText(db, id);
      if (text && UNVERIFIED_CLAIM.test(text)) {
        return NextResponse.json({ error: "Metinde belge gerektiren bir iddia (sertifika, ödül, organik, coğrafi işaret…) veya [KAYNAK GEREKLİ] var; kanıt eklenmeden yayımlanamaz" }, { status: 422 });
      }
    }
    return NextResponse.json(await ops.transition(db, id, body.expectedVersion, body.action, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
