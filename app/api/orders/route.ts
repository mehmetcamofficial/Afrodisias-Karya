import { NextResponse } from "next/server";
import { requirePostgres } from "../../../db/postgres/driver";
import { createPendingOrder, OrderIdempotencyConflictError, listOrders, setOrderStatus } from "../../../db/postgres/repository";
import { orderIdFor, validateOrder } from "../../../lib/orders";
import { getLiveProducts } from "../../../lib/live-products";
import type { Product, ProductCategory } from "../../../lib/products";
import { listProducts } from "../../../db/postgres/repository";
import { adminApiGuard } from "../../admin-auth";

export const runtime = "nodejs";
const ORDER_STATUSES = ["payment_pending", "preparing", "shipped", "completed", "cancelled"] as const;

async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return undefined; }
}

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  try { return NextResponse.json(await listOrders(requirePostgres())); }
  catch (error) { console.error("orders GET database unavailable", error); return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const body = await readJson(request) as { id?: unknown; status?: unknown } | undefined;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  if (!id || !(ORDER_STATUSES as readonly string[]).includes(status))
    return NextResponse.json({ error: "Geçersiz sipariş durumu" }, { status: 400 });
  try {
    const updated = await setOrderStatus(requirePostgres(), id, status);
    if (!updated) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true, id, status });
  } catch (error) { console.error("orders PATCH database unavailable", error); return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 }); }
}

/** Payment is NOT activated. Order prices are resolved on the server. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  // Order pricing and inventory must be resolved from the SAME database as admin edits.
  // Never accept the static showcase catalogue as an order authority.
  let inventory: Product[];
  try {
    const rows = await listProducts(requirePostgres());
    inventory = rows.map(row => ({
      id: row.id, name: row.name, category: row.type as ProductCategory,
      size: row.size, note: row.note,
      prices: { TRY: row.priceKurus / 100 }, stock: row.stock,
    }));
  } catch (error) {
    console.error("orders POST catalogue unavailable", error);
    return NextResponse.json({ error: "Ürün kataloğu kullanılamıyor" }, { status: 503 });
  }
  const validation = validateOrder(body, inventory);
  if (!validation.ok) return NextResponse.json({ error: "Sipariş bilgileri doğrulanamadı", errors: validation.errors }, { status: 422 });
  const { order } = validation;
  const id = orderIdFor(request.headers.get("idempotency-key"));
  try {
    const totalKurus = await createPendingOrder(requirePostgres(), {
      id, customerName: order.customerName, email: order.email, phone: order.phone,
      address: order.address, itemsJson: JSON.stringify(order.items), totalKurus: order.totalKurus,
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true, id, totalKurus, currency: "TRY", paymentStatus: "credentials_required",
      message: "Sipariş kaydedildi. Ödeme altyapısı henüz etkin değil." });
  } catch (error) { if (error instanceof OrderIdempotencyConflictError) return NextResponse.json({ error: "Idempotency key farklı sipariş için kullanılmış" }, { status: 409 }); console.error("orders POST database unavailable", error); return NextResponse.json({ error: "Sipariş kaydedilemedi" }, { status: 503 }); }
}
