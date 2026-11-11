import { products, type Product } from "./products";

/**
 * Server-side order validation.
 *
 * The client is never trusted for prices, product names or totals: every line
 * is resolved against the catalogue and priced in TRY kuruş (the currency the
 * order is recorded and will be charged in). This module is pure so it can be
 * unit-tested without a database.
 */

export const MAX_QTY_PER_LINE = 20;
export const MAX_LINES = 30;

const LIMITS = { customerName: 120, email: 254, phone: 32, address: 600 } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d][\d\s()-]{6,31}$/;
const IDEMPOTENCY_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrderLine = { id: string; name: string; size: string; qty: number; unitKurus: number; lineKurus: number };
export type ValidOrder = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: OrderLine[];
  totalKurus: number;
};
export type OrderError = { field: string; code: string };
export type OrderValidation = { ok: true; order: ValidOrder } | { ok: false; errors: OrderError[] };

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

/** Only products with a TRY price and stock can be ordered. */
export function orderableProduct(id: string, catalogue: Product[] = products): Product | undefined {
  const product = catalogue.find((item) => item.id === id);
  return product && typeof product.prices.TRY === "number" && product.prices.TRY > 0 ? product : undefined;
}

export function validateOrder(input: unknown, catalogue: Product[] = products): OrderValidation {
  const errors: OrderError[] = [];
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const customerName = text(body.customerName, LIMITS.customerName);
  const email = text(body.email, LIMITS.email);
  const phone = text(body.phone, LIMITS.phone);
  const address = text(body.address, LIMITS.address);
  if (!customerName) errors.push({ field: "customerName", code: "required" });
  if (!email || !EMAIL.test(email)) errors.push({ field: "email", code: "invalid" });
  if (!phone || !PHONE.test(phone)) errors.push({ field: "phone", code: "invalid" });
  if (!address) errors.push({ field: "address", code: "required" });

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0 || rawItems.length > MAX_LINES) errors.push({ field: "items", code: "invalid" });

  // Merge duplicate lines so the quantity limit and stock check cannot be bypassed.
  const quantities = new Map<string, number>();
  for (const raw of rawItems.slice(0, MAX_LINES)) {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    const qty = item.qty;
    if (!orderableProduct(id, catalogue)) { errors.push({ field: `items.${id || "?"}`, code: "unknown_product" }); continue; }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) { errors.push({ field: `items.${id}`, code: "invalid_quantity" }); continue; }
    quantities.set(id, (quantities.get(id) ?? 0) + qty);
  }

  const items: OrderLine[] = [];
  for (const [id, qty] of quantities) {
    const product = orderableProduct(id, catalogue)!;
    if (qty > MAX_QTY_PER_LINE) { errors.push({ field: `items.${id}`, code: "quantity_limit" }); continue; }
    if (qty > product.stock) { errors.push({ field: `items.${id}`, code: "insufficient_stock" }); continue; }
    const unitKurus = Math.round(product.prices.TRY! * 100);
    items.push({ id, name: product.name, size: product.size, qty, unitKurus, lineKurus: unitKurus * qty });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    order: {
      customerName: customerName!, email: email!.toLowerCase(), phone: phone!, address: address!,
      items, totalKurus: items.reduce((sum, line) => sum + line.lineKurus, 0),
    },
  };
}

/**
 * Derives a stable order id from the client's idempotency key, so a retried
 * submission (double click, network retry) maps to the same order row instead
 * of creating a duplicate. Falls back to a random id when no key is supplied.
 */
export function orderIdFor(idempotencyKey: string | null | undefined, random: () => string = () => crypto.randomUUID()): string {
  const key = idempotencyKey && IDEMPOTENCY_KEY.test(idempotencyKey) ? idempotencyKey : random();
  return `AD-${key.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}
