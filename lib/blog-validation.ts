import { z } from "zod";
import { blogCategories } from "./blog";

const url = z.string().trim().max(500).regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "URL '/' veya 'https://' ile başlamalı");
const media = z.object({
  url, alt: z.string().trim().min(1, "Alt metin zorunlu").max(200),
  credit: z.string().trim().max(200).default(""), license: z.string().trim().max(200).default(""),
  kind: z.enum(["photo", "illustration", "concept"]).default("photo"),
}).refine((m) => !/^https:\/\//.test(m.url) || (m.credit && m.license), { message: "Dış kaynaklı görsellerde fotoğrafçı/kaynak ve lisans zorunlu" });

const translation = z.object({
  title: z.string().trim().max(160).default(""),
  excerpt: z.string().trim().max(400).default(""),
  bodyMd: z.string().max(60000).default(""),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
});

export const blogInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,89}$/).optional(),
  slug: z.string().regex(/^[a-z0-9-]{3,90}$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  category: z.enum(blogCategories as [string, ...string[]]),
  author: z.string().trim().min(2).max(120),
  featured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  template: z.enum(["article", "recipe"]).default("article"),
  recipe: z.object({
    servings: z.string().trim().max(40).default(""), prepMinutes: z.number().int().min(0).max(1440).nullable().default(null),
    cookMinutes: z.number().int().min(0).max(1440).nullable().default(null),
    ingredients: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
    steps: z.array(z.string().trim().min(1).max(1000)).max(40).default([]),
  }).default({}),
  relatedProductIds: z.array(z.string().max(64)).max(12).default([]),
  cover: media.nullable().default(null),
  gallery: z.array(media).max(24).default([]),
  videoUrl: z.union([z.literal(""), url]).default(""),
  tr: translation.extend({ title: z.string().trim().min(3, "Türkçe başlık zorunlu").max(160) }),
  en: translation.default({}),
});
export type BlogInput = z.infer<typeof blogInputSchema>;

export const blogActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["submit", "approve", "reject", "unpublish", "archive", "restore"]), expectedVersion: z.number().int().positive(), note: z.string().max(500).default("") }),
  z.object({ action: z.literal("publish"), expectedVersion: z.number().int().positive(), note: z.string().max(500).default(""), confirmation: z.string() }),
  z.object({ action: z.literal("schedule"), expectedVersion: z.number().int().positive(), note: z.string().max(500).default(""), confirmation: z.string(), publishAt: z.number().int() }),
  z.object({ action: z.literal("delete"), expectedVersion: z.number().int().positive(), confirmation: z.string() }),
]);
