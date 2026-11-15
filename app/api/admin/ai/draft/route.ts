import { NextResponse } from "next/server";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { countAiUsageSince, listCmsProducts, recordAiUsage } from "../../../../../db/postgres/cms-repository";
import { aiTaskSchema, buildTask, localQualityChecks } from "../../../../../lib/ai/admin-tasks";
import { findDuplicates } from "../../../../../lib/ai/duplicates";
import { limitFromEnv } from "../../../../../lib/ai/limits";
import { aiStatus, AiUnavailableError, getAiProvider } from "../../../../../lib/ai/provider";
import { cmsErrorResponse, readJsonBody } from "../../../../../lib/cms-http";
import { requirePermission } from "../../../../admin-auth";

export const runtime = "nodejs";
const DAY = 24 * 60 * 60 * 1000;

/** AI status for the admin UI (never includes keys). */
export async function GET() {
  const access = await requirePermission("ai.use");
  if (!access.ok) return access.response;
  return NextResponse.json({ ...aiStatus(), dailyLimit: limitFromEnv("AI_ADMIN_DAILY_LIMIT", 100) });
}

/**
 * Returns a DRAFT for the editor to review. It never writes product or blog
 * data, never touches price/stock and never publishes.
 */
export async function POST(request: Request) {
  const access = await requirePermission("ai.use");
  if (!access.ok) return access.response;
  try {
    const task = aiTaskSchema.parse(await readJsonBody(request));
    const db = requirePostgres();

    // Deterministic checks run even without an AI provider.
    let local: { issues: ReturnType<typeof localQualityChecks>; duplicates: ReturnType<typeof findDuplicates> } | null = null;
    if (task.task === "quality_check") {
      const others = (await listCmsProducts(db, { includeArchived: true }))
        .filter((p) => p.id !== task.productId && p.tr.description.trim())
        .map((p) => ({ id: p.id, text: p.tr.description }));
      local = { issues: localQualityChecks(task.input), duplicates: findDuplicates(task.input.tr.description, others) };
    }

    const provider = getAiProvider();
    if (!provider) {
      if (local) return NextResponse.json({ ai: false, reason: aiStatus().reason, local });
      return NextResponse.json({ error: `Yapay zekâ kapalı: ${aiStatus().reason}. Taslak elle yazılabilir.` }, { status: 503 });
    }
    const limit = limitFromEnv("AI_ADMIN_DAILY_LIMIT", 100);
    const now = Date.now();
    if ((await countAiUsageSince(db, now - DAY)) >= limit) {
      return NextResponse.json({ error: `Günlük yapay zekâ sınırına ulaşıldı (${limit}).`, local }, { status: 429 });
    }
    const spec = buildTask(task);
    const result = await provider.generateJson(spec);
    const draft = spec.output.safeParse(result.data);
    await recordAiUsage(db, access.email, { task: task.task, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens }, now);
    if (!draft.success) return NextResponse.json({ error: "Yapay zekâ yanıtı beklenen biçimde değil; taslak kullanılmadı.", local }, { status: 502 });
    return NextResponse.json({ ai: true, model: result.model, draft: draft.data, local });
  } catch (error) {
    if (error instanceof AiUnavailableError) return NextResponse.json({ error: error.message }, { status: 502 });
    return cmsErrorResponse(error);
  }
}
