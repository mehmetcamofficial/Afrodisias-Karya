import { requireD1 } from "../../../db";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { OrderManager, type ManagedOrder } from "../OrderManager";
export const dynamic="force-dynamic";
export default async function Page(){const access=await requireAdminPage("/admin/siparisler");if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;const rows=await requireD1().prepare("SELECT id,customer_name AS customerName,email,total_kurus AS totalKurus,status,payment_provider AS provider,created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100").all();return <AdminShell kicker="SİPARİŞ YÖNETİMİ" title="Ödeme, kargo ve fatura"><OrderManager initialOrders={rows.results as ManagedOrder[]}/></AdminShell>}
