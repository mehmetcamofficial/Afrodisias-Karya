import { env } from "cloudflare:workers";
import { requireChatGPTUser } from "../chatgpt-auth";
import AdminClient from "./AdminClient";
import type { AdminOrder, AdminProduct } from "./AdminClient";
import { AdminShell } from "../components/admin-shell";
import { products as catalogue } from "../../lib/products";
export const dynamic="force-dynamic";
export default async function Admin(){
 await requireChatGPTUser('/admin');
 const [productRows,orderRows]=await Promise.all([
  env.DB.prepare("SELECT id,name,type,size,note,price_kurus AS priceKurus,stock FROM products WHERE active=1 ORDER BY name").all(),
  env.DB.prepare("SELECT id,customer_name AS customerName,email,total_kurus AS totalKurus,status,created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100").all(),
 ]);
 const initialProducts=productRows.results.length?productRows.results:catalogue.map(product=>({id:product.id,name:product.name,type:product.category,size:product.size,note:product.note,priceKurus:(product.prices.TRY??0)*100,stock:product.stock}));
 return <AdminShell kicker="ALTIN DAL · YÖNETİM" title="Mağaza Yönetimi"><AdminClient initialProducts={initialProducts as AdminProduct[]} initialOrders={orderRows.results as AdminOrder[]}/></AdminShell>
}
