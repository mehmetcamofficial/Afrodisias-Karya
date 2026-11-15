import { NextResponse } from "next/server";
import { createBlogPost, listBlogPosts } from "../../../../../db/postgres/blog-repository";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { reservedSlugReason } from "../../../../../lib/blog-slugs";
import { blogInputSchema } from "../../../../../lib/blog-validation";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  try {
    const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
    return NextResponse.json({ posts: await listBlogPosts(requirePostgres(), { includeArchived }) });
  } catch (error) { return cmsErrorResponse(error); }
}

/** Creates a DRAFT. Nothing is published here. */
export async function POST(request: Request) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = blogInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const reserved = reservedSlugReason(parsed.data.slug);
  if (reserved) return NextResponse.json({ error: `Slug kullanılamaz: ${reserved}` }, { status: 409 });
  try {
    const id = parsed.data.id ?? parsed.data.slug;
    return NextResponse.json(await createBlogPost(requirePostgres(), { ...parsed.data, id }, access.email, Date.now()), { status: 201 });
  } catch (error) { return cmsErrorResponse(error); }
}
