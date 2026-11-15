import { getCollection, transitionCollection } from "../../../../../../../db/postgres/showcase-repository";
import { handleShowcaseAction } from "../../../../../../../lib/showcase-http";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleShowcaseAction(request, id, {
    transition: transitionCollection,
    publishedText: async (db, key) => { const c = await getCollection(db, key); return c ? [c.tr.title, c.tr.intro, c.en.title, c.en.intro].join("\n") : null; },
  });
}
