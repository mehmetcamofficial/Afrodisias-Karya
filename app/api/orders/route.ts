import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  if (!(await getChatGPTUser())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const rows = await env.DB.prepare("SELECT id,customer_name AS customerName,email,total_kurus AS totalKurus,status,payment_provider AS provider,created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100").all();
  return NextResponse.json(rows.results);
}

export async function PATCH(request: Request) {
  if (!(await getChatGPTUser())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const body = await request.json() as { id?: string; status?: string };
  const allowed = ["payment_pending", "preparing", "shipped", "completed", "cancelled"];
  if (!body.id || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "Geçersiz sipariş durumu" }, { status: 400 });
  const result = await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(body.status, body.id).run();
  if (!result.meta.changes) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true, id: body.id, status: body.status });
}

export async function POST(request: Request) {
  const body = await request.json() as { customerName?:string,email?:string,phone?:string,address?:string,items?:Array<{id:string;name:string;qty:number;priceKurus:number}> };
  if (!body.customerName || !body.email || !body.phone || !body.address || !body.items?.length) return NextResponse.json({ error:"Teslimat bilgileri eksik" },{status:400});
  const total = body.items.reduce((sum,item)=>sum + item.priceKurus*item.qty,0);
  const id = `AD-${Date.now().toString(36).toUpperCase()}`;
  await env.DB.prepare("INSERT INTO orders(id,customer_name,email,phone,address,items_json,total_kurus,status,payment_provider,created_at) VALUES(?,?,?,?,?,?,?,'payment_pending','iyzico',?)").bind(id,body.customerName,body.email,body.phone,body.address,JSON.stringify(body.items),total,Date.now()).run();
  return NextResponse.json({ ok:true,id,totalKurus:total,paymentStatus:"credentials_required",message:"Sipariş kaydedildi. iyzico anahtarları eklendiğinde ödeme yönlendirmesi burada başlayacak." });
}
