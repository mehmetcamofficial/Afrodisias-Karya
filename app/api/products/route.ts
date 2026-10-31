import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { products as catalogue } from "../../../lib/products";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const rows = await env.DB.prepare("SELECT id,name,type,size,note,price_kurus AS priceKurus,stock,active FROM products WHERE active=1 ORDER BY name").all();
  if (rows.results.length) return NextResponse.json(rows.results);
  return NextResponse.json(catalogue.map((product)=>({
    id: product.id,
    name: product.name,
    type: product.category,
    size: product.size,
    note: product.note,
    priceKurus: (product.prices.TRY ?? 0) * 100,
    stock: product.stock,
    active: true,
  })));
}

export async function POST(request: Request) {
  if (!(await getChatGPTUser())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const id = String(body.id || crypto.randomUUID());
  const values = [id,String(body.name||""),String(body.type||""),String(body.size||""),String(body.note||""),Number(body.priceKurus||0),Number(body.stock||0),Date.now()];
  if (!values[1] || values[5] <= 0) return NextResponse.json({ error: "Ürün adı ve fiyat zorunlu" }, { status: 400 });
  await env.DB.prepare("INSERT INTO products(id,name,type,size,note,price_kurus,stock,active,updated_at) VALUES(?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,size=excluded.size,note=excluded.note,price_kurus=excluded.price_kurus,stock=excluded.stock,updated_at=excluded.updated_at").bind(...values).run();
  return NextResponse.json({ ok: true, id });
}
