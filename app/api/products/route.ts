import { NextResponse } from "next/server";
import { requirePostgres } from "../../../db/postgres/driver";
import { listProducts, upsertProduct } from "../../../db/postgres/repository";
import { products as catalogue } from "../../../lib/products";
import { adminApiGuard } from "../../admin-auth";

export const runtime = "nodejs";
function catalogueRows() {
  return catalogue.map(product => ({ id: product.id, name: product.name, type: product.category,
    size: product.size, note: product.note, priceKurus: (product.prices.TRY ?? 0) * 100,
    stock: product.stock, active: true }));
}
export async function GET() {
  try {
    const rows = await listProducts(requirePostgres());
    return NextResponse.json(rows.length ? rows : catalogueRows());
  } catch (error) {
    console.error("products GET database unavailable", error);
    // A static catalogue may be displayed, but writes/orders never silently fall back.
    return NextResponse.json(catalogueRows());
  }
}
const str = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const int = (value: unknown) => typeof value === "number" && Number.isInteger(value) ? value : Number.NaN;

export async function POST(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 }); }
  const id = str(body.id, 64) || crypto.randomUUID();
  const name = str(body.name, 160);
  const priceKurus = int(body.priceKurus);
  const stock = body.stock === undefined || body.stock === "" ? 0 : int(body.stock);
  if (!name || !(priceKurus > 0) || !(stock >= 0))
    return NextResponse.json({ error: "Ürün adı, fiyat veya stok geçersiz" }, { status: 400 });
  try {
    await upsertProduct(requirePostgres(), {
      id, name, type: str(body.type, 60), size: str(body.size, 60),
      note: str(body.note, 400), priceKurus, stock, active: true,
    }, Date.now());
    return NextResponse.json({ ok: true, id });
  } catch (error) { console.error("products POST database unavailable", error); return NextResponse.json({ error: "Ürün kaydedilemedi" }, { status: 503 }); }
}
