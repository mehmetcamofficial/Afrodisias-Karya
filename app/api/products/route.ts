import { NextResponse } from "next/server";
import { requireD1 } from "../../../db";
import { products as catalogue } from "../../../lib/products";
import { adminApiGuard } from "../../admin-auth";

function catalogueRows() {
  return catalogue.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.category,
    size: product.size,
    note: product.note,
    priceKurus: (product.prices.TRY ?? 0) * 100,
    stock: product.stock,
    active: true,
  }));
}

export async function GET() {
  try {
    const rows = await requireD1().prepare("SELECT id,name,type,size,note,price_kurus AS priceKurus,stock,active FROM products WHERE active=1 ORDER BY name").all();
    if (rows.results.length) return NextResponse.json(rows.results);
  } catch (error) {
    // Database unavailable or not migrated: the static catalogue is the storefront's source of truth.
    console.error("products: falling back to static catalogue", error);
  }
  return NextResponse.json(catalogueRows());
}

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const int = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? value : Number.NaN);

export async function POST(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }
  const id = str(body.id, 64) || crypto.randomUUID();
  const name = str(body.name, 160);
  const priceKurus = int(body.priceKurus);
  const stock = body.stock === undefined || body.stock === "" ? 0 : int(body.stock);
  if (!name) return NextResponse.json({ error: "Ürün adı zorunlu" }, { status: 400 });
  if (!(priceKurus > 0)) return NextResponse.json({ error: "Fiyat pozitif tam sayı (kuruş) olmalı" }, { status: 400 });
  if (!(stock >= 0)) return NextResponse.json({ error: "Stok negatif olamaz" }, { status: 400 });

  await requireD1().prepare("INSERT INTO products(id,name,type,size,note,price_kurus,stock,active,updated_at) VALUES(?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,size=excluded.size,note=excluded.note,price_kurus=excluded.price_kurus,stock=excluded.stock,updated_at=excluded.updated_at")
    .bind(id, name, str(body.type, 60), str(body.size, 60), str(body.note, 400), priceKurus, stock, Date.now())
    .run();
  return NextResponse.json({ ok: true, id });
}
