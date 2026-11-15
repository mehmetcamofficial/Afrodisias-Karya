import { z } from "zod";
import { CURRENCIES } from "./money";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Kimlik: küçük harf, rakam ve tire");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG olmalı").refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Geçersiz tarih");
const minor = z.number().int("Tutar tam sayı (kuruş/sent) olmalı").positive("Tutar sıfırdan büyük olmalı").max(9_000_000_000_000);
const currency = z.enum(CURRENCIES);
const fx = { rate: z.string().max(20).optional(), rateSource: z.string().trim().max(80).optional(), rateDate: date.optional() };

export const accountInputSchema = z.object({ id: id.optional(), name: z.string().trim().min(2).max(80), kind: z.enum(["cash", "bank", "pos", "other"]), currency });
export type AccountInput = z.infer<typeof accountInputSchema>;
export const accountPatchSchema = z.object({ expectedVersion: z.number().int().positive(), name: z.string().trim().min(2).max(80), archived: z.boolean() });

export const categoryInputSchema = z.object({ id: id.optional(), name: z.string().trim().min(2).max(80), direction: z.enum(["income", "expense"]) });
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const counterpartyInputSchema = z.object({
  id: id.optional(), kind: z.enum(["customer", "supplier", "both"]), name: z.string().trim().min(2).max(160),
  taxId: z.string().trim().regex(/^(\d{10}|\d{11})?$/, "Vergi/TC kimlik no 10 veya 11 hane olmalı").default(""),
  email: z.union([z.literal(""), z.string().trim().email()]).default(""), phone: z.string().trim().max(30).default(""), notes: z.string().trim().max(1000).default(""),
});
export type CounterpartyInput = z.infer<typeof counterpartyInputSchema>;

export const entryInputSchema = z.object({
  kind: z.enum(["income", "expense", "collection", "payment"]),
  occurredOn: date, accountId: id, categoryId: id.nullable().default(null), counterpartyId: id.nullable().default(null),
  orderId: z.string().max(80).nullable().default(null),
  currency, amountMinor: minor, ...fx,
  description: z.string().trim().max(500).default(""), externalRef: z.string().trim().max(80).regex(/^[\p{L}\p{N} ._/-]*$/u, "Referans yalnızca harf, rakam ve . _ / - içerebilir").default(""),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9:_-]{8,100}$/, "İşlem anahtarı geçersiz"),
}).refine((e) => e.orderId === null || e.kind === "collection", { message: "Sipariş yalnızca tahsilata bağlanabilir", path: ["orderId"] })
  .refine((e) => e.kind === "collection" || e.kind === "payment" || e.categoryId !== null, { message: "Gelir/gider için kategori zorunlu", path: ["categoryId"] });
export type EntryInput = z.infer<typeof entryInputSchema>;

export const voidSchema = z.object({ expectedVersion: z.number().int().positive(), reason: z.string().trim().min(5, "İptal gerekçesi en az 5 karakter").max(300) });

export const costInputSchema = z.object({
  productId: id, component: z.enum(["olive", "oil", "bottle", "tin", "label", "packaging", "labor", "shipping", "other"]),
  label: z.string().trim().max(120).default(""), currency, amountMinor: minor, ...fx, effectiveFrom: date,
});
export type CostInput = z.infer<typeof costInputSchema>;
