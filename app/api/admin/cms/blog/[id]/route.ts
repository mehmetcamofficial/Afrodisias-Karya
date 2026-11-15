import { NextResponse } from "next/server";
import { z } from "zod";
import { getBlogPost, listBlogVersions, updateBlogPost } from "../../../../../../db/postgres/blog-repository";
import { listAuditLogs } from "../../../../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../../../../db/postgres/driver";
import { reservedSlugReason } from "../../../../../../lib/blog-slugs";
import { blogInputSchema } from "../../../../../../lib/blog-validation";
import { cmsErrorResponse, readJsonBody } from "../../../../../../lib/cms-http";
import { requirePermission } from "../../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  const { id } = await params;
  try {
    const db = requirePostgres();
    const post = await getBlogPost(db, id);
    if (!post) return NextResponse.json({ error: "Yazı bulunamadı" }, { status: 404 });
    return NextResponse.json({ post, versions: await listBlogVersions(db, id), audit: await listAuditLogs(db, { entityId: id }) });
  } catch (error) { return cmsErrorResponse(error); }
}

const patchSchema = blogInputSchema.and(z.object({ expectedVersion: z.number().int().positive() }));

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = patchSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const { id } = await params;
  const reserved = reservedSlugReason(parsed.data.slug, { allowCodeDraft: parsed.data.slug });
  if (reserved) return NextResponse.json({ error: `Slug kullanılamaz: ${reserved}` }, { status: 409 });
  try {
    const { expectedVersion, ...input } = parsed.data;
    return NextResponse.json(await updateBlogPost(requirePostgres(), id, expectedVersion, input, access.email, Date.now()));
  } catch (error) { return cmsErrorResponse(error); }
}
