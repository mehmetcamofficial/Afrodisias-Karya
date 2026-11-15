import { z } from "zod";

/** Server-side input validation for CMS writes. Never trust the client. */
const text = (max: number) => z.string().trim().max(max);

export const translationSchema = z.object({
  name: text(160),
  description: text(4000).default(""),
  seoTitle: text(70).default(""),
  seoDescription: text(170).default(""),
});

export const productInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "id: küçük harf, rakam ve tire").optional(),
  sku: z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{2,40}$/, "SKU: büyük harf, rakam ve tire").nullable().optional(),
  category: z.enum(["glass", "luxury", "tin", "pantry", "subscription"]),
  size: text(60),
  priceKurus: z.number().int().positive().max(100_000_000),
  currency: z.enum(["TRY", "EUR", "USD"]).default("TRY"),
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
