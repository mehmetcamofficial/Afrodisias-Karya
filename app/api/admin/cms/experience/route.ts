import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { createExperienceSection, listExperienceSections } from "../../../../../db/postgres/showcase-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { experienceInputSchema } from "../../../../../lib/showcase-validation";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requirePermission("cms.read");
  if (!access.ok) return access.response;
  try { return NextResponse.json({ sections: await listExperienceSections(requirePostgres(), { includeArchived: new URL(request.url).searchParams.get("archived") === "1" }) }); }
  catch (error) { return cmsErrorResponse(error); }
}

/** Creates a DRAFT experience section. */
export async function POST(request: Request) {
  const access = await requirePermission("blog.write");
  if (!access.ok) return access.response;
  const parsed = experienceInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return cmsErrorResponse(parsed.error);
  const id = parsed.data.id ?? `${parsed.data.kind}-${Date.now().toString(36)}`;
  try { return NextResponse.json(await createExperienceSection(requirePostgres(), { ...parsed.data, id }, access.email, Date.now()), { status: 201 }); }
  catch (error) { return cmsErrorResponse(error); }
}
