import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion, NO_ANSWER } from "../../../lib/ai/assistant";
import { limitFromEnv, WindowLimiter } from "../../../lib/ai/limits";
import { AiUnavailableError, getAiProvider } from "../../../lib/ai/provider";
import { readJsonBody } from "../../../lib/cms-http";

export const runtime = "nodejs";

const schema = z.object({ question: z.string().trim().min(3).max(500) });
const perIp = new WindowLimiter(limitFromEnv("AI_PUBLIC_PER_IP", 8), 10 * 60 * 1000);
const daily = new WindowLimiter(limitFromEnv("AI_PUBLIC_DAILY_LIMIT", 300), 24 * 60 * 60 * 1000);

const ipKey = (request: Request) => createHash("sha256")
  .update(`${process.env.CONTACT_IP_SALT ?? "altin-dal"}:${(request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown"}`)
  .digest("hex").slice(0, 32);

/** Visitor assistant: answers only from FAQ/catalogue; falls back to search when AI is off. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Lütfen 3–500 karakterlik bir soru yazın." }, { status: 400 });
  if (!perIp.take(ipKey(request))) return NextResponse.json({ error: "Çok fazla soru gönderildi; lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  let provider = getAiProvider();
  // Over the daily budget the assistant keeps working in search-only mode.
  if (provider && !daily.take("global")) provider = null;
  try {
    const { usage: _usage, ...answer } = await answerQuestion(parsed.data.question, provider);
    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      const fallback = await answerQuestion(parsed.data.question, null);
      return NextResponse.json(fallback);
    }
    console.error("assistant failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ mode: "search", answer: NO_ANSWER, sources: [], handoff: true });
  }
}
