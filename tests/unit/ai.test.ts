import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import * as repo from "../../db/postgres/cms-repository";
import { localQualityChecks } from "../../lib/ai/admin-tasks";
import { answerQuestion, NO_ANSWER } from "../../lib/ai/assistant";
import { findDuplicates, similarity } from "../../lib/ai/duplicates";
import { retrieve } from "../../lib/ai/knowledge";
import { WindowLimiter } from "../../lib/ai/limits";
import { __setAiProviderForTests, aiStatus, type AiProvider } from "../../lib/ai/provider";

vi.mock("server-only", () => ({}));
vi.mock("../../app/chatgpt-auth", async (importOriginal) => ({ ...(await importOriginal<object>()), getChatGPTUser: vi.fn() }));
vi.mock("../../db/postgres/driver", () => ({ requirePostgres: vi.fn(() => ({})) }));
vi.mock("../../db/postgres/cms-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findAdminRole: vi.fn(async (_db: unknown, email: string) => ({ "editor@example.test": "editor", "viewer@example.test": "viewer" } as Record<string, "editor" | "viewer">)[email] ?? null),
  listCmsProducts: vi.fn(async () => [{ id: "other", tr: { description: "Ataeymir zeytinliğinden erken hasat soğuk sıkım zeytinyağı sofralar için" } }]),
  countAiUsageSince: vi.fn(async () => 0),
  recordAiUsage: vi.fn(async () => undefined),
}));

const fake = (data: unknown): AiProvider => ({ name: "fake", model: "fake-model", generateJson: vi.fn(async () => ({ data, model: "fake-model", inputTokens: 10, outputTokens: 5 })) });
const as = (email: string | null) => vi.mocked(getChatGPTUser).mockResolvedValue(email ? { userId: "u", email, fullName: null, displayName: email } : null);
const post = (body: unknown, ip = "203.0.113.1") => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });

describe("provider status", () => {
  it("is disabled without a key, with the kill switch, or with an unknown provider — and never echoes the key", () => {
    expect(aiStatus({}).enabled).toBe(false);
    expect(aiStatus({ ANTHROPIC_API_KEY: "sk-test-secret", AI_ENABLED: "false" }).enabled).toBe(false);
    expect(aiStatus({ ANTHROPIC_API_KEY: "sk-test-secret", AI_PROVIDER: "other" }).enabled).toBe(false);
    const on = aiStatus({ ANTHROPIC_API_KEY: "sk-test-secret" });
    expect(on).toMatchObject({ enabled: true, provider: "anthropic", model: "claude-opus-5-5" });
    expect(JSON.stringify(on)).not.toContain("sk-test-secret");
  });
});

describe("grounded visitor assistant", () => {
  it("retrieves the storage guide and FAQ, and nothing for unrelated text", () => {
    expect(retrieve("Zeytinyağı nasıl saklanır?").map((s) => s.id)).toContain("guide-storage");
    expect(retrieve("qwxz plorf")).toEqual([]);
  });
  it("without AI answers from site text (search mode)", async () => {
    const answer = await answerQuestion("zeytinyağı nasıl saklanmalı", null);
    expect(answer.mode).toBe("search");
    expect(answer.sources.length).toBeGreaterThan(0);
  });
  it("refuses an AI answer that cites no supplied source", async () => {
    const answer = await answerQuestion("zeytinyağı nasıl saklanmalı", fake({ answer: "ISO sertifikalıdır.", sourceIds: ["made-up"], handoff: false }));
    expect(answer).toMatchObject({ answer: NO_ANSWER, handoff: true, sources: [] });
  });
  it("keeps a sourced AI answer and only the cited sources", async () => {
    const answer = await answerQuestion("zeytinyağı nasıl saklanmalı", fake({ answer: "Serin ve karanlık yerde saklayın.", sourceIds: ["guide-storage"], handoff: false }));
    expect(answer).toMatchObject({ mode: "ai", answer: "Serin ve karanlık yerde saklayın." });
    expect(answer.sources.map((s) => s.id)).toEqual(["guide-storage"]);
  });
  it("never calls the model when nothing relevant is found", async () => {
    const provider = fake({});
    expect((await answerQuestion("qwxz plorf", provider)).handoff).toBe(true);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });
});

describe("deterministic editorial checks", () => {
  it("detects near-duplicate descriptions", () => {
    const text = "Ataeymir zeytinliğinden erken hasat soğuk sıkım zeytinyağı sofralar için";
    expect(similarity(text, text)).toBe(1);
    expect(findDuplicates(text, [{ id: "x", text }, { id: "y", text: "Tamamen farklı bir sabun ürünü açıklaması burada" }]).map((d) => d.id)).toEqual(["x"]);
  });
  it("flags unproven claims", () => {
    const empty = { name: "", description: "", seoTitle: "", seoDescription: "" };
    const issues = localQualityChecks({ tr: { ...empty, name: "Yağ", description: "Organik sertifikalı ve şifa veren bir yağ, bol bol açıklama metni burada yer alıyor." }, en: empty });
    expect(issues.some((issue) => issue.severity === "error" && issue.field === "tr.description")).toBe(true);
  });
  it("window limiter blocks after the limit", () => {
    const limiter = new WindowLimiter(2, 1000);
    expect([limiter.take("a", 0), limiter.take("a", 1), limiter.take("a", 2), limiter.take("a", 2000)]).toEqual([true, true, false, true]);
  });
});

describe("admin AI draft API", async () => {
  const { POST } = await import("../../app/api/admin/ai/draft/route");
  const copy = { task: "product_copy", locale: "tr", input: { name: "500 ml Cam Şişe", category: "glass", size: "500 ml", facts: "" } };
  beforeEach(() => { vi.stubEnv("ADMIN_EMAILS", "owner@example.test"); vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("ANTHROPIC_API_KEY", ""); vi.clearAllMocks(); __setAiProviderForTests(null); });
  afterEach(() => { vi.unstubAllEnvs(); __setAiProviderForTests(null); });

  it("anonymous 401, viewer 403", async () => {
    as(null); expect((await POST(post(copy))).status).toBe(401);
    as("viewer@example.test"); expect((await POST(post(copy))).status).toBe(403);
  });
  it("without a key: 503 for drafts, but quality check still runs rule-based", async () => {
    as("editor@example.test");
    expect((await POST(post(copy))).status).toBe(503);
    const empty = { name: "", description: "", seoTitle: "", seoDescription: "" };
    const response = await POST(post({ task: "quality_check", input: { tr: { ...empty, name: "A", description: "Ataeymir zeytinliğinden erken hasat soğuk sıkım zeytinyağı sofralar için" }, en: empty } }));
    const body = (await response.json()) as { ai: boolean; local: { duplicates: Array<{ id: string }> } };
    expect(response.status).toBe(200);
    expect(body.ai).toBe(false);
    expect(body.local.duplicates[0].id).toBe("other");
  });
  it("with a provider: returns a validated draft, records usage, writes nothing else; enforces the daily cap", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    __setAiProviderForTests(fake({ description: "Açıklama", seoTitle: "Başlık", seoDescription: "Meta", missingFacts: ["hasat tarihi"] }));
    as("editor@example.test");
    const response = await POST(post(copy));
    expect(response.status).toBe(200);
    expect(((await response.json()) as { draft: { missingFacts: string[] } }).draft.missingFacts).toEqual(["hasat tarihi"]);
    expect(repo.recordAiUsage).toHaveBeenCalledOnce();
    vi.mocked(repo.countAiUsageSince).mockResolvedValueOnce(100);
    expect((await POST(post(copy))).status).toBe(429);
  });
  it("rejects a draft whose SEO title exceeds 70 characters", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    __setAiProviderForTests(fake({ description: "x", seoTitle: "x".repeat(90), seoDescription: "m", missingFacts: [] }));
    as("owner@example.test");
    expect((await POST(post(copy))).status).toBe(502);
  });
});

describe("public assistant API", async () => {
  const { POST } = await import("../../app/api/assistant/route");
  it("validates input and rate-limits per IP", async () => {
    expect((await POST(post({ question: "x" }))).status).toBe(400);
    const statuses = [];
    for (let i = 0; i < 9; i++) statuses.push((await POST(post({ question: "zeytinyağı nasıl saklanır" }, "198.51.100.77"))).status);
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
    expect(statuses[8]).toBe(429);
  });
});
