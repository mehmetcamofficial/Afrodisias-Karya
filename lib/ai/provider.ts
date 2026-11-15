import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Swappable AI provider. The rest of the app only sees `AiProvider`; adding
 * another vendor means adding one implementation here. With no key configured
 * (or AI_ENABLED=false) `getAiProvider()` returns null and every AI feature
 * degrades to a clearly labelled non-AI fallback. Keys are read from the
 * environment and never logged or returned.
 */
export type JsonRequest = { system: string; prompt: string; schema: Record<string, unknown>; maxTokens: number };
export type JsonResult = { data: unknown; model: string; inputTokens: number; outputTokens: number };
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateJson(request: JsonRequest): Promise<JsonResult>;
}

export class AiUnavailableError extends Error {}

export const DEFAULT_MODEL = "claude-opus-5-5";

export type AiStatus = { enabled: boolean; provider: string | null; model: string | null; reason: string };

export function aiStatus(env: Record<string, string | undefined> = process.env): AiStatus {
  if (env.AI_ENABLED === "false") return { enabled: false, provider: null, model: null, reason: "AI_ENABLED=false ile kapatıldı" };
  const provider = (env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider !== "anthropic") return { enabled: false, provider, model: null, reason: `Desteklenmeyen sağlayıcı: ${provider}` };
  if (!env.ANTHROPIC_API_KEY) return { enabled: false, provider, model: null, reason: "API anahtarı tanımlı değil (ANTHROPIC_API_KEY)" };
  return { enabled: true, provider, model: env.AI_MODEL || DEFAULT_MODEL, reason: "Etkin" };
}

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client = new Anthropic({ maxRetries: 1, timeout: 60_000 });
  constructor(readonly model: string) {}

  async generateJson({ system, prompt, schema, maxTokens }: JsonRequest): Promise<JsonResult> {
    let response;
    try {
      response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      // Short editorial tasks: low effort keeps latency and cost down.
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      // On a safety decline the API re-runs the request on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      });
    } catch (error) {
      // Typed SDK errors → a safe message; details (never the key) go to the server log.
      if (error instanceof Anthropic.RateLimitError) throw new AiUnavailableError("Yapay zekâ sağlayıcısı şu anda yoğun; biraz sonra tekrar deneyin.");
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new AiUnavailableError("Yapay zekâ anahtarı geçersiz veya yetkisiz.");
      if (error instanceof Anthropic.APIConnectionError) throw new AiUnavailableError("Yapay zekâ sağlayıcısına bağlanılamadı.");
      if (error instanceof Anthropic.APIError) { console.error("ai provider error", error.status); throw new AiUnavailableError("Yapay zekâ sağlayıcısı hata döndürdü."); }
      throw error;
    }
    if (response.stop_reason === "refusal") throw new AiUnavailableError("Model bu isteği yanıtlamadı.");
    if (response.stop_reason === "max_tokens") throw new AiUnavailableError("Yanıt uzunluk sınırında kesildi.");
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new AiUnavailableError("Model geçerli JSON döndürmedi."); }
    return { data, model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  }
}

let cached: { key: string; provider: AiProvider } | null = null;

export function getAiProvider(): AiProvider | null {
  const status = aiStatus();
  if (!status.enabled || !status.model) return null;
  const key = `${status.provider}:${status.model}`;
  if (cached?.key !== key) cached = { key, provider: new AnthropicProvider(status.model) };
  return cached.provider;
}

/** Test hook: inject a fake provider. */
export function __setAiProviderForTests(provider: AiProvider | null) {
  cached = provider ? { key: `${aiStatus().provider}:${aiStatus().model}`, provider } : null;
}
