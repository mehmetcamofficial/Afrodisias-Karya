import { NextResponse } from "next/server";
import { requireD1 } from "../../../db";
import { orderIdFor, validateOrder } from "../../../lib/orders";
import { adminApiGuard } from "../../admin-auth";

const ORDER_STATUSES = ["payment_pending", "preparing", "shipped", "completed", "cancelled"] as const;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const rows = await requireD1().prepare("SELECT id,customer_name AS customerName,email,total_kurus AS totalKurus,status,payment_provider AS provider,created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100").all();
  return NextResponse.json(rows.results);
}

export async function PATCH(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const body = (await readJson(request)) as { id?: unknown; status?: unknown } | undefined;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  if (!id || !(ORDER_STATUSES as readonly string[]).includes(status)) return NextResponse.json({ error: "Geçersiz sipariş durumu" }, { status: 400 });
  const result = await requireD1().prepare("UPDATE orders SET status=? WHERE id=?").bind(status, id).run();
  if (!result.meta.changes) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true, id, status });
}

/**
 * Creates a pending order. Prices, names and totals are resolved server-side
 * from the catalogue; client-supplied prices are ignored. No payment is taken
 * here: iyzico is not activated, so the order stays `payment_pending`.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });

  const validation = validateOrder(body);
  if (!validation.ok) {
    return NextResponse.json({ error: "Sipariş bilgileri doğrulanamadı", errors: validation.errors }, { status: 422 });
  }

  const { order } = validation;
  const id = orderIdFor(request.headers.get("idempotency-key"));
  const db = requireD1();
  // ON CONFLICT DO NOTHING makes retries with the same idempotency key safe.
  await db.prepare("INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,status,payment_provider,created_at) VALUES(?,?,?,?,?,?,?,'payment_pending','iyzico',?) ON CONFLICT(id) DO NOTHING")
    .bind(id, order.customerName, order.email, order.phone, order.address, JSON.stringify(order.items), order.totalKurus, Date.now())
    .run();
  const stored = await db.prepare("SELECT total_kurus AS totalKurus FROM orders WHERE id=?").bind(id).first<{ totalKurus: number }>();

  return NextResponse.json({
    ok: true,
    id,
    totalKurus: stored?.totalKurus ?? order.totalKurus,
    currency: "TRY",
    paymentStatus: "credentials_required",
    message: "Sipariş kaydedildi. iyzico anahtarları eklendiğinde ödeme yönlendirmesi burada başlayacak.",
  });
}
