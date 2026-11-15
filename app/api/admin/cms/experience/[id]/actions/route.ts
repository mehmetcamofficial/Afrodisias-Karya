import { getExperienceSection, transitionExperienceSection } from "../../../../../../../db/postgres/showcase-repository";
import { handleShowcaseAction } from "../../../../../../../lib/showcase-http";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleShowcaseAction(request, id, {
    transition: transitionExperienceSection,
    publishedText: async (db, key) => { const s = await getExperienceSection(db, key); return s ? [s.tr.title, s.tr.lead, s.tr.bodyMd, s.en.title, s.en.lead, s.en.bodyMd].join("\n") : null; },
  });
}
