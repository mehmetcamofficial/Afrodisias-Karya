import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CmsError } from "../db/postgres/cms-repository";

/** Maps CMS/validation/database errors to safe JSON responses (no internals leaked). */
export function cmsErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Geçersiz veri", issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  }
  if (error instanceof CmsError) {
    const status = { not_found: 404, conflict: 409, version_mismatch: 409, invalid_state: 422, protected: 409 }[error.code];
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("cms request failed", error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: "Veritabanı işlemi tamamlanamadı; hiçbir değişiklik kaydedilmedi" }, { status: 503 });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return undefined; }
}
