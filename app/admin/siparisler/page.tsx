import { env } from "cloudflare:workers";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminShell } from "../../components/admin-shell";
import { OrderManager, type ManagedOrder } from "../OrderManager";
export const dynamic="force-dynamic";
export default async function Page(){await requireChatGPTUser("/admin/siparisler");const rows=await env.DB.prepare("SELECT id,customer_name AS customerName,email,total_kurus AS totalKurus,status,payment_provider AS provider,created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100").all();return <AdminShell kicker="SİPARİŞ YÖNETİMİ" title="Ödeme, kargo ve fatura"><OrderManager initialOrders={rows.results as ManagedOrder[]}/></AdminShell>}
