import { NextResponse } from "next/server";
import { deleteBlogPost, getBlogPost, transitionBlogPost } from "../../../../../../../db/postgres/blog-repository";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { adminEnvironment } from "../../../../../../../lib/admin-environment";
import { blogActionSchema } from "../../../../../../../lib/blog-validation";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import type { Permission } from "../../../../../../../lib/cms-permissions";
import { confirmationFor } from "../../../../../../../lib/cms-validation";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";
const REVIEW_MARKER = /Yayın öncesi doğrulanacaklar|\[KAYNAK GEREKLİ\]/;

const PERMISSION: Record<string, Permission> = {
  submit: "blog.write", archive: "blog.write", approve: "blog.publish", reject: "blog.publish", schedule: "blog.publish",
  publish: "blog.publish", unpublish: "blog.publish", restore: "blog.publish", delete: "blog.delete",
};

/** Human-only workflow. Publishing/scheduling need a typed confirmation and the Preview publish gate. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = blogActionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const body = parsed.data;
  const access = await requirePermission(PERMISSION[body.action]);
  if (!access.ok) return access.response;
  const { id } = await params;
  if (body.action === "publish" || body.action === "schedule") {
    if (!adminEnvironment().publishing) return NextResponse.json({ error: "Yayımlama bu ortamda kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED)" }, { status: 403 });
    if (body.confirmation !== confirmationFor("publish", id)) return NextResponse.json({ error: `Onay için ${confirmationFor("publish", id)} yazın` }, { status: 400 });
  }
  if (body.action === "delete" && body.confirmation !== confirmationFor("delete", id)) {
    return NextResponse.json({ error: `Kalıcı silme için ${confirmationFor("delete", id)} yazın` }, { status: 400 });
  }
  try {
    const db = requirePostgres();
    const now = Date.now();
    if (body.action === "publish" || body.action === "schedule") {
      const post = await getBlogPost(db, id);
      if (post && REVIEW_MARKER.test(post.tr.bodyMd + post.en.bodyMd)) {
        return NextResponse.json({ error: "Metinde 'Yayın öncesi doğrulanacaklar' notları duruyor; doğrulayıp silmeden yayımlanamaz" }, { status: 422 });
      }
    }
    if (body.action === "delete") return NextResponse.json(await deleteBlogPost(db, id, body.expectedVersion, access.email, now));
    return NextResponse.json(await transitionBlogPost(db, id, body.expectedVersion, body.action, access.email, body.note, now, body.action === "schedule" ? body.publishAt : undefined));
  } catch (error) { return cmsErrorResponse(error); }
}
