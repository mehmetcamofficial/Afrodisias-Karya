import { z } from "zod";

/** Shared validation for CMS collections and experience sections. */
const url = z.string().trim().max(500).regex(/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/, "URL '/' veya 'https://' ile başlamalı");
const slug = z.string().regex(/^[a-z0-9-]{2,80}$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/);

export const coverSchema = z.object({
  url, alt: z.string().trim().min(1, "Alt metin zorunlu").max(200),
  credit: z.string().trim().max(200).default(""), license: z.string().trim().max(200).default(""),
}).refine((m) => !/^https:\/\//.test(m.url) || (m.credit && m.license), { message: "Dış kaynaklı görselde kaynak ve lisans zorunlu" });

const collectionText = z.object({
  title: z.string().trim().max(120).default(""),
  intro: z.string().trim().max(1200).default(""),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
});

export const collectionInputSchema = z.object({
  id: id.optional(),
  slugTr: slug,
  slugEn: slug.nullable().default(null),
  position: z.number().int().min(0).max(999).default(0),
  cover: coverSchema.nullable().default(null),
  tr: collectionText.extend({ title: z.string().trim().min(2, "Türkçe başlık zorunlu").max(120) }),
  en: collectionText.default({}),
}).refine((c) => !c.slugEn || c.en.title, { message: "İngilizce slug için İngilizce başlık zorunlu", path: ["en", "title"] });
export type CollectionInput = z.infer<typeof collectionInputSchema>;

export const collectionProductsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  productIds: z.array(id).max(60).refine((ids) => new Set(ids).size === ids.length, "Aynı ürün iki kez eklenemez"),
});

export const mediaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), url, alt: z.string().trim().min(1).max(200), credit: z.string().trim().max(200).default(""), license: z.string().trim().max(200).default(""), kind: z.enum(["photo", "illustration", "concept"]).default("photo") }),
  z.object({ type: z.literal("video"), url, poster: url, alt: z.string().trim().min(1, "Video için açıklama zorunlu").max(200), credit: z.string().trim().max(200).default(""), license: z.string().trim().max(200).default(""), captionsUrl: z.union([z.literal(""), url]).default("") }),
]).refine((m) => !/^https:\/\//.test(m.url) || (m.credit && m.license), { message: "Dış kaynaklı medyada kaynak ve lisans zorunlu" });

export const EXPERIENCE_KINDS = ["region", "groves", "harvest", "production", "tasting", "stories"] as const;
export const experienceKindLabels: Record<(typeof EXPERIENCE_KINDS)[number], { tr: string; en: string }> = {
  region: { tr: "Aphrodisias ve bölge", en: "Aphrodisias & the region" },
  groves: { tr: "Aile zeytinlikleri", en: "Family groves" },
  harvest: { tr: "Hasat", en: "Harvest" },
  production: { tr: "Üretim süreci", en: "Production" },
  tasting: { tr: "Tadım ve aroma", en: "Tasting & aroma" },
  stories: { tr: "Fotoğraf ve video hikâyeleri", en: "Photo & video stories" },
};

const experienceText = z.object({
  title: z.string().trim().max(160).default(""),
  lead: z.string().trim().max(400).default(""),
  bodyMd: z.string().max(20000).default(""),
});

export const experienceInputSchema = z.object({
  id: id.optional(),
  kind: z.enum(EXPERIENCE_KINDS),
  position: z.number().int().min(0).max(999).default(0),
  media: z.array(mediaSchema).max(12).default([]),
  relatedProductIds: z.array(id).max(12).default([]),
  relatedCollectionIds: z.array(id).max(6).default([]),
  tr: experienceText.extend({ title: z.string().trim().min(2, "Türkçe başlık zorunlu").max(160) }),
  en: experienceText.default({}),
});
export type ExperienceInput = z.infer<typeof experienceInputSchema>;

export const showcaseActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["unpublish", "archive", "restore"]), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal("publish"), expectedVersion: z.number().int().positive(), confirmation: z.string() }),
]);

/** Claims that must not appear in published copy without documentary evidence. */
// Unicode-aware word start: JS \b is ASCII-only and would miss "ödül".
export const UNVERIFIED_CLAIM = /(?<!\p{L})(sertifika|certified|organik|organic|ödül|award|pdo(?!\p{L})|coğrafi işaret|geographical indication|madalya|medal)|\[KAYNAK GEREKLİ\]/iu;
