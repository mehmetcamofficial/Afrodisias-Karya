import { NextResponse } from "next/server";
import { requirePostgres } from "../../../db/postgres/driver";
import { listProducts, upsertProduct } from "../../../db/postgres/repository";
import { adminApiGuard } from "../../admin-auth";
import { isProductionShowcase } from "../../../lib/showcase-mode";

export const runtime = "nodejs";
export async function GET() {
  // No public saleable inventory in the initial Production showcase.
  if (isProductionShowcase()) return NextResponse.json([]);
  try {
    const rows = await listProducts(requirePostgres());
    return NextResponse.json(rows);
  } catch (error) {
    console.error("products GET database unavailable", error);
    return NextResponse.json({ error: "Ürün kataloğu kullanılamıyor" }, { status: 503 });
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
    // Creates a new inactive draft only; existing products are edited through the CMS (versioned + audited).
    const created = await upsertProduct(requirePostgres(), {
      id, name, type: str(body.type, 60), size: str(body.size, 60),
      note: str(body.note, 400), priceKurus, stock: 0, active: false,
    }, Date.now());
    if (!created) return NextResponse.json({ error: "Bu kimlikle bir ürün zaten var; düzenleme için ürün yönetimini kullanın" }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch (error) { console.error("products POST database unavailable", error); return NextResponse.json({ error: "Ürün kaydedilemedi" }, { status: 503 }); }
}
