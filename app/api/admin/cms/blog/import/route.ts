import { NextResponse } from "next/server";
import { z } from "zod";
import { createBlogPost } from "../../../../../../db/postgres/blog-repository";
import { requirePostgres } from "../../../../../../db/postgres/driver";
import { blogPosts } from "../../../../../../lib/blog";
import { cmsErrorResponse, readJsonBody } from "../../../../../../lib/cms-http";
import { requirePermission } from "../../../../../admin-auth";

export const runtime = "nodejs";

/**
 * Copies a code-based DRAFT into the CMS as a DRAFT so it can be edited.
 * It never imports published posts and never changes status; review notes
 * become the first lines of the body so they are not lost.
 */
export async function POST(request: Request) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = z.object({ slug: z.string().max(90) }).safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const source = blogPosts.find((post) => post.slug === parsed.data.slug);
  if (!source) return NextResponse.json({ error: "Kod tabanlı yazı bulunamadı" }, { status: 404 });
  if (source.status !== "draft") return NextResponse.json({ error: "Yalnızca taslaklar içe aktarılabilir; yayındaki yazı kodda kalır" }, { status: 409 });
  const notes = source.reviewNotes?.length ? ["> Yayın öncesi doğrulanacaklar (yayımlamadan önce bu satırları silin):", ...source.reviewNotes.map((note) => `> - ${note}`)] : [];
  try {
    return NextResponse.json(await createBlogPost(requirePostgres(), {
      id: source.slug, slug: source.slug, category: source.category, author: source.author, featured: false, tags: [],
      template: source.category === "Ege Mutfağından Tarifler" ? "recipe" : "article",
      recipe: { servings: "", prepMinutes: null, cookMinutes: null, ingredients: [], steps: [] },
      relatedProductIds: source.relatedProductIds,
      cover: source.cover ? { url: source.cover.src, alt: source.cover.alt, credit: source.cover.credit ?? "", license: "", kind: "photo" } : null,
      gallery: [], videoUrl: "",
      tr: { title: source.title, excerpt: source.excerpt, bodyMd: [...notes, ...source.body].join("\n"), seoTitle: source.seoTitle ?? "", seoDescription: source.seoDescription ?? "" },
      en: { title: "", excerpt: "", bodyMd: "", seoTitle: "", seoDescription: "" },
    }, access.email, Date.now(), "code-import"), { status: 201 });
  } catch (error) { return cmsErrorResponse(error); }
}
