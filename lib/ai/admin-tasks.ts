import { z } from "zod";
import { MAX_INPUT_CHARS } from "./limits";

/**
 * Admin AI tasks. Each produces a DRAFT the editor reviews; nothing here
 * writes to the database, changes price/stock or publishes.
 */
const GUARDRAILS = `Sen Altın Dal (Aphrodisias Estate, Karacasu/Ataeymir, Aydın) için editoryal yardımcısın.
Kurallar:
- Yalnızca verilen bilgileri kullan. Verilmeyen hiçbir bilgiyi uydurma: sertifika, ödül, laboratuvar sonucu, asit/polifenol değeri, hasat tarihi, fiyat, stok, sağlık iddiası, organik iddiası YAZMA.
- Gerekli ama verilmemiş bilgi varsa metne koyma; "missingFacts" listesine ekle.
- Ürün görselleri temsili tasarım olabilir; görselden ürün özelliği çıkarma.
- Sade, sıcak, abartısız premium bir ton kullan; büyük harf ve ünlem kullanma.`;

const text = (max: number) => z.string().trim().max(max);
const facts = z.object({
  name: text(120).min(1), category: text(40), size: text(40),
  facts: text(MAX_INPUT_CHARS).default(""),
});

export const aiTaskSchema = z.discriminatedUnion("task", [
  z.object({ task: z.literal("product_copy"), locale: z.enum(["tr", "en"]), input: facts }),
  z.object({ task: z.literal("translate"), from: z.enum(["tr", "en"]), input: z.object({ name: text(120), description: text(MAX_INPUT_CHARS), seoTitle: text(70), seoDescription: text(170) }) }),
  z.object({ task: z.literal("alt_text"), input: z.object({ product: text(120).min(1), imageKind: z.enum(["variant", "range", "editorial", "concept"]), context: text(1000).default("") }) }),
  z.object({ task: z.literal("quality_check"), productId: z.string().max(64).optional(), input: z.object({ tr: z.object({ name: text(120), description: text(MAX_INPUT_CHARS), seoTitle: text(70), seoDescription: text(170) }), en: z.object({ name: text(120), description: text(MAX_INPUT_CHARS), seoTitle: text(70), seoDescription: text(170) }) }) }),
  z.object({ task: z.literal("blog_draft"), locale: z.enum(["tr", "en"]), input: z.object({ topic: text(200).min(3), notes: text(MAX_INPUT_CHARS).default("") }) }),
]);
export type AiTask = z.infer<typeof aiTaskSchema>;

type Spec = { system: string; prompt: string; schema: Record<string, unknown>; output: z.ZodTypeAny; maxTokens: number };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const str = { type: "string" };
const strList = { type: "array", items: str };

const copyOut = z.object({ description: z.string().max(1500), seoTitle: z.string().max(70), seoDescription: z.string().max(170), missingFacts: z.array(z.string()) });
const fieldsOut = z.object({ name: z.string().max(120), description: z.string().max(MAX_INPUT_CHARS), seoTitle: z.string().max(70), seoDescription: z.string().max(170) });
const altOut = z.object({ altTr: z.string().max(200), altEn: z.string().max(200) });
const qcOut = z.object({ issues: z.array(z.object({ field: z.string(), severity: z.enum(["error", "warning", "info"]), message: z.string() })) });
const blogOut = z.object({ title: z.string().max(120), excerpt: z.string().max(300), bodyMarkdown: z.string().max(12000), missingFacts: z.array(z.string()) });

const lang = (locale: "tr" | "en") => (locale === "tr" ? "Türkçe" : "İngilizce");

export function buildTask(task: AiTask): Spec {
  switch (task.task) {
    case "product_copy":
      return { system: GUARDRAILS, maxTokens: 4000, output: copyOut,
        schema: obj({ description: str, seoTitle: str, seoDescription: str, missingFacts: strList }),
        prompt: `${lang(task.locale)} ürün açıklaması (en çok 120 kelime), SEO başlığı (≤60 karakter) ve meta açıklama (≤155 karakter) taslağı yaz.\nÜrün: ${task.input.name}\nKategori: ${task.input.category}\nHacim: ${task.input.size}\nDoğrulanmış bilgiler:\n${task.input.facts || "(yok)"}` };
    case "translate": {
      const target = task.from === "tr" ? "en" : "tr";
      return { system: `${GUARDRAILS}\n- Çeviride anlamı koru; yeni bilgi ekleme, bilgi çıkarma.`, maxTokens: 6000, output: fieldsOut,
        schema: obj({ name: str, description: str, seoTitle: str, seoDescription: str }),
        prompt: `Aşağıdaki alanları ${lang(target)} diline çevir. SEO başlığı ≤60, meta açıklama ≤155 karakter olsun.\n${JSON.stringify(task.input)}` };
    }
    case "alt_text":
      return { system: GUARDRAILS, maxTokens: 1000, output: altOut,
        schema: obj({ altTr: str, altEn: str }),
        prompt: `Ekran okuyucular için kısa (≤125 karakter) TR ve EN alt metni yaz. Ürün: ${task.input.product}. Görsel türü: ${task.input.imageKind}${task.input.imageKind === "concept" ? " (yapay zekâyla hazırlanmış temsili ambalaj tasarımı — alt metin bunu belirtmeli)" : ""}. Bağlam: ${task.input.context || "(yok)"}` };
    case "quality_check":
      return { system: `${GUARDRAILS}\nGörevin denetim: uydurma veya kanıtsız iddia, sağlık iddiası, TR/EN tutarsızlığı, yazım hatası, eksik alan, SEO uzunluğu.`, maxTokens: 3000, output: qcOut,
        schema: obj({ issues: { type: "array", items: obj({ field: str, severity: { type: "string", enum: ["error", "warning", "info"] }, message: str }) } }),
        prompt: `Bu ürün metnini denetle ve Türkçe sorun listesi döndür (sorun yoksa boş liste):\n${JSON.stringify(task.input)}` };
    case "blog_draft":
      return { system: `${GUARDRAILS}\n- Blog yazısında dış kaynaklı bilgi kullanacaksan "[KAYNAK GEREKLİ]" ile işaretle.`, maxTokens: 8000, output: blogOut,
        schema: obj({ title: str, excerpt: str, bodyMarkdown: str, missingFacts: strList }),
        prompt: `${lang(task.locale)} bir blog yazısı TASLAĞI yaz (600–900 kelime, Markdown, ara başlıklarla).\nKonu: ${task.input.topic}\nNotlar ve doğrulanmış bilgiler:\n${task.input.notes || "(yok)"}` };
  }
}

/** Deterministic checks that run with or without AI. */
export function localQualityChecks(fields: { tr: { name: string; description: string; seoTitle: string; seoDescription: string }; en: { name: string; description: string; seoTitle: string; seoDescription: string } }) {
  const issues: Array<{ field: string; severity: "error" | "warning" | "info"; message: string }> = [];
  for (const locale of ["tr", "en"] as const) {
    const f = fields[locale];
    if (!f.name.trim()) issues.push({ field: `${locale}.name`, severity: locale === "tr" ? "error" : "warning", message: "Ad boş." });
    if (f.description.trim().length < 60) issues.push({ field: `${locale}.description`, severity: "warning", message: "Açıklama çok kısa (60 karakterden az)." });
    if (!f.seoTitle.trim()) issues.push({ field: `${locale}.seoTitle`, severity: "info", message: "SEO başlığı boş." });
    if (!f.seoDescription.trim()) issues.push({ field: `${locale}.seoDescription`, severity: "info", message: "Meta açıklama boş." });
    if (/\b(sertifika|certified|organik|organic|şifa|cure|heals|tedavi|lab(oratuvar)?)\b/iu.test(f.description)) {
      issues.push({ field: `${locale}.description`, severity: "error", message: "Kanıt gerektiren bir iddia içeriyor (sertifika/organik/sağlık/laboratuvar). Belge yoksa kaldırın." });
    }
  }
  return issues;
}
