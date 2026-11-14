import { requirePostgres } from "../../../db/postgres/driver";
import { listOrders } from "../../../db/postgres/repository";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { OrderManager, type ManagedOrder } from "../OrderManager";
import { AdminUnavailable } from "../AdminPanels";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/siparisler");
  if (access.status !== "admin")
    return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let rows: ManagedOrder[] | null = null;
  try { rows = await listOrders(requirePostgres()) as ManagedOrder[]; } catch { rows = null; }
  return (
    <AdminShell kicker="SİPARİŞ YÖNETİMİ" title="Sipariş kayıtları">
      <div className="admin-notice" role="note"><b>Ödeme altyapısı etkin değil.</b> Buradaki kayıtlar ödenmemiş sipariş talepleridir; kargo ve fatura işlemleri henüz bağlı değildir.</div>
      {rows ? <OrderManager initialOrders={rows} /> : <AdminUnavailable what="Sipariş kayıtları" />}
    </AdminShell>
  );
}
