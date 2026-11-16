import { z } from "zod";

/** Server-side input validation for CMS writes. Never trust the client. */
const text = (max: number) => z.string().trim().max(max);

export const translationSchema = z.object({
  name: text(160),
  description: text(4000).default(""),
  seoTitle: text(70).default(""),
  seoDescription: text(170).default(""),
  // 0007 product content. Empty means "not stated" — the site never fills it in.
  origin: text(600).default(""),
  ingredients: text(1200).default(""),
  usage: text(1200).default(""),
  storage: text(600).default(""),
});

export const PACKAGING = ["glass_bottle", "tin", "gift_box", "jar", "pouch", "box", "set", "subscription", "experience"] as const;
const cents = z.number().int().positive().max(100_000_000).nullable().default(null);

export const productInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "id: küçük harf, rakam ve tire").optional(),
  sku: z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{2,40}$/, "SKU: büyük harf, rakam ve tire").nullable().optional(),
  category: z.enum(["glass", "luxury", "tin", "pantry", "subscription"]),
  size: text(60),
  /** TRY price in kuruş. `currency` is the base currency and is always TRY (0007). */
  priceKurus: z.number().int().positive().max(100_000_000),
  currency: z.literal("TRY").default("TRY"),
  /** Business-set prices; null = not sold in that currency. Never derived by exchange rate. */
  priceEurCents: cents,
  priceUsdCents: cents,
  packaging: z.enum(PACKAGING).nullable().default(null),
  netVolumeMl: z.number().int().positive().max(100_000).nullable().default(null),
  netWeightG: z.number().int().positive().max(100_000).nullable().default(null),
  sizeFamily: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "Boy ailesi: küçük harf, rakam ve tire").nullable().default(null),
  shipsTo: z.array(z.string().regex(/^[A-Z]{2}$/, "Ülke kodu: ISO 3166-1 alfa-2 (ör. TR)")).max(60).default(["TR"]),
  stock: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().trim().regex(/^[\p{L}\p{N} -]{1,30}$/u)).max(12).default([]),
  tr: translationSchema.extend({ name: text(160).min(2, "Türkçe ad zorunlu") }),
  en: translationSchema.partial().default({}),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productActionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "publish", "unpublish", "archive", "restore", "delete", "duplicate"]),
  expectedVersion: z.number().int().positive(),
  note: text(500).default(""),
  /** Publishing and deleting require typing an exact phrase (human intent). */
  confirmation: text(120).default(""),
  newId: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/).optional(),
});
export type ProductAction = z.infer<typeof productActionSchema>;

export function confirmationFor(action: "publish" | "delete", id: string) {
  return action === "publish" ? `YAYINLA:${id}` : `SIL:${id}`;
}

export const inquirySchema = z.object({
  name: text(120).min(1),
  email: z.string().trim().email().max(254),
  topic: z.enum(["product", "order", "corporate", "club", "other"]),
  message: text(2000).min(5),
  consent: z.literal(true),
  /** Honeypot: real visitors never fill this hidden field. */
  website: z.string().max(0).optional().default(""),
});
